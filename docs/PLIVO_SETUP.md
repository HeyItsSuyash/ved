# Plivo setup

How to put VED on a Plivo number. The backend side is built (`backend/telephony/plivo/`); these are the account steps. Commands use the Plivo CLI (`curl -fsSL https://cli.plivo.com/install | bash`, then `plivo login`). Every write is shown first with `--dry-run`; run it again with `--yes` once the preview looks right.

## 0. Before anything: where the backend runs

India requires **media anchoring**: both call legs and the voice agent's server stay in India, or calls fail with hangup code 2070. The backend is currently on Render in Oregon (`render.yaml`), and Render has no India region. Move the backend to a Mumbai host before the first real call, for example AWS `ap-south-1`, Google Cloud `asia-south1`, Azure Central India, or Fly.io `bom`. The Docker image in `backend/Dockerfile` runs anywhere; it needs `ffmpeg`, which the image installs.

## 1. Account, credit and KYC

```bash
plivo auth whoami -o json            # the right organisation, India data region, cash_credits > 0
plivo numbers compliance list --country IN --number-type local --status accepted -o json
```

- Indian numbers need an India data-region organisation and **accepted** KYC as an India-registered business (GST certificate, Certificate of Incorporation or Udyam). `submitted` is not enough. File it in the console (Phone Numbers > KYC) or with `plivo numbers compliance requirements --country IN --number-type local --user-type business -o json`.
- Add credit on the console home page (India: at least ₹2,000 by card).

## 2. Rent the number

Use a landline series (080, 022 and similar): that is the series for service calls such as a helpline.

```bash
plivo numbers search --country IN --type local --limit 10 -o json
plivo numbers buy <number> --dry-run
plivo numbers buy <number> --yes
plivo numbers get <number> -o json   # voice_enabled: true
```

## 3. Backend environment

Set these on the backend host (see `backend/.env.example`):

| Variable | Value |
|---|---|
| `PUBLIC_BASE_URL` | `https://<backend host>`, exactly as Plivo will call it. Signature checks use it. |
| `PLIVO_AUTH_ID`, `PLIVO_AUTH_TOKEN` | Console > Account. The token also verifies webhook signatures. |
| `PLIVO_NUMBER` | The rented number in E.164, e.g. `+918045671234`. Used as caller ID when forwarding. |
| `TELEPHONY_PROVIDER` | `plivo` |
| `ELEVENLABS_API_KEY` | The agent's voice (Ayush, male, by default; `ELEVENLABS_VOICE_ID` overrides it). Hold and busy messages are played in the same voice. Without a key, the free Google voice and Plivo's built-in voices are used. |
| `GROQ_API_KEY` | Speech to text and the LLM. |
| `DATABASE_URL` | Required. Postgres connection string; on Render, create a PostgreSQL database in the same region and use its Internal Database URL. |
| `JWT_SECRET` | Required; the backend refuses to start without it. |
| `DASHBOARD_ORIGIN` | The dashboard URL, to restrict CORS. |

On the dashboard host (Vercel), for the fallback route:

| Variable | Value |
|---|---|
| `PLIVO_NUMBER` | Same as above. |
| `PLIVO_FALLBACK_NUMBERS` | Staff numbers to ring if the backend is down, comma-separated E.164. |
| `PLIVO_FALLBACK_KEY` | A long random string; it goes in the fallback URL below. |

Check the backend before pointing Plivo at it:

```bash
curl -s -X POST https://<backend host>/plivo/answer -d 'CallUUID=check&From=%2B910000000000'
# With PLIVO_AUTH_TOKEN set this returns 403 (unsigned), which is correct.
plivo voice streams simulate --answer-url https://<backend host>/plivo/answer --answer-method POST -o json
```

## 4. Create the application

```bash
plivo account applications create --app-name audio-stream-custom-1 \
  --answer-url https://<backend host>/plivo/answer --answer-method POST --dry-run
# then without --dry-run; note the app_id

plivo account applications update <app_id> \
  --hangup-url https://<backend host>/plivo/hangup --dry-run

plivo api POST /Application/<app_id>/ \
  --body '{"fallback_answer_url":"https://<dashboard host>/api/plivo-fallback?key=<PLIVO_FALLBACK_KEY>","fallback_method":"POST"}' --dry-run
```

| URL | What it does |
|---|---|
| `/plivo/answer` | Agent free: returns `<Stream>` to the agent. Agent busy or off: starts forwarding. |
| `/plivo/hangup` | Saves the call (summary, outcome, duration). |
| `/plivo/recording` | Every call is recorded (the greeting says so); Plivo posts the recording link here and it appears in the call log. |
| fallback (Vercel) | Backend unreachable: rings all fallback numbers at once. |

The backend also serves `/plivo/stream/<CallUUID>` (WebSocket), `/plivo/dial-status/<CallUUID>`, `/plivo/forward/<CallUUID>`, `/plivo/after-stream/<CallUUID>` and `/plivo/stream-status`. Plivo reaches these from the XML; they need no console setup.

## 5. Link the number and test

```bash
plivo numbers get <number> -o json                       # record the current application for rollback
plivo numbers update <number> --app-id <app_id> --dry-run # then without --dry-run
plivo voice streams readiness <number> -o json            # fix every "fail" first
```

Then call the number from an Indian phone, or use **Agent > Test call** in the dashboard. A call worked only when the caller heard the agent, the dashboard shows the transcript, and `plivo voice calls get <call_uuid> -o json` shows a normal hangup after a real conversation. If not: `plivo voice calls diagnose <call_uuid>`.

Test the forwarding paths before going live:

1. Add staff numbers under **Forwarding** and verify each: **Call with code** makes Plivo call the phone and read out a 6-digit code; type it in. Unverified numbers never ring. (Plivo's own Verify API is not enabled on this account, so the backend places this call itself.)
2. Set **Calls at once** to 0 and call: the first staff number rings; reject it and the second rings.
3. Set it back, call, and say "I want to talk to a person" (or press 0): the agent hands over.
4. Let every staff number go unanswered: a handed-over caller returns to the agent; a caller forwarded for capacity hears the closing message.

## How a call flows

```
Caller ─> Plivo number ─> POST /plivo/answer
           agent free ──> <Stream> wss://…/plivo/stream/<uuid>  (+ <Redirect> /plivo/after-stream if the socket drops)
           agent busy ──> <Dial> staff #1 ─ busy/no answer ─> /plivo/dial-status ─> staff #2 ─> … ─> closing message
           mid-call handover (caller asks, or presses 0) ─> Transfer API ─> /plivo/forward ─> same <Dial> chain
                                                              nobody answers ─> back to the agent
           backend down ─> fallback URL on Vercel ─> rings all fallback numbers at once
```
