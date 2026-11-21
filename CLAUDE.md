# VED

AI phone agent for the MMMUT admissions and counselling helpline. Callers dial a number, VED answers from the knowledge base, and calls it cannot take are forwarded to staff.

Read `docs/ARCHITECTURE.md` before changing call handling, telephony or data storage, and `docs/PLIVO_SETUP.md` for the Plivo account steps. Plivo skills are available (`plivo-audio-streaming`, `plivo-voice-xml`, `plivo-cli`); follow them for anything that touches the Plivo account.

## Layout

- `backend/` Node 20, Express 5, `ws`, Prisma (Postgres). Entry: `server.js`.
  - `telephony/plivo/` Plivo webhooks, stream adapter, forwarding chain, signature checks
  - `pipeline/` provider-agnostic conversation (turn-taking, STT, LLM, TTS) and audio helpers
  - `services/` settings and forwarding (Postgres), call records, speech (Groq STT, Google TTS), LLM (Groq), DB access (`mongodb.js` is Prisma, legacy name)
  - `routes/` auth, settings/forwarding/telephony (`settings.js`), legacy admin and entities
  - `exotel/`, `twilio/` legacy pipelines, to be removed once Plivo is live
  - `state/calls.js` in-memory live call sessions
- `frontend/` Next.js 16 App Router, React 19, Tailwind 4. The dashboard is a single client app.
  - `app/page.tsx` auth gate, `app/login/page.tsx` sign-in, `app/api/plivo-fallback` Plivo fallback XML
  - `components/Dashboard.tsx` shell and navigation
  - `components/pages/` one file per dashboard page
  - `components/ui.tsx` shared primitives; `lib/api.ts` backend URL and authenticated fetch

## Commands

```bash
cd backend && npm install && npm run dev      # port 3001, needs ffmpeg, DATABASE_URL and JWT_SECRET
cd backend && npx prisma db push               # after schema changes (npm start does this on deploy)
cd frontend && npm install && npm run dev     # port 3005, set NEXT_PUBLIC_BACKEND_URL
cd frontend && npx tsc --noEmit && npm run lint
```

There are no automated tests yet.

## Conventions

- Dashboard UI: neutral palette with one accent (blue-600), Inter, 1px borders, no gradients, glows, glass effects or decorative animation. Text no smaller than 12px. Use the primitives in `components/ui.tsx`.
- What the agent says is configured in the dashboard (settings table), not in code. Keep `services/llm.js` to knowledge, format and speech-technical rules.
- Never show invented data. Empty and error states say what is missing and what to do.
- Every dashboard API call goes through `lib/api.ts` so the JWT is attached.
- Keep copy short and literal. No marketing language in the product.
- Secrets live in environment variables only; `.env*` files are gitignored.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. When the answer is under a Markdown heading, `graphify section "<heading>"` prints that section's text, so the .md need not be opened. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
