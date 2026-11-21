# Graph Report - ved  (2026-11-21)

## Corpus Check
- 70 files · ~30,915 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 4, .example 2, .prisma 1)

## Summary
- 551 nodes · 1355 edges · 23 communities (18 shown, 5 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 87 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `55b90d8c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KnowledgePage.tsx
- server.js
- exotel/stream.js
- backend/package.json
- routes/auth.js
- frontend/package.json
- start.js
- compilerOptions
- 2. Target system
- services
- EntityService
- VED
- vercel.json
- VED
- postcss.config.mjs
- routes/settings.js
- mongodb.js
- LeadService
- Plivo setup
- db.js
- layout.tsx
- route.ts
- tts.js

## God Nodes (most connected - your core abstractions)
1. `Notice()` - 27 edges
2. `Card()` - 22 edges
3. `getCallSession()` - 22 edges
4. `Button()` - 21 edges
5. `updateCallSession()` - 21 edges
6. `LivePage()` - 18 edges
7. `cx()` - 18 edges
8. `api()` - 18 edges
9. `CallLogPage()` - 17 edges
10. `KnowledgePage()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `mp3For()` --calls--> `toSpeech()`  [EXTRACTED]
  backend/pipeline/tts.js → backend/pipeline/speechText.js
- `speakGoogle()` --calls--> `getGoogleTTS()`  [EXTRACTED]
  backend/pipeline/tts.js → backend/services/speech.js
- `provider()` --calls--> `plivoConfigured()`  [EXTRACTED]
  backend/routes/settings.js → backend/telephony/plivo/config.js
- `handlePlivoStream()` --calls--> `plivoClient()`  [EXTRACTED]
  backend/telephony/plivo/stream.js → backend/telephony/plivo/config.js
- `handlePlivoStream()` --calls--> `url()`  [EXTRACTED]
  backend/telephony/plivo/stream.js → backend/telephony/plivo/config.js

## Import Cycles
- 2-file cycle: `backend/pipeline/conversation.js -> backend/services/settings.js -> backend/pipeline/conversation.js`
- 3-file cycle: `backend/pipeline/conversation.js -> backend/pipeline/tts.js -> backend/services/settings.js -> backend/pipeline/conversation.js`
- 3-file cycle: `backend/pipeline/conversation.js -> backend/services/llm.js -> backend/services/settings.js -> backend/pipeline/conversation.js`

## Communities (23 total, 5 thin omitted)

### Community 0 - "KnowledgePage.tsx"
Cohesion: 0.08
Nodes (88): LoginForm(), LoginPage(), AuthedApp(), Home(), BackendGate(), ping(), Dashboard(), NAV (+80 more)

### Community 1 - "server.js"
Cohesion: 0.08
Nodes (22): handleExotelStatusCallback(), handleExotelVoiceWebhook(), allowedOrigins, app, cors, corsOptions, { execSync }, express (+14 more)

### Community 2 - "exotel/stream.js"
Cohesion: 0.07
Nodes (45): axios, performExotelOutboundCall(), handleExotelStreamConnection(), processUtterance(), mulawToWavBuffer(), processPostCallSummary(), { spawn }, wavToMulawBuffer() (+37 more)

### Community 3 - "backend/package.json"
Cohesion: 0.05
Nodes (46): author, dependencies, bcryptjs@^3.0.3, cors@^2.8.6, csv-parse@^7.0.2, dotenv@^17.3.1, google-tts-api@^2.0.2, groq-sdk@^1.1.1 (+38 more)

### Community 4 - "routes/auth.js"
Cohesion: 0.17
Nodes (14): authenticate(), authorize(), jwt, express@^5.2.1, bcrypt, express, jwt, router (+6 more)

### Community 5 - "frontend/package.json"
Cohesion: 0.08
Nodes (32): eslintConfig, dependencies, lucide-react@^1.7.0, next@16.1.6, react@19.2.3, react-dom@19.2.3, devDependencies, eslint@^9 (+24 more)

### Community 6 - "start.js"
Cohesion: 0.15
Nodes (10): envFile, { execSync }, fs, missing, notSet, OTHER, path, RECOMMENDED (+2 more)

### Community 7 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 8 - "2. Target system"
Cohesion: 0.11
Nodes (17): 1. What exists today, 2. Target system, 3. Open decisions, 4. Order of work, 5. As built, Backend layout after the change, Call flow, Call path (+9 more)

### Community 9 - "services"
Cohesion: 0.14
Nodes (13): key, sync, value, services, autoDeploy, dockerContext, dockerfilePath, env (+5 more)

### Community 11 - "VED"
Cohesion: 0.33
Nodes (5): Commands, Conventions, graphify, Layout, VED

### Community 12 - "vercel.json"
Cohesion: 0.50
Nodes (3): buildCommand, framework, outputDirectory

### Community 15 - "routes/settings.js"
Cohesion: 0.07
Nodes (57): mp3For(), ttsProvider(), express, provider(), router, activeForwardingNumbers(), addForwardingNumber(), listForwardingNumbers() (+49 more)

### Community 16 - "mongodb.js"
Cohesion: 0.18
Nodes (7): express, router, addKnowledge(), deleteKnowledge(), getAllAnalytics(), getEntityCalls(), updateKnowledge()

### Community 18 - "Plivo setup"
Cohesion: 0.22
Nodes (8): 0. Before anything: where the backend runs, 1. Account, credit and KYC, 2. Rent the number, 3. Backend environment, 4. Create the application, 5. Link the number and test, How a call flows, Plivo setup

### Community 19 - "db.js"
Cohesion: 0.27
Nodes (5): express, router, bcrypt, prisma, { PrismaClient }

### Community 21 - "route.ts"
Cohesion: 0.38
Nodes (6): dynamic, esc(), GET, handle(), POST, xml()

### Community 22 - "tts.js"
Cohesion: 0.11
Nodes (30): toMulaw8k(), digitsOneByOne(), EXPANSIONS, hindiNumber(), ONES, toSpeech(), cache, cacheKey() (+22 more)

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `routes/auth.js` to `server.js`, `backend/package.json`, `routes/settings.js`, `mongodb.js`, `db.js`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Should `KnowledgePage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08278388278388278 - nodes in this community are weakly interconnected._
- **Why does `handlePlivoStream()` connect `exotel/stream.js` to `server.js`, `routes/settings.js`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07936507936507936 - nodes in this community are weakly interconnected._
- **Should `exotel/stream.js` be split into smaller, more focused modules?**
  _Cohesion score 0.0710868079289132 - nodes in this community are weakly interconnected._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05357142857142857 - nodes in this community are weakly interconnected._
- **Should `frontend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0766488413547237 - nodes in this community are weakly interconnected._