# Graph Report - ved  (2026-11-23)

## Corpus Check
- 76 files · ~35,914 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 11 file(s) not represented in the graph (top: (none) 5, .example 2, .prisma 1)

## Summary
- 590 nodes · 1473 edges · 25 communities (20 shown, 5 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 103 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `83e7f13d`
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
- knowledgeText.js
- LeadService
- Plivo setup
- db.js
- layout.tsx
- route.ts
- tts.js
- mongodb.js
- knowledge.ts

## God Nodes (most connected - your core abstractions)
1. `Notice()` - 27 edges
2. `getCallSession()` - 23 edges
3. `updateCallSession()` - 23 edges
4. `Card()` - 22 edges
5. `Button()` - 21 edges
6. `Conversation` - 20 edges
7. `cx()` - 19 edges
8. `LivePage()` - 18 edges
9. `api()` - 18 edges
10. `CallLogPage()` - 17 edges

## Surprising Connections (you probably didn't know these)
- `handlePlivoStream()` --calls--> `Conversation`  [EXTRACTED]
  backend/telephony/plivo/stream.js → backend/pipeline/conversation.js
- `lineFor()` --calls--> `ttsProvider()`  [EXTRACTED]
  backend/telephony/plivo/lines.js → backend/pipeline/tts.js
- `warmLines()` --calls--> `ttsProvider()`  [EXTRACTED]
  backend/telephony/plivo/lines.js → backend/pipeline/tts.js
- `speakGoogle()` --calls--> `getGoogleTTS()`  [EXTRACTED]
  backend/pipeline/tts.js → backend/services/speech.js
- `audioFor()` --calls--> `mp3For()`  [EXTRACTED]
  backend/telephony/plivo/lines.js → backend/pipeline/tts.js

## Import Cycles
- None detected.

## Communities (25 total, 5 thin omitted)

### Community 0 - "KnowledgePage.tsx"
Cohesion: 0.08
Nodes (92): LoginForm(), LoginPage(), AuthedApp(), Home(), BackendGate(), Health, markAwake(), ping() (+84 more)

### Community 1 - "server.js"
Cohesion: 0.08
Nodes (22): handleExotelStatusCallback(), handleExotelVoiceWebhook(), allowedOrigins, app, cors, corsOptions, { execSync }, express (+14 more)

### Community 2 - "exotel/stream.js"
Cohesion: 0.07
Nodes (49): axios, performExotelOutboundCall(), handleExotelStreamConnection(), processUtterance(), mulawToWavBuffer(), processPostCallSummary(), { spawn }, wavToMulawBuffer() (+41 more)

### Community 3 - "backend/package.json"
Cohesion: 0.06
Nodes (42): author, dependencies, cors@^2.8.6, csv-parse@^7.0.2, dotenv@^17.3.1, express@^5.2.1, google-tts-api@^2.0.2, groq-sdk@^1.1.1 (+34 more)

### Community 4 - "routes/auth.js"
Cohesion: 0.13
Nodes (18): authenticate(), authorize(), jwt, jsonwebtoken@^9.0.3, express, router, bcrypt, express (+10 more)

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
Cohesion: 0.06
Nodes (60): express, provider(), router, activeForwardingNumbers(), addForwardingNumber(), listForwardingNumbers(), normaliseNumber(), PUBLIC_FIELDS (+52 more)

### Community 16 - "knowledgeText.js"
Cohesion: 0.42
Nodes (9): cleanKnowledgeText(), legacyCsvToRows(), normalizeSpaces(), rowLine(), rowsToText(), splitRow(), tidy(), tidyCell() (+1 more)

### Community 18 - "Plivo setup"
Cohesion: 0.22
Nodes (8): 0. Before anything: where the backend runs, 1. Account, credit and KYC, 2. Rent the number, 3. Backend environment, 4. Create the application, 5. Link the number and test, How a call flows, Plivo setup

### Community 19 - "db.js"
Cohesion: 0.18
Nodes (8): bcryptjs@^3.0.3, express, router, bcrypt, bcrypt, prisma, { PrismaClient }, bcryptjs

### Community 21 - "route.ts"
Cohesion: 0.38
Nodes (6): dynamic, esc(), GET, handle(), POST, xml()

### Community 22 - "tts.js"
Cohesion: 0.11
Nodes (33): toMulaw8k(), digitsOneByOne(), EXPANSIONS, hindiNumber(), ONES, toSpeech(), cache, cacheKey() (+25 more)

### Community 23 - "mongodb.js"
Cohesion: 0.28
Nodes (5): addKnowledge(), cleanFor(), deleteKnowledge(), getAllAnalytics(), updateKnowledge()

### Community 24 - "knowledge.ts"
Cohesion: 0.60
Nodes (4): hasDigit(), KnowledgeBlock, looksLikeHeader(), parseKnowledge()

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `routes/auth.js` to `db.js`, `server.js`, `backend/package.json`, `webhooks.js`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `KnowledgePage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0781515460414543 - nodes in this community are weakly interconnected._
- **Why does `Conversation` connect `exotel/stream.js` to `webhooks.js`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08262108262108261 - nodes in this community are weakly interconnected._
- **Why does `handlePlivoStream()` connect `webhooks.js` to `server.js`, `exotel/stream.js`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Should `exotel/stream.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07010710808179163 - nodes in this community are weakly interconnected._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.059800664451827246 - nodes in this community are weakly interconnected._