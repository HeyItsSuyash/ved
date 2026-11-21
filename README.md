# VED

AI voice agent for the MMMUT admissions helpline. It answers calls, replies from an uploaded knowledge base, and forwards calls to staff when it cannot take them.

- `backend/` call handling, speech and LLM pipeline, REST and WebSocket API
- `frontend/` staff dashboard: live calls, call log, knowledge base, insights, agent settings, forwarding numbers
- `docs/ARCHITECTURE.md` current system, target design and roadmap

## Run locally

Requirements: Node 20, ffmpeg, a Postgres database.

```bash
cd backend
cp .env.example .env        # fill in values
npm install
npx prisma db push
npm run create-admin -- admin@example.com 'a-strong-password'   # or set ADMIN_EMAIL and ADMIN_PASSWORD
npm run dev
```

```bash
cd frontend
npm install
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001 npm run dev
```

Open http://localhost:3005 and sign in with the admin account.
