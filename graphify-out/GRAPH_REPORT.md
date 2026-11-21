# Graph Report - ved  (2026-11-21)

## Corpus Check
- 51 files · ~19,423 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 8 file(s) not represented in the graph (top: (none) 4, .example 1, .prisma 1)

## Summary
- 368 nodes · 815 edges · 15 communities (12 shown, 3 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 43 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f36865a7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- KnowledgePage.tsx
- server.js
- exotel/stream.js
- backend/package.json
- routes/auth.js
- frontend/package.json
- api.ts
- compilerOptions
- 2. Target system
- services
- EntityService
- VED
- vercel.json
- VED
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `Notice()` - 22 edges
2. `Card()` - 18 edges
3. `KnowledgePage()` - 17 edges
4. `Button()` - 17 edges
5. `api()` - 17 edges
6. `CallLogPage()` - 16 edges
7. `LivePage()` - 16 edges
8. `compilerOptions` - 16 edges
9. `cx()` - 15 edges
10. `Input()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `initiateExotelOutboundCall()` --calls--> `performExotelOutboundCall()`  [EXTRACTED]
  backend/exotel/outbound.js → backend/exotel/service.js
- `LoginPage()` --calls--> `Button()`  [EXTRACTED]
  frontend/app/login/page.tsx → frontend/components/ui.tsx
- `LoginPage()` --calls--> `Field()`  [EXTRACTED]
  frontend/app/login/page.tsx → frontend/components/ui.tsx
- `LoginPage()` --calls--> `Input()`  [EXTRACTED]
  frontend/app/login/page.tsx → frontend/components/ui.tsx
- `LoginPage()` --calls--> `Notice()`  [EXTRACTED]
  frontend/app/login/page.tsx → frontend/components/ui.tsx

## Import Cycles
- None detected.

## Communities (15 total, 3 thin omitted)

### Community 0 - "KnowledgePage.tsx"
Cohesion: 0.13
Nodes (54): Dashboard(), NAV, pageFromHash(), PageId, AgentPage(), InstructionsCard(), TestCallCard(), CallLogPage() (+46 more)

### Community 1 - "server.js"
Cohesion: 0.05
Nodes (38): handleExotelStatusCallback(), handleExotelVoiceWebhook(), express, router, app, cors, corsOptions, { execSync } (+30 more)

### Community 2 - "exotel/stream.js"
Cohesion: 0.12
Nodes (33): initiateExotelOutboundCall(), axios, performExotelOutboundCall(), handleExotelStreamConnection(), processUtterance(), mulawToWavBuffer(), processPostCallSummary(), { spawn } (+25 more)

### Community 3 - "backend/package.json"
Cohesion: 0.06
Nodes (41): author, dependencies, cors@^2.8.6, csv-parse@^7.0.2, dotenv@^17.3.1, google-tts-api@^2.0.2, groq-sdk@^1.1.1, jsonwebtoken@^9.0.3 (+33 more)

### Community 4 - "routes/auth.js"
Cohesion: 0.09
Nodes (22): authenticate(), authorize(), jwt, bcryptjs@^3.0.3, express@^5.2.1, express, router, bcrypt (+14 more)

### Community 5 - "frontend/package.json"
Cohesion: 0.08
Nodes (32): eslintConfig, dependencies, lucide-react@^1.7.0, next@16.1.6, react@19.2.3, react-dom@19.2.3, devDependencies, eslint@^9 (+24 more)

### Community 6 - "api.ts"
Cohesion: 0.17
Nodes (15): inter, metadata, LoginPage(), Home(), api(), ApiError, BACKEND_URL, clearSession() (+7 more)

### Community 7 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 8 - "2. Target system"
Cohesion: 0.12
Nodes (16): 1. What exists today, 2. Target system, 3. Open decisions, 4. Order of work, Backend layout after the change, Call flow, Call path, Components (+8 more)

### Community 9 - "services"
Cohesion: 0.14
Nodes (13): key, sync, value, services, autoDeploy, dockerContext, dockerfilePath, env (+5 more)

### Community 11 - "VED"
Cohesion: 0.33
Nodes (5): Commands, Conventions, graphify, Layout, VED

### Community 12 - "vercel.json"
Cohesion: 0.50
Nodes (3): buildCommand, framework, outputDirectory

## Knowledge Gaps
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `KnowledgePage.tsx` to `frontend/package.json`, `api.ts`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `KnowledgePage.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13442460317460317 - nodes in this community are weakly interconnected._
- **Why does `EntityService` connect `EntityService` to `routes/auth.js`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `server.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05152394775036284 - nodes in this community are weakly interconnected._
- **Why does `next` connect `api.ts` to `KnowledgePage.tsx`, `frontend/package.json`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `exotel/stream.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12050739957716702 - nodes in this community are weakly interconnected._
- **Should `backend/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.0627177700348432 - nodes in this community are weakly interconnected._