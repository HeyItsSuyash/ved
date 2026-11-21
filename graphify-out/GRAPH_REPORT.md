# Graph Report - ved  (2026-11-21)

## Corpus Check
- 64 files · ~25,581 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 4, .example 1, .prisma 1)

## Summary
- 481 nodes · 1152 edges · 22 communities (19 shown, 3 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 75 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ed714264`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KnowledgePage.tsx
- server.js
- exotel/stream.js
- backend/package.json
- routes/auth.js
- frontend/package.json
- layout.tsx
- compilerOptions
- 2. Target system
- services
- EntityService
- VED
- vercel.json
- VED
- postcss.config.mjs
- routes/settings.js
- db.js
- mongodb.js
- Plivo setup
- services/settings.js
- xml.js
- route.ts

## God Nodes (most connected - your core abstractions)
1. `Notice()` - 25 edges
2. `getCallSession()` - 21 edges
3. `updateCallSession()` - 20 edges
4. `Card()` - 20 edges
5. `Button()` - 18 edges
6. `api()` - 18 edges
7. `CallLogPage()` - 17 edges
8. `KnowledgePage()` - 17 edges
9. `LivePage()` - 16 edges
10. `cx()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `handleExotelStreamConnection()` --calls--> `createCallSession()`  [EXTRACTED]
  backend/exotel/stream.js → backend/state/calls.js
- `handleExotelStreamConnection()` --calls--> `getCallSession()`  [EXTRACTED]
  backend/exotel/stream.js → backend/state/calls.js
- `handleExotelStreamConnection()` --calls--> `updateCallSession()`  [EXTRACTED]
  backend/exotel/stream.js → backend/state/calls.js
- `processUtterance()` --calls--> `getCallSession()`  [EXTRACTED]
  backend/exotel/stream.js → backend/state/calls.js
- `processPostCallSummary()` --calls--> `getCallSession()`  [EXTRACTED]
  backend/exotel/stream.js → backend/state/calls.js

## Import Cycles
- None detected.

## Communities (22 total, 3 thin omitted)

### Community 0 - "KnowledgePage.tsx"
Cohesion: 0.10
Nodes (75): LoginPage(), Home(), Dashboard(), NAV, pageFromHash(), PageId, AgentPage(), InstructionsCard() (+67 more)

### Community 1 - "server.js"
Cohesion: 0.07
Nodes (24): handleExotelStatusCallback(), handleExotelVoiceWebhook(), router, allowedOrigins, app, cors, corsOptions, { execSync } (+16 more)

### Community 2 - "exotel/stream.js"
Cohesion: 0.09
Nodes (36): handleExotelStreamConnection(), processUtterance(), mulawToWavBuffer(), processPostCallSummary(), { spawn }, wavToMulawBuffer(), MULAW_TO_PCM, mulawRms() (+28 more)

### Community 3 - "backend/package.json"
Cohesion: 0.06
Nodes (44): author, dependencies, bcryptjs@^3.0.3, cors@^2.8.6, csv-parse@^7.0.2, dotenv@^17.3.1, google-tts-api@^2.0.2, groq-sdk@^1.1.1 (+36 more)

### Community 4 - "routes/auth.js"
Cohesion: 0.17
Nodes (14): authenticate(), authorize(), jwt, express@^5.2.1, bcrypt, express, jwt, router (+6 more)

### Community 5 - "frontend/package.json"
Cohesion: 0.08
Nodes (32): eslintConfig, dependencies, lucide-react@^1.7.0, next@16.1.6, react@19.2.3, react-dom@19.2.3, devDependencies, eslint@^9 (+24 more)

### Community 6 - "layout.tsx"
Cohesion: 0.24
Nodes (3): inter, metadata, nextConfig

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
Nodes (45): axios, performExotelOutboundCall(), express, provider(), describeWithoutSummary(), finalizeCall(), REASON_TEXT, activeForwardingNumbers() (+37 more)

### Community 16 - "db.js"
Cohesion: 0.18
Nodes (6): express, router, bcrypt, prisma, { PrismaClient }, LeadService

### Community 17 - "mongodb.js"
Cohesion: 0.18
Nodes (7): express, router, addKnowledge(), deleteKnowledge(), getAllAnalytics(), getEntityCalls(), updateKnowledge()

### Community 18 - "Plivo setup"
Cohesion: 0.22
Nodes (8): 0. Before anything: where the backend runs, 1. Account, credit and KYC, 2. Rent the number, 3. Backend environment, 4. Create the application, 5. Link the number and test, How a call flows, Plivo setup

### Community 19 - "services/settings.js"
Cohesion: 0.36
Nodes (7): cache, DEFAULTS, EDITABLE, loadSettings(), pick(), updateSettings(), validate()

### Community 20 - "xml.js"
Cohesion: 0.57
Nodes (7): dialXml(), esc(), hangupXml(), speak(), speakAndHangupXml(), streamXml(), wrap()

### Community 21 - "route.ts"
Cohesion: 0.38
Nodes (6): dynamic, esc(), GET, handle(), POST, xml()

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `express` connect `routes/auth.js` to `server.js`, `backend/package.json`, `routes/settings.js`, `db.js`, `mongodb.js`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Should `KnowledgePage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09712858926342073 - nodes in this community are weakly interconnected._
- **Why does `handlePlivoStream()` connect `routes/settings.js` to `server.js`, `exotel/stream.js`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07096774193548387 - nodes in this community are weakly interconnected._
- **Why does `EntityService` connect `EntityService` to `db.js`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Should `exotel/stream.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08821548821548822 - nodes in this community are weakly interconnected._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.05858585858585859 - nodes in this community are weakly interconnected._