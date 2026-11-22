# VED architecture

VED is an AI phone agent for the MMMUT admissions and counselling helpline. A caller dials a phone number, VED answers, listens, and replies by voice using only what is in the knowledge base. When VED cannot take the call, the call is forwarded to a person.

This document has two parts: what exists in the repo today, and the system we are moving to.

---

## 1. What exists today

### Call path

```
Caller ──PSTN──> Exotel number ──webhook──> backend /exotel/voice
                                              │ returns ExoML <Stream>
Caller audio <──WebSocket (mu-law 8 kHz)──> backend /exotel/stream
                                              │
          ┌───────────────────────────────────┤
          │ 1. buffer audio until silence      │
          │ 2. ffmpeg: mu-law 8k → PCM 16k WAV │
          │ 3. Groq Whisper → text             │
          │ 4. Groq LLM + knowledge → reply    │
          │ 5. Google Translate TTS → audio    │
          │ 6. stream audio back to caller     │
          └────────────────────────────────────┘
On hang-up: LLM summary → Postgres (calls, analytics)
Live events → dashboard over WebSocket /live
```

Twilio has an almost identical pipeline in `backend/twilio/`. `TELEPHONY_PROVIDER` only decides which one places outbound calls; inbound depends on which provider's number was dialled.

### Components

| Part | Where | Notes |
|---|---|---|
| HTTP + WebSocket server | `backend/server.js` | Express 5 and `ws`. Most routes are defined inline here. |
| Telephony | `backend/exotel/`, `backend/twilio/` | `stream.js` in each is about 350 lines and mostly duplicated. |
| Speech | `backend/services/speech.js` | STT: Groq `whisper-large-v3-turbo`. TTS: `google-tts-api` (unofficial Google Translate endpoint). |
| LLM | `backend/services/llm.js` | Groq. Reply is JSON: spoken text, intent, sentiment, language. |
| Knowledge base | `server.js` `/knowledge*`, `services/mongodb.js` | Upload PDF, CSV, JSON, TXT or Markdown; text is extracted and stored whole in Postgres. No chunking or embeddings: documents are passed to the LLM as context. |
| Database | `backend/prisma/schema.prisma` | Postgres: `users`, `entities`, `calls`, `analytics`, `knowledge`, `leads`. `services/mongodb.js` is Prisma despite its name. |
| In-memory state | `backend/state/` | Live call sessions, the number pool and the system prompt. Lost on every restart. |
| Dashboard | `frontend/` | Next.js 16, React 19, Tailwind 4. Deployed to Vercel. |
| Hosting | `render.yaml`, `backend/Dockerfile` | Backend on Render (Docker, free plan, sleeps when idle). |

### Known problems

Fixed since this document was first written: dashboard routes and the live socket require sign-in, `JWT_SECRET` is mandatory, the system prompt and forwarding list live in Postgres, busy-line forwarding exists (on Plivo), hang-up works for Plivo calls, and ElevenLabs is wired in as the voice.

Still open:

1. The Exotel and Twilio pipelines (`backend/exotel/`, `backend/twilio/`) are still present; remove them once Plivo is live.
2. Leftovers from the multi-tenant product remain: `entities`, `leads`, `/admin/*`, `/entities`.
3. The backend is hosted in Oregon. Indian calls need the agent's server in India (see `docs/PLIVO_SETUP.md`, step 0).
4. No automated tests or CI.

---

## 2. Target system

### Goals

- One inbound helpline number on **Plivo** (Indian local number, rented after business KYC).
- VED answers every call it can, grounded strictly in the knowledge base.
- **If VED is busy or unavailable, the call is forwarded** to staff numbers in a set order.
- Staff manage the knowledge base, the agent's instructions, the forwarding list and call history from the dashboard.
- Everything that matters survives a restart.

### Why Plivo

Twilio cannot rent Indian local numbers and can only call India from foreign caller IDs. Plivo rents Indian numbers (₹200/month, ₹0.38/min in or out, audio streaming included at the time of writing) and its bidirectional `<Stream>` is close to Twilio's, so the existing pipeline ports with small changes. Renting needs KYC as an India-registered organisation (GST, Certificate of Incorporation or Udyam) on an India-region, INR-billed account.

### Call flow

```
Caller dials Plivo number
        │
        ▼
POST /plivo/answer ──────────────────────────────┐
  │ active AI calls < MAX_CONCURRENT_CALLS        │ at capacity, or agent disabled
  │ and agent enabled?                            │
  ▼                                               ▼
<Stream bidirectional keepCallAlive>       <Dial timeout=20 action=/plivo/dial-status>
  wss://…/plivo/stream                        forwarding number 1
  │                                         </Dial>
  ▼                                         … next number on busy / no-answer / failed …
 AI conversation                            <Speak> "All our counsellors are busy…" </Speak>
  │                                         (optional: <Record> a voicemail)
  ├── caller asks for a person, or the
  │   agent cannot answer twice in a row
  │        │
  │        ▼
  │   Plivo Transfer API → /plivo/forward → same <Dial> chain
  │
  ▼
hang-up → summary → Postgres → dashboard
```

"Busy" covers three cases:

1. **VED at capacity.** `/plivo/answer` counts active sessions and forwards instead of streaming.
2. **Backend down.** The Plivo application's fallback answer URL points at a static XML endpoint hosted separately from the backend (for example a route on the Vercel frontend) that only dials the forwarding list. If Render is asleep or crashed, callers still reach a person.
3. **A forwarding number is busy or unanswered.** Each `<Dial>` has an `action` URL. Plivo reports `DialStatus` (`busy`, `no-answer`, `failed`, `timeout`) and the next number is tried.

Mid-call handover (case "caller asks for a person") uses the same forwarding list.

### Knowledge base

Keep the current upload and extraction. Two later improvements, in order:

1. Split documents into chunks and store them with the source document.
2. Retrieve only the relevant chunks per question (Postgres full-text search first; embeddings only if that is not good enough), instead of passing whole documents to the LLM.

The rule stays: if the answer is not in the knowledge base, VED says so and offers to forward the call.

### Data model changes

| Table | Purpose |
|---|---|
| `settings` | Single row: system prompt, agent enabled, max concurrent calls, forwarding timeout, closing message. Replaces `state/ved.js`. |
| `forwarding_numbers` | `number`, `label`, `position`, `active`. Replaces the in-memory pool. |
| `calls` | Add `provider_call_id`, `started_at`, `ended_at`, `duration_s`, `outcome` (`answered_by_ai`, `forwarded`, `missed`), `forwarded_to`, `transcript` (JSON). |
| `knowledge` | Keep. Later: `knowledge_chunks`. |
| `entities`, `leads` | Remove with the multi-tenant leftovers. |

### Backend layout after the change

```
backend/
  server.js              wiring only
  routes/                auth, knowledge, calls, settings, forwarding
  telephony/plivo/       answer, stream, dial-status, forward, transfer
  pipeline/              audio conversion, STT, LLM, TTS, turn-taking
  services/              db, knowledge, calls, summaries
```

The Exotel and Twilio folders are removed once Plivo is live.

### Security

- Every dashboard API and the `/live` WebSocket require a JWT. Login is checked by the backend only.
- Plivo webhooks are verified with Plivo's request signature (`X-Plivo-Signature-V3`).
- CORS restricted to the dashboard origin.
- The backend refuses to start without `JWT_SECRET`.

### Environment variables (target)

```
DATABASE_URL
JWT_SECRET
PUBLIC_BASE_URL          https URL of the backend, used in Plivo XML
DASHBOARD_ORIGIN         for CORS
PLIVO_AUTH_ID
PLIVO_AUTH_TOKEN
PLIVO_NUMBER             E.164, e.g. +91…
GROQ_API_KEY
SARVAM_API_KEY           if TTS moves to Sarvam
```

---

## 3. Open decisions

1. **Who forwarding goes to.** Admissions office landline, counsellors' mobiles, or both? In what order and hours?
2. **Capacity.** How many simultaneous AI calls to allow before forwarding (cost and Groq rate limits decide this).
3. **TTS.** Sarvam (Indian voices, key already provisioned) or ElevenLabs.
4. **KYC holder.** Which registered entity rents the Plivo number.
5. **Voicemail.** Whether to record a message when nobody on the forwarding list answers.

## 4. Order of work

1. ~~Lock down the API (auth on every route, no client-side login).~~ Done.
2. ~~Move settings, forwarding list and call records into Postgres.~~ Done (`settings`, `forwarding_numbers`, new `calls` columns).
3. ~~Add `telephony/plivo` with answer, stream and dial-status.~~ Built and tested with simulated Plivo requests. Account steps: `docs/PLIVO_SETUP.md`.
4. ~~Busy-line forwarding (capacity check, sequential dial, static fallback XML).~~ Done.
5. ~~Replace Google Translate TTS.~~ ElevenLabs wired in; Google remains the fallback when no key is set.
6. Move the backend to a host in India, rent the number, make the first real call.
7. Remove Exotel, Twilio and the multi-tenant leftovers.
8. Knowledge chunking and retrieval.

## 5. As built

```
backend/
  telephony/plivo/
    webhooks.js     /plivo/answer, after-stream, forward, dial-status, hangup, stream-status
    routing.js      capacity check and the forwarding chain
    stream.js       WebSocket adapter; paces audio out at real time
    signature.js    X-Plivo-Signature-V3 checks for webhooks and the stream upgrade
    xml.js          Stream, Dial, Speak documents
  pipeline/
    conversation.js turn-taking (VAD, barge-in), STT -> LLM -> TTS, handover
    tts.js          ElevenLabs streaming mu-law 8 kHz, Google fallback
    audio.js        mu-law decode, WAV wrapping, level meter
  services/
    settings.js     agent and routing settings (cached in memory, stored in Postgres)
    forwarding.js   staff numbers and their order
    callRecords.js  saves each finished call once
  routes/settings.js  /api/settings, /api/forwarding, /api/telephony/status, /api/test-call
frontend/app/api/plivo-fallback/route.ts   fallback answer URL, hosted on Vercel
```

Turn-taking: caller audio arrives in 20 ms mu-law frames. 60 ms above the speech level starts an utterance, 700 ms of quiet ends it, and anything under about 240 ms is ignored. While the agent speaks, about 240 ms of caller speech interrupts it (`clearAudio`). A newer utterance discards a reply still being prepared.

Speech: Hindi replies are written in Devanagari (the voice mispronounces Hindi in Roman letters), English terms as callers say them (बी.टेक, हॉस्टल). `pipeline/speechText.js` turns numbers into Hindi words with Indian grouping (1,24,000 becomes एक लाख चौबीस हज़ार) and reads long digit strings one digit at a time. Fixed lines Plivo plays (hold, busy) are ElevenLabs MP3s served from `/plivo/audio/`, so callers only ever hear the agent's voice. Calls are recorded with `<Record recordSession>`; the greeting says so.

Prompt: the agent's persona, language, tone and handover rules come only from the dashboard (Agent > Instructions, `settings.system_prompt`). `services/llm.js` adds the knowledge base, caller history and the output format, then appends the dashboard instructions last, marked as overriding everything above. The greeting, hold message and closing message are also dashboard settings; only the recording notice and the error line are fixed in code.

Dashboard-controlled agent: persona and instructions (Agent page) are appended to the LLM prompt last; voice type, tone (calm, friendly, expressive, mapped to ElevenLabs stability and style) and speed (0.7 to 1.2) are settings too, with a preview before saving. Changing the voice regenerates the cached greeting and messages.

Forwarding numbers must be verified: `services/verification.js` stores a hash of a 6-digit code (10-minute expiry, 5 attempts, 3 sends per 10 minutes) and Plivo calls the number to read the code out (`/plivo/otp/<token>`). Only active, verified numbers ring.

Database (Supabase): `services/dbUrl.js` accepts either Supabase pooler. Session mode (5432) is used as is; for transaction mode (6543) it adds `pgbouncer=true` and a connection limit for queries and derives a session-mode `DIRECT_URL` for `prisma db push`. `sslmode=require` is added for Supabase hosts. Because Supabase exposes the `public` schema through its Data API, every start runs `prisma/sql/lockdown.sql`: RLS on for all public tables and `anon`/`authenticated` privileges revoked. The backend connects as the table owner, so it is unaffected.

Wake-up: the dashboard shows a loader until `GET /health` answers, because the free Render instance sleeps and takes up to a minute to start. If the backend answered in the last 10 minutes (sessionStorage), the dashboard connects straight away, and the loader only appears when the first check takes longer than 700 ms. `npm start` first checks `GET /health` on its own port: if a backend is already running there it uses that one and exits, instead of starting a second copy.

Handover: the LLM returns `transfer_to_human: true` when the caller asks for a person or two questions went unanswered; the agent finishes its sentence, then the call is transferred. Pressing 0 does the same. If no verified number is active, or nobody on the list picks up, the caller hears the follow-up message (the question is passed to a counsellor), then the closing greeting, and the call ends. The call is saved as `follow_up_needed` with the caller's question in `calls.follow_up_question`, shown in the call log.

Ending calls: the LLM returns `end_call: true` when the caller's question is answered, or when they keep to unrelated, abusive or prank talk after one redirect (rules in the dashboard prompt). The agent finishes its line, plays the closing greeting (Agent > Closing greeting), then hangs up through the Plivo API.

Rate limit: at `/plivo/answer`, a caller who has already made `max_calls_per_hour` calls in the last hour (saved calls plus live ones; 0 turns the limit off) hears the rate-limit message and the call ends before the agent picks up. Set on the Forwarding page.
