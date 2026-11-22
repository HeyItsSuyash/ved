# Graph Report - ved  (2026-11-22)

## Corpus Check
- 72 files · ~33,381 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 5, .example 2, .prisma 1)

## Summary
- 564 nodes · 1396 edges · 24 communities (20 shown, 4 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 94 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `30fcc639`
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
- webhooks.js
- twilio
- LeadService
- Plivo setup
- db.js
- api.ts
- route.ts
- tts.js
- scripts

## God Nodes (most connected - your core abstractions)
1. `Notice()` - 27 edges
2. `getCallSession()` - 23 edges
3. `updateCallSession()` - 23 edges
4. `Card()` - 22 edges
5. `Button()` - 21 edges
6. `Conversation` - 20 edges
7. `LivePage()` - 18 edges
8. `cx()` - 18 edges
9. `api()` - 18 edges
10. `CallLogPage()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `handlePlivoStream()` --calls--> `Conversation`  [EXTRACTED]
  backend/telephony/plivo/stream.js → backend/pipeline/conversation.js
- `LoginForm()` --calls--> `getToken()`  [EXTRACTED]
  frontend/app/login/page.tsx → frontend/lib/api.ts
- `LoginForm()` --calls--> `saveSession()`  [EXTRACTED]
  frontend/app/login/page.tsx → frontend/lib/api.ts
- `AuthedApp()` --calls--> `Dashboard()`  [EXTRACTED]
  frontend/app/page.tsx → frontend/components/Dashboard.tsx
- `AuthedApp()` --calls--> `Loading()`  [EXTRACTED]
  frontend/app/page.tsx → frontend/components/ui.tsx

## Import Cycles
- None detected.

## Communities (24 total, 4 thin omitted)

### Community 0 - "KnowledgePage.tsx"
Cohesion: 0.11
Nodes (73): LoginForm(), Dashboard(), NAV, pageFromHash(), PageId, AgentPage(), ConversationCard(), TestCallCard() (+65 more)

### Community 1 - "server.js"
Cohesion: 0.07
Nodes (24): handleExotelStatusCallback(), handleExotelVoiceWebhook(), allowedOrigins, app, cors, corsOptions, { execSync }, express (+16 more)

### Community 2 - "exotel/stream.js"
Cohesion: 0.08
Nodes (44): axios, performExotelOutboundCall(), handleExotelStreamConnection(), processUtterance(), mulawToWavBuffer(), processPostCallSummary(), { spawn }, wavToMulawBuffer() (+36 more)

### Community 3 - "backend/package.json"
Cohesion: 0.08
Nodes (34): author, dependencies, cors@^2.8.6, csv-parse@^7.0.2, dotenv@^17.3.1, google-tts-api@^2.0.2, groq-sdk@^1.1.1, multer@^2.1.1 (+26 more)

### Community 4 - "routes/auth.js"
Cohesion: 0.13
Nodes (19): authenticate(), authorize(), jwt, express@^5.2.1, jsonwebtoken@^9.0.3, express, router, bcrypt (+11 more)

### Community 5 - "frontend/package.json"
Cohesion: 0.08
Nodes (32): eslintConfig, dependencies, lucide-react@^1.7.0, next@16.1.6, react@19.2.3, react-dom@19.2.3, devDependencies, eslint@^9 (+24 more)

### Community 6 - "start.js"
Cohesion: 0.16
Nodes (12): envFile, { execSync }, fs, path, RECOMMENDED, REQUIRED, root, applyDatabaseUrls() (+4 more)

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

### Community 15 - "webhooks.js"
Cohesion: 0.07
Nodes (54): express, provider(), router, activeForwardingNumbers(), addForwardingNumber(), listForwardingNumbers(), normaliseNumber(), PUBLIC_FIELDS (+46 more)

### Community 16 - "twilio"
Cohesion: 0.40
Nodes (4): twilio@^5.13.0, handleTwilioWebhook(), twilio, twilio

### Community 18 - "Plivo setup"
Cohesion: 0.22
Nodes (8): 0. Before anything: where the backend runs, 1. Account, credit and KYC, 2. Rent the number, 3. Backend environment, 4. Create the application, 5. Link the number and test, How a call flows, Plivo setup

### Community 19 - "db.js"
Cohesion: 0.17
Nodes (8): bcryptjs@^3.0.3, express, router, bcrypt, bcrypt, prisma, { PrismaClient }, bcryptjs

### Community 20 - "api.ts"
Cohesion: 0.13
Nodes (20): inter, metadata, LoginPage(), AuthedApp(), Home(), BackendGate(), Health, markAwake() (+12 more)

### Community 21 - "route.ts"
Cohesion: 0.38
Nodes (6): dynamic, esc(), GET, handle(), POST, xml()

### Community 22 - "tts.js"
Cohesion: 0.10
Nodes (37): toMulaw8k(), digitsOneByOne(), EXPANSIONS, hindiNumber(), ONES, toSpeech(), cache, cacheKey() (+29 more)

### Community 23 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, create-admin, dev, start

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `routes/auth.js` to `db.js`, `server.js`, `backend/package.json`, `webhooks.js`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Should `KnowledgePage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10527825588066551 - nodes in this community are weakly interconnected._
- **Why does `Conversation` connect `exotel/stream.js` to `webhooks.js`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07459677419354839 - nodes in this community are weakly interconnected._
- **Why does `handlePlivoStream()` connect `webhooks.js` to `server.js`, `exotel/stream.js`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Should `exotel/stream.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07686453576864535 - nodes in this community are weakly interconnected._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0773109243697479 - nodes in this community are weakly interconnected._