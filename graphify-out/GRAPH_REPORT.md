# Graph Report - ved  (2026-11-21)

## Corpus Check
- 66 files · ~27,198 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 4, .example 1, .prisma 1)

## Summary
- 508 nodes · 1224 edges · 23 communities (18 shown, 5 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 83 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6ae2842a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KnowledgePage.tsx
- server.js
- exotel/stream.js
- backend/package.json
- routes/auth.js
- frontend/package.json
- tts.js
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
- routes/auth.js
- Plivo setup
- db.js
- handlePlivoStream
- route.ts
- layout.tsx

## God Nodes (most connected - your core abstractions)
1. `Notice()` - 25 edges
2. `getCallSession()` - 22 edges
3. `updateCallSession()` - 21 edges
4. `Card()` - 20 edges
5. `Button()` - 18 edges
6. `api()` - 18 edges
7. `CallLogPage()` - 17 edges
8. `KnowledgePage()` - 17 edges
9. `LivePage()` - 16 edges
10. `cx()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `handlePlivoStream()` --calls--> `Conversation`  [EXTRACTED]
  backend/telephony/plivo/stream.js → backend/pipeline/conversation.js
- `lineFor()` --calls--> `ttsProvider()`  [EXTRACTED]
  backend/telephony/plivo/lines.js → backend/pipeline/tts.js
- `speakGoogle()` --calls--> `getGoogleTTS()`  [EXTRACTED]
  backend/pipeline/tts.js → backend/services/speech.js
- `audioFor()` --calls--> `mp3For()`  [EXTRACTED]
  backend/telephony/plivo/lines.js → backend/pipeline/tts.js
- `handlePlivoStream()` --calls--> `finalizeCall()`  [EXTRACTED]
  backend/telephony/plivo/stream.js → backend/services/callRecords.js

## Import Cycles
- None detected.

## Communities (23 total, 5 thin omitted)

### Community 0 - "KnowledgePage.tsx"
Cohesion: 0.09
Nodes (76): LoginPage(), Home(), Dashboard(), NAV, pageFromHash(), PageId, AgentPage(), InstructionsCard() (+68 more)

### Community 1 - "server.js"
Cohesion: 0.07
Nodes (23): handleExotelStatusCallback(), handleExotelVoiceWebhook(), allowedOrigins, app, cors, corsOptions, { execSync }, express (+15 more)

### Community 2 - "exotel/stream.js"
Cohesion: 0.08
Nodes (43): axios, performExotelOutboundCall(), handleExotelStreamConnection(), processUtterance(), mulawToWavBuffer(), processPostCallSummary(), { spawn }, wavToMulawBuffer() (+35 more)

### Community 3 - "backend/package.json"
Cohesion: 0.06
Nodes (45): author, dependencies, bcryptjs@^3.0.3, cors@^2.8.6, csv-parse@^7.0.2, dotenv@^17.3.1, google-tts-api@^2.0.2, groq-sdk@^1.1.1 (+37 more)

### Community 4 - "routes/auth.js"
Cohesion: 0.23
Nodes (10): authenticate(), authorize(), jwt, express@^5.2.1, express, router, express, router (+2 more)

### Community 5 - "frontend/package.json"
Cohesion: 0.08
Nodes (32): eslintConfig, dependencies, lucide-react@^1.7.0, next@16.1.6, react@19.2.3, react-dom@19.2.3, devDependencies, eslint@^9 (+24 more)

### Community 6 - "tts.js"
Cohesion: 0.19
Nodes (21): toMulaw8k(), digitsOneByOne(), EXPANSIONS, hindiNumber(), ONES, toSpeech(), cache, cacheKey() (+13 more)

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
Cohesion: 0.08
Nodes (51): express, provider(), router, activeForwardingNumbers(), addForwardingNumber(), listForwardingNumbers(), normaliseNumber(), removeForwardingNumber() (+43 more)

### Community 16 - "mongodb.js"
Cohesion: 0.18
Nodes (7): express, router, addKnowledge(), deleteKnowledge(), getAllAnalytics(), getEntityCalls(), updateKnowledge()

### Community 17 - "routes/auth.js"
Cohesion: 0.32
Nodes (6): bcrypt, express, jwt, router, createUser(), findUserByEmail()

### Community 18 - "Plivo setup"
Cohesion: 0.22
Nodes (8): 0. Before anything: where the backend runs, 1. Account, credit and KYC, 2. Rent the number, 3. Backend environment, 4. Create the application, 5. Link the number and test, How a call flows, Plivo setup

### Community 19 - "db.js"
Cohesion: 0.21
Nodes (4): bcrypt, prisma, { PrismaClient }, LeadService

### Community 21 - "route.ts"
Cohesion: 0.38
Nodes (6): dynamic, esc(), GET, handle(), POST, xml()

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `routes/auth.js` to `server.js`, `backend/package.json`, `routes/settings.js`, `mongodb.js`, `routes/auth.js`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Should `KnowledgePage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09340659340659341 - nodes in this community are weakly interconnected._
- **Why does `handlePlivoStream()` connect `handlePlivoStream` to `server.js`, `exotel/stream.js`, `routes/settings.js`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07096774193548387 - nodes in this community are weakly interconnected._
- **Why does `Conversation` connect `exotel/stream.js` to `handlePlivoStream`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Should `exotel/stream.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08165057067603161 - nodes in this community are weakly interconnected._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.057971014492753624 - nodes in this community are weakly interconnected._