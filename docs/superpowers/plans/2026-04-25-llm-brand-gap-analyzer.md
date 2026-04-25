# LLM Brand Gap Analyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React app that diagnoses brand perception gaps in LLM outputs, generates content strategy, and tracks progress via Peec AI.

**Architecture:** Express backend proxies Anthropic API and Peec AI MCP calls. React frontend with three tabs (Gap Analysis, Content Strategy, Progress). SQLite for persistence. SSE for real-time progress on long-running operations.

**Tech Stack:** React 18, Vite, Tailwind CSS, Express, SQLite (better-sqlite3), @anthropic-ai/sdk, @modelcontextprotocol/sdk, React Query, Recharts

---

## Phase 1: Project Scaffolding

### Task 1: Initialize Root Project Structure

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `tsconfig.base.json`

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "llm-brand-gap-analyzer",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:client": "npm run dev --workspace=client",
    "dev:server": "npm run dev --workspace=server",
    "build": "npm run build --workspace=shared && npm run build --workspace=server && npm run build --workspace=client",
    "start": "npm run start --workspace=server",
    "test": "npm run test --workspaces --if-present"
  },
  "workspaces": [
    "shared",
    "server",
    "client"
  ],
  "devDependencies": {
    "concurrently": "^8.2.2",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
dist/
.env
*.db
*.sqlite
.DS_Store
```

- [ ] **Step 3: Create .env.example**

```
ANTHROPIC_API_KEY=your_anthropic_api_key_here
PEEC_CLIENT_ID=your_peec_client_id_here
PEEC_CLIENT_SECRET=your_peec_client_secret_here
PEEC_REDIRECT_URI=http://localhost:3001/api/auth/peec/callback
```

- [ ] **Step 4: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore .env.example tsconfig.base.json
git commit -m "chore: initialize root project structure"
```

---

### Task 2: Create Shared Types Package

**Files:**
- Create: `shared/package.json`
- Create: `shared/tsconfig.json`
- Create: `shared/src/types.ts`
- Create: `shared/src/index.ts`

- [ ] **Step 1: Create shared/package.json**

```json
{
  "name": "shared",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  }
}
```

- [ ] **Step 2: Create shared/tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create shared/src/types.ts**

```typescript
// Brand Brief - collected from user
export interface BrandBrief {
  id: string;
  projectId: string;
  brandName: string;
  domain: string;
  category: string;
  desiredTone: "Professional" | "Friendly" | "Technical" | "Thought Leader";
  desiredClaims: string[];
  keyDifferentiators: string[];
  competitors: string[];
  createdAt: string;
  updatedAt: string;
}

// Project - container for brand analysis
export interface Project {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
  updatedAt: string;
  brief?: BrandBrief;
}

// Gap Analysis - result of comparing current vs desired state
export interface GapAnalysisGap {
  id: string;
  description: string;
  severity: "High" | "Medium" | "Low";
  currentClaim: string;
  desiredClaim: string;
  rationale: string;
}

export interface CitationSource {
  domain: string;
  trustSignal: string;
  mentionCount: number;
}

export interface GapAnalysis {
  id: string;
  projectId: string;
  currentStateSummary: string;
  targetState: string;
  gaps: GapAnalysisGap[];
  citationSources: CitationSource[];
  createdAt: string;
}

// Content Strategy - generated action plan
export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  targetQuery: string;
  keyClaims: string[];
  wordCount: number;
  internalLinkingTargets: string[];
  schemaType: string;
}

export interface StructuredDataTemplate {
  id: string;
  schemaType: string;
  purpose: string;
  gapAddressed: string;
  jsonLd: string;
}

export interface PRAngle {
  id: string;
  headline: string;
  publicationType: string;
  hook: string;
  keyDataPoint: string;
  targetClaim: string;
}

export interface QuickWin {
  id: string;
  description: string;
  completed: boolean;
}

export interface ContentStrategy {
  id: string;
  projectId: string;
  gapAnalysisId: string;
  articles: KnowledgeBaseArticle[];
  structuredData: StructuredDataTemplate[];
  prAngles: PRAngle[];
  quickWins: QuickWin[];
  createdAt: string;
  updatedAt: string;
}

// Progress Snapshot - weekly tracking
export interface SnapshotMetrics {
  sentiment: Record<string, number>; // by LLM name
  citationRate: number;
  shareOfVoice: number;
  topCitedDomains: string[];
}

export interface Snapshot {
  id: string;
  projectId: string;
  isBaseline: boolean;
  weekKey: string;
  metrics: SnapshotMetrics;
  deltaAnalysis?: {
    sentimentShift: Record<string, { change: number; direction: "improved" | "declined" | "unchanged" }>;
    citationRateChange: number;
    newDomains: string[];
    lostDomains: string[];
    trajectory: "On track" | "Needs attention" | "Regressing";
    summary: string;
  };
  createdAt: string;
}

// SSE Event Types
export type SSEProgressStatus = "in_progress" | "complete" | "error";

export interface SSEProgressEvent {
  type: "progress";
  step: string;
  status: SSEProgressStatus;
  message?: string;
}

export interface SSECompleteEvent<T> {
  type: "complete";
  data: T;
}

export interface SSEErrorEvent {
  type: "error";
  code: string;
  message: string;
}

export type SSEEvent<T> = SSEProgressEvent | SSECompleteEvent<T> | SSEErrorEvent;

// API Request/Response Types
export interface CreateProjectRequest {
  name: string;
  domain: string;
  brief: Omit<BrandBrief, "id" | "projectId" | "createdAt" | "updatedAt">;
}

export interface UpdateBriefRequest {
  brandName?: string;
  domain?: string;
  category?: string;
  desiredTone?: BrandBrief["desiredTone"];
  desiredClaims?: string[];
  keyDifferentiators?: string[];
  competitors?: string[];
}

export interface ApiError {
  error: string;
  code: string;
}
```

- [ ] **Step 4: Create shared/src/index.ts**

```typescript
export * from "./types.js";
```

- [ ] **Step 5: Build shared package**

Run: `cd shared && npm run build`
Expected: `dist/` folder created with `.js` and `.d.ts` files

- [ ] **Step 6: Commit**

```bash
git add shared/
git commit -m "feat: add shared types package"
```

---

### Task 3: Initialize Server Package

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/index.ts`

- [ ] **Step 1: Create server/package.json**

```json
{
  "name": "server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "better-sqlite3": "^11.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0",
    "express": "^4.19.0",
    "shared": "*",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/cors": "^2.8.0",
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "@types/uuid": "^9.0.0",
    "tsx": "^4.7.0",
    "vitest": "^1.4.0"
  }
}
```

- [ ] **Step 2: Create server/tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create server/src/index.ts**

```typescript
import express from "express";
import cors from "cors";
import { config } from "dotenv";

config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

- [ ] **Step 4: Commit**

```bash
git add server/
git commit -m "feat: initialize server package with Express"
```

---

### Task 4: Initialize Client Package

**Files:**
- Create: `client/package.json`
- Create: `client/tsconfig.json`
- Create: `client/tsconfig.node.json`
- Create: `client/vite.config.ts`
- Create: `client/tailwind.config.js`
- Create: `client/postcss.config.js`
- Create: `client/index.html`
- Create: `client/src/main.tsx`
- Create: `client/src/App.tsx`
- Create: `client/src/index.css`

- [ ] **Step 1: Create client/package.json**

```json
{
  "name": "client",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.28.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.12.0",
    "shared": "*"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.4.0"
  }
}
```

- [ ] **Step 2: Create client/tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "noEmit": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create client/tsconfig.node.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create client/vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
```

- [ ] **Step 5: Create client/tailwind.config.js**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0F172A",
        teal: "#0D9488",
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 6: Create client/postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: Create client/index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>LLM Brand Gap Analyzer</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 8: Create client/src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-50 text-gray-900;
  min-width: 1024px;
}
```

- [ ] **Step 9: Create client/src/main.tsx**

```typescript
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
```

- [ ] **Step 10: Create client/src/App.tsx**

```typescript
export default function App() {
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-navy text-white p-4">
        <h1 className="text-xl font-bold">Brand Gap Analyzer</h1>
      </aside>
      <main className="flex-1 p-8">
        <p className="text-gray-600">Select or create a project to begin.</p>
      </main>
    </div>
  );
}
```

- [ ] **Step 11: Commit**

```bash
git add client/
git commit -m "feat: initialize client package with React + Vite + Tailwind"
```

---

### Task 5: Install Dependencies and Verify Setup

**Files:**
- None (verification only)

- [ ] **Step 1: Install all dependencies**

Run: `npm install`
Expected: All workspace dependencies installed without errors

- [ ] **Step 2: Build shared package**

Run: `npm run build --workspace=shared`
Expected: `shared/dist/` folder created

- [ ] **Step 3: Start development servers**

Run: `npm run dev`
Expected:
- Server running on http://localhost:3001
- Client running on http://localhost:5173

- [ ] **Step 4: Verify health endpoint**

Run: `curl http://localhost:3001/api/health`
Expected: `{"status":"ok","timestamp":"..."}`

- [ ] **Step 5: Verify client loads**

Open http://localhost:5173 in browser
Expected: Dark navy sidebar with "Brand Gap Analyzer" title, white main area

- [ ] **Step 6: Commit verification**

```bash
git add -A
git commit -m "chore: verify project setup works"
```

---

### Task 6: Set Up SQLite Database

**Files:**
- Create: `server/src/db/schema.sql`
- Create: `server/src/db/index.ts`

- [ ] **Step 1: Create server/src/db/schema.sql**

```sql
-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Brand briefs (one per project)
CREATE TABLE IF NOT EXISTS brand_briefs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  category TEXT NOT NULL,
  desired_tone TEXT NOT NULL,
  desired_claims TEXT NOT NULL,
  key_differentiators TEXT NOT NULL,
  competitors TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Gap analyses (multiple per project, timestamped)
CREATE TABLE IF NOT EXISTS gap_analyses (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  peec_data TEXT NOT NULL,
  analysis TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- Content strategies (one active per project)
CREATE TABLE IF NOT EXISTS strategies (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  gap_analysis_id TEXT REFERENCES gap_analyses(id),
  content TEXT NOT NULL,
  quick_wins_state TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Progress snapshots (weekly)
CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  is_baseline INTEGER NOT NULL DEFAULT 0,
  week_key TEXT NOT NULL,
  peec_data TEXT NOT NULL,
  delta_analysis TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(project_id, week_key)
);

-- App settings (OAuth tokens, etc.)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

- [ ] **Step 2: Create server/src/db/index.ts**

```typescript
import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const db = new Database(join(__dirname, "../../data.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Initialize schema
const schema = readFileSync(join(__dirname, "schema.sql"), "utf-8");
db.exec(schema);

export default db;

// Helper to get current ISO timestamp
export function now(): string {
  return new Date().toISOString();
}
```

- [ ] **Step 3: Update server/src/index.ts to import db**

```typescript
import express from "express";
import cors from "cors";
import { config } from "dotenv";
import db from "./db/index.js";

config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  // Verify db is working
  const result = db.prepare("SELECT 1 as ok").get() as { ok: number };
  res.json({ status: "ok", db: result.ok === 1, timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

- [ ] **Step 4: Verify database initializes**

Run: `npm run dev:server`
Expected: Server starts without errors, `server/data.db` file created

- [ ] **Step 5: Test health endpoint with db**

Run: `curl http://localhost:3001/api/health`
Expected: `{"status":"ok","db":true,"timestamp":"..."}`

- [ ] **Step 6: Commit**

```bash
git add server/src/db/
git commit -m "feat: add SQLite database with schema"
```

---

## Phase 2: Projects CRUD (Foundation)

### Task 7: Create Projects Routes

**Files:**
- Create: `server/src/routes/projects.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: Create server/src/routes/projects.ts**

```typescript
import { Router } from "express";
import { v4 as uuid } from "uuid";
import db, { now } from "../db/index.js";
import type { Project, BrandBrief, CreateProjectRequest, UpdateBriefRequest } from "shared";

const router = Router();

// List all projects
router.get("/", (_req, res) => {
  const projects = db
    .prepare(
      `SELECT p.*, b.id as brief_id, b.brand_name, b.domain as brief_domain,
              b.category, b.desired_tone, b.desired_claims, b.key_differentiators,
              b.competitors, b.created_at as brief_created_at, b.updated_at as brief_updated_at
       FROM projects p
       LEFT JOIN brand_briefs b ON b.project_id = p.id
       ORDER BY p.created_at DESC`
    )
    .all() as Array<Record<string, unknown>>;

  const result: Project[] = projects.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    domain: row.domain as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    brief: row.brief_id
      ? {
          id: row.brief_id as string,
          projectId: row.id as string,
          brandName: row.brand_name as string,
          domain: row.brief_domain as string,
          category: row.category as string,
          desiredTone: row.desired_tone as BrandBrief["desiredTone"],
          desiredClaims: JSON.parse(row.desired_claims as string),
          keyDifferentiators: JSON.parse(row.key_differentiators as string),
          competitors: JSON.parse(row.competitors as string),
          createdAt: row.brief_created_at as string,
          updatedAt: row.brief_updated_at as string,
        }
      : undefined,
  }));

  res.json(result);
});

// Get single project
router.get("/:id", (req, res) => {
  const row = db
    .prepare(
      `SELECT p.*, b.id as brief_id, b.brand_name, b.domain as brief_domain,
              b.category, b.desired_tone, b.desired_claims, b.key_differentiators,
              b.competitors, b.created_at as brief_created_at, b.updated_at as brief_updated_at
       FROM projects p
       LEFT JOIN brand_briefs b ON b.project_id = p.id
       WHERE p.id = ?`
    )
    .get(req.params.id) as Record<string, unknown> | undefined;

  if (!row) {
    return res.status(404).json({ error: "Project not found", code: "NOT_FOUND" });
  }

  const project: Project = {
    id: row.id as string,
    name: row.name as string,
    domain: row.domain as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    brief: row.brief_id
      ? {
          id: row.brief_id as string,
          projectId: row.id as string,
          brandName: row.brand_name as string,
          domain: row.brief_domain as string,
          category: row.category as string,
          desiredTone: row.desired_tone as BrandBrief["desiredTone"],
          desiredClaims: JSON.parse(row.desired_claims as string),
          keyDifferentiators: JSON.parse(row.key_differentiators as string),
          competitors: JSON.parse(row.competitors as string),
          createdAt: row.brief_created_at as string,
          updatedAt: row.brief_updated_at as string,
        }
      : undefined,
  };

  res.json(project);
});

// Create project with brief
router.post("/", (req, res) => {
  const body = req.body as CreateProjectRequest;
  const projectId = uuid();
  const briefId = uuid();
  const timestamp = now();

  const insertProject = db.prepare(
    `INSERT INTO projects (id, name, domain, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  );

  const insertBrief = db.prepare(
    `INSERT INTO brand_briefs (id, project_id, brand_name, domain, category, desired_tone,
                               desired_claims, key_differentiators, competitors, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const transaction = db.transaction(() => {
    insertProject.run(projectId, body.name, body.domain, timestamp, timestamp);
    insertBrief.run(
      briefId,
      projectId,
      body.brief.brandName,
      body.brief.domain,
      body.brief.category,
      body.brief.desiredTone,
      JSON.stringify(body.brief.desiredClaims),
      JSON.stringify(body.brief.keyDifferentiators),
      JSON.stringify(body.brief.competitors),
      timestamp,
      timestamp
    );
  });

  transaction();

  const project: Project = {
    id: projectId,
    name: body.name,
    domain: body.domain,
    createdAt: timestamp,
    updatedAt: timestamp,
    brief: {
      id: briefId,
      projectId,
      brandName: body.brief.brandName,
      domain: body.brief.domain,
      category: body.brief.category,
      desiredTone: body.brief.desiredTone,
      desiredClaims: body.brief.desiredClaims,
      keyDifferentiators: body.brief.keyDifferentiators,
      competitors: body.brief.competitors,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };

  res.status(201).json(project);
});

// Update brief
router.put("/:id", (req, res) => {
  const body = req.body as UpdateBriefRequest;
  const timestamp = now();

  const existing = db.prepare("SELECT id FROM projects WHERE id = ?").get(req.params.id);
  if (!existing) {
    return res.status(404).json({ error: "Project not found", code: "NOT_FOUND" });
  }

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.brandName !== undefined) {
    updates.push("brand_name = ?");
    values.push(body.brandName);
  }
  if (body.domain !== undefined) {
    updates.push("domain = ?");
    values.push(body.domain);
  }
  if (body.category !== undefined) {
    updates.push("category = ?");
    values.push(body.category);
  }
  if (body.desiredTone !== undefined) {
    updates.push("desired_tone = ?");
    values.push(body.desiredTone);
  }
  if (body.desiredClaims !== undefined) {
    updates.push("desired_claims = ?");
    values.push(JSON.stringify(body.desiredClaims));
  }
  if (body.keyDifferentiators !== undefined) {
    updates.push("key_differentiators = ?");
    values.push(JSON.stringify(body.keyDifferentiators));
  }
  if (body.competitors !== undefined) {
    updates.push("competitors = ?");
    values.push(JSON.stringify(body.competitors));
  }

  if (updates.length > 0) {
    updates.push("updated_at = ?");
    values.push(timestamp);
    values.push(req.params.id);

    db.prepare(
      `UPDATE brand_briefs SET ${updates.join(", ")} WHERE project_id = ?`
    ).run(...values);

    db.prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(timestamp, req.params.id);
  }

  // Return updated project
  const row = db
    .prepare(
      `SELECT p.*, b.id as brief_id, b.brand_name, b.domain as brief_domain,
              b.category, b.desired_tone, b.desired_claims, b.key_differentiators,
              b.competitors, b.created_at as brief_created_at, b.updated_at as brief_updated_at
       FROM projects p
       LEFT JOIN brand_briefs b ON b.project_id = p.id
       WHERE p.id = ?`
    )
    .get(req.params.id) as Record<string, unknown>;

  const project: Project = {
    id: row.id as string,
    name: row.name as string,
    domain: row.domain as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    brief: {
      id: row.brief_id as string,
      projectId: row.id as string,
      brandName: row.brand_name as string,
      domain: row.brief_domain as string,
      category: row.category as string,
      desiredTone: row.desired_tone as BrandBrief["desiredTone"],
      desiredClaims: JSON.parse(row.desired_claims as string),
      keyDifferentiators: JSON.parse(row.key_differentiators as string),
      competitors: JSON.parse(row.competitors as string),
      createdAt: row.brief_created_at as string,
      updatedAt: row.brief_updated_at as string,
    },
  };

  res.json(project);
});

// Delete project
router.delete("/:id", (req, res) => {
  const result = db.prepare("DELETE FROM projects WHERE id = ?").run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: "Project not found", code: "NOT_FOUND" });
  }
  res.status(204).send();
});

export default router;
```

- [ ] **Step 2: Update server/src/index.ts to mount routes**

```typescript
import express from "express";
import cors from "cors";
import { config } from "dotenv";
import db from "./db/index.js";
import projectsRouter from "./routes/projects.js";

config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  const result = db.prepare("SELECT 1 as ok").get() as { ok: number };
  res.json({ status: "ok", db: result.ok === 1, timestamp: new Date().toISOString() });
});

app.use("/api/projects", projectsRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

- [ ] **Step 3: Test create project**

Run:
```bash
curl -X POST http://localhost:3001/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "domain": "test.com",
    "brief": {
      "brandName": "Test Brand",
      "domain": "test.com",
      "category": "SaaS",
      "desiredTone": "Professional",
      "desiredClaims": ["Best in class"],
      "keyDifferentiators": ["Unique feature"],
      "competitors": ["Competitor A"]
    }
  }'
```
Expected: 201 response with project JSON including brief

- [ ] **Step 4: Test list projects**

Run: `curl http://localhost:3001/api/projects`
Expected: Array with the created project

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/projects.ts server/src/index.ts
git commit -m "feat: add projects CRUD routes"
```

---

### Task 8: Create Frontend API Service

**Files:**
- Create: `client/src/services/api.ts`

- [ ] **Step 1: Create client/src/services/api.ts**

```typescript
import type {
  Project,
  CreateProjectRequest,
  UpdateBriefRequest,
  GapAnalysis,
  ContentStrategy,
  Snapshot,
  ApiError,
} from "shared";

const BASE_URL = "/api";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      error: "Request failed",
      code: "UNKNOWN",
    }));
    throw new Error(error.error);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

// Projects
export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch(`${BASE_URL}/projects`);
  return handleResponse<Project[]>(response);
}

export async function fetchProject(id: string): Promise<Project> {
  const response = await fetch(`${BASE_URL}/projects/${id}`);
  return handleResponse<Project>(response);
}

export async function createProject(data: CreateProjectRequest): Promise<Project> {
  const response = await fetch(`${BASE_URL}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<Project>(response);
}

export async function updateProject(id: string, data: UpdateBriefRequest): Promise<Project> {
  const response = await fetch(`${BASE_URL}/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return handleResponse<Project>(response);
}

export async function deleteProject(id: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/projects/${id}`, {
    method: "DELETE",
  });
  return handleResponse<void>(response);
}

// Gap Analysis (placeholder - will implement in Tab 1)
export async function fetchGapAnalysis(projectId: string): Promise<GapAnalysis | null> {
  const response = await fetch(`${BASE_URL}/projects/${projectId}/analysis`);
  if (response.status === 404) return null;
  return handleResponse<GapAnalysis>(response);
}

// Content Strategy (placeholder - will implement in Tab 2)
export async function fetchStrategy(projectId: string): Promise<ContentStrategy | null> {
  const response = await fetch(`${BASE_URL}/projects/${projectId}/strategy`);
  if (response.status === 404) return null;
  return handleResponse<ContentStrategy>(response);
}

// Snapshots (placeholder - will implement in Tab 3)
export async function fetchSnapshots(projectId: string): Promise<Snapshot[]> {
  const response = await fetch(`${BASE_URL}/projects/${projectId}/snapshots`);
  return handleResponse<Snapshot[]>(response);
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/services/api.ts
git commit -m "feat: add frontend API service"
```

---

### Task 9: Create React Query Hooks

**Files:**
- Create: `client/src/hooks/useProjects.ts`

- [ ] **Step 1: Create client/src/hooks/useProjects.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProjects,
  fetchProject,
  createProject,
  updateProject,
  deleteProject,
} from "../services/api";
import type { CreateProjectRequest, UpdateBriefRequest } from "shared";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });
}

export function useProject(id: string | null) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: () => fetchProject(id!),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProjectRequest) => createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBriefRequest }) =>
      updateProject(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects", variables.id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/hooks/useProjects.ts
git commit -m "feat: add React Query hooks for projects"
```

---

### Task 10: Create Project Context

**Files:**
- Create: `client/src/context/ProjectContext.tsx`

- [ ] **Step 1: Create client/src/context/ProjectContext.tsx**

```typescript
import { createContext, useContext, useState, type ReactNode } from "react";

interface ProjectContextValue {
  currentProjectId: string | null;
  setCurrentProjectId: (id: string | null) => void;
  activeTab: number;
  setActiveTab: (tab: number) => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  return (
    <ProjectContext.Provider
      value={{ currentProjectId, setCurrentProjectId, activeTab, setActiveTab }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProjectContext must be used within ProjectProvider");
  }
  return context;
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/context/ProjectContext.tsx
git commit -m "feat: add ProjectContext for UI state"
```

---

### Task 11: Create UI Components

**Files:**
- Create: `client/src/components/ui/Button.tsx`
- Create: `client/src/components/ui/Card.tsx`
- Create: `client/src/components/ui/Input.tsx`
- Create: `client/src/components/ui/Select.tsx`
- Create: `client/src/components/ui/Textarea.tsx`
- Create: `client/src/components/ui/index.ts`

- [ ] **Step 1: Create client/src/components/ui/Button.tsx**

```typescript
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger";
  children: ReactNode;
}

export function Button({ variant = "primary", children, className = "", ...props }: ButtonProps) {
  const base = "px-4 py-2 rounded font-medium transition-colors disabled:opacity-50";
  const variants = {
    primary: "bg-teal text-white hover:bg-teal/90",
    secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Create client/src/components/ui/Card.tsx**

```typescript
import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Card({ title, children, className = "" }: CardProps) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Create client/src/components/ui/Input.tsx**

```typescript
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-teal ${
          error ? "border-red-500" : "border-gray-300"
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 4: Create client/src/components/ui/Select.tsx**

```typescript
import type { SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
}

export function Select({ label, options, error, className = "", ...props }: SelectProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select
        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-teal ${
          error ? "border-red-500" : "border-gray-300"
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 5: Create client/src/components/ui/Textarea.tsx**

```typescript
import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className = "", ...props }: TextareaProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-sm text-gray-500 mb-1">{hint}</p>}
      <textarea
        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-teal ${
          error ? "border-red-500" : "border-gray-300"
        } ${className}`}
        rows={4}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 6: Create client/src/components/ui/index.ts**

```typescript
export { Button } from "./Button";
export { Card } from "./Card";
export { Input } from "./Input";
export { Select } from "./Select";
export { Textarea } from "./Textarea";
```

- [ ] **Step 7: Commit**

```bash
git add client/src/components/ui/
git commit -m "feat: add reusable UI components"
```

---

### Task 12: Create Layout Components

**Files:**
- Create: `client/src/components/layout/Sidebar.tsx`
- Create: `client/src/components/layout/TabNav.tsx`
- Create: `client/src/components/layout/Shell.tsx`
- Create: `client/src/components/layout/index.ts`

- [ ] **Step 1: Create client/src/components/layout/Sidebar.tsx**

```typescript
import { useProjects, useCreateProject } from "../../hooks/useProjects";
import { useProjectContext } from "../../context/ProjectContext";
import { Button } from "../ui";
import type { Project } from "shared";

export function Sidebar() {
  const { data: projects, isLoading } = useProjects();
  const { currentProjectId, setCurrentProjectId, setActiveTab } = useProjectContext();
  const createProject = useCreateProject();

  const handleNewProject = () => {
    const name = prompt("Project name:");
    if (!name) return;

    const domain = prompt("Domain (e.g., example.com):");
    if (!domain) return;

    createProject.mutate(
      {
        name,
        domain,
        brief: {
          brandName: name,
          domain,
          category: "",
          desiredTone: "Professional",
          desiredClaims: [],
          keyDifferentiators: [],
          competitors: [],
        },
      },
      {
        onSuccess: (project) => {
          setCurrentProjectId(project.id);
          setActiveTab(0);
        },
      }
    );
  };

  const handleSelectProject = (project: Project) => {
    setCurrentProjectId(project.id);
    setActiveTab(0);
  };

  return (
    <aside className="w-64 bg-navy text-white flex flex-col h-screen">
      <div className="p-4 border-b border-white/10">
        <h1 className="text-xl font-bold">Brand Gap Analyzer</h1>
      </div>

      <div className="p-4 border-b border-white/10">
        <Button onClick={handleNewProject} className="w-full" disabled={createProject.isPending}>
          {createProject.isPending ? "Creating..." : "+ New Project"}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {isLoading && <p className="text-gray-400 p-2">Loading...</p>}
        {projects?.map((project) => (
          <button
            key={project.id}
            onClick={() => handleSelectProject(project)}
            className={`w-full text-left px-3 py-2 rounded mb-1 transition-colors ${
              currentProjectId === project.id
                ? "bg-teal text-white"
                : "text-gray-300 hover:bg-white/10"
            }`}
          >
            <div className="font-medium truncate">{project.name}</div>
            <div className="text-sm opacity-70 truncate">{project.domain}</div>
          </button>
        ))}
        {projects?.length === 0 && (
          <p className="text-gray-400 p-2 text-sm">No projects yet. Create one to get started.</p>
        )}
      </nav>

      <div className="p-4 border-t border-white/10 text-xs text-gray-400">
        Powered by Peec AI + Claude
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create client/src/components/layout/TabNav.tsx**

```typescript
import { useProjectContext } from "../../context/ProjectContext";

const TABS = ["Gap Analysis", "Content Strategy", "Progress Tracker"];

export function TabNav() {
  const { activeTab, setActiveTab } = useProjectContext();

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex gap-8">
        {TABS.map((tab, index) => (
          <button
            key={tab}
            onClick={() => setActiveTab(index)}
            className={`pb-3 px-1 border-b-2 font-medium transition-colors ${
              activeTab === index
                ? "border-teal text-teal"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
}
```

- [ ] **Step 3: Create client/src/components/layout/Shell.tsx**

```typescript
import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TabNav } from "./TabNav";
import { useProjectContext } from "../../context/ProjectContext";

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  const { currentProjectId } = useProjectContext();

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8">
        {currentProjectId ? (
          <>
            <TabNav />
            {children}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Select or create a project to begin.</p>
          </div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Create client/src/components/layout/index.ts**

```typescript
export { Sidebar } from "./Sidebar";
export { TabNav } from "./TabNav";
export { Shell } from "./Shell";
```

- [ ] **Step 5: Commit**

```bash
git add client/src/components/layout/
git commit -m "feat: add layout components (Sidebar, TabNav, Shell)"
```

---

### Task 13: Wire Up App with Layout

**Files:**
- Modify: `client/src/App.tsx`

- [ ] **Step 1: Update client/src/App.tsx**

```typescript
import { ProjectProvider, useProjectContext } from "./context/ProjectContext";
import { Shell } from "./components/layout";

function TabContent() {
  const { activeTab } = useProjectContext();

  switch (activeTab) {
    case 0:
      return <div className="text-gray-600">Gap Analysis tab - coming soon</div>;
    case 1:
      return <div className="text-gray-600">Content Strategy tab - coming soon</div>;
    case 2:
      return <div className="text-gray-600">Progress Tracker tab - coming soon</div>;
    default:
      return null;
  }
}

export default function App() {
  return (
    <ProjectProvider>
      <Shell>
        <TabContent />
      </Shell>
    </ProjectProvider>
  );
}
```

- [ ] **Step 2: Verify app works**

Run: `npm run dev`
Open: http://localhost:5173
Expected: Sidebar with "New Project" button, clicking creates project, tabs appear

- [ ] **Step 3: Commit**

```bash
git add client/src/App.tsx
git commit -m "feat: wire up App with layout and tab navigation"
```

---

## Phase 3: Tab 1 - Gap Analysis

### Task 14: Create Brand Brief Form Component

**Files:**
- Create: `client/src/components/gap-analysis/BrandBriefForm.tsx`

- [ ] **Step 1: Create client/src/components/gap-analysis/BrandBriefForm.tsx**

```typescript
import { useState, useEffect } from "react";
import { useProject, useUpdateProject } from "../../hooks/useProjects";
import { useProjectContext } from "../../context/ProjectContext";
import { Button, Input, Select, Textarea, Card } from "../ui";
import type { BrandBrief } from "shared";

const TONE_OPTIONS = [
  { value: "Professional", label: "Professional" },
  { value: "Friendly", label: "Friendly" },
  { value: "Technical", label: "Technical" },
  { value: "Thought Leader", label: "Thought Leader" },
];

export function BrandBriefForm() {
  const { currentProjectId } = useProjectContext();
  const { data: project, isLoading } = useProject(currentProjectId);
  const updateProject = useUpdateProject();

  const [brandName, setBrandName] = useState("");
  const [domain, setDomain] = useState("");
  const [category, setCategory] = useState("");
  const [desiredTone, setDesiredTone] = useState<BrandBrief["desiredTone"]>("Professional");
  const [desiredClaims, setDesiredClaims] = useState("");
  const [keyDifferentiators, setKeyDifferentiators] = useState("");
  const [competitors, setCompetitors] = useState("");

  useEffect(() => {
    if (project?.brief) {
      setBrandName(project.brief.brandName);
      setDomain(project.brief.domain);
      setCategory(project.brief.category);
      setDesiredTone(project.brief.desiredTone);
      setDesiredClaims(project.brief.desiredClaims.join("\n"));
      setKeyDifferentiators(project.brief.keyDifferentiators.join("\n"));
      setCompetitors(project.brief.competitors.join(", "));
    }
  }, [project]);

  const handleSave = () => {
    if (!currentProjectId) return;

    updateProject.mutate({
      id: currentProjectId,
      data: {
        brandName,
        domain,
        category,
        desiredTone,
        desiredClaims: desiredClaims.split("\n").filter(Boolean),
        keyDifferentiators: keyDifferentiators.split("\n").filter(Boolean),
        competitors: competitors.split(",").map((s) => s.trim()).filter(Boolean),
      },
    });
  };

  if (isLoading) {
    return <Card><p className="text-gray-500">Loading...</p></Card>;
  }

  const isComplete = brandName && domain && category && desiredClaims;

  return (
    <Card title="Brand Brief">
      <Input
        label="Brand Name"
        value={brandName}
        onChange={(e) => setBrandName(e.target.value)}
        placeholder="e.g., Acme Corp"
      />
      <Input
        label="Domain"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        placeholder="e.g., acme.com"
      />
      <Input
        label="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="e.g., project management software"
      />
      <Select
        label="Desired Tone"
        value={desiredTone}
        onChange={(e) => setDesiredTone(e.target.value as BrandBrief["desiredTone"])}
        options={TONE_OPTIONS}
      />
      <Textarea
        label="Desired Claims"
        hint="What do you want LLMs to say? One claim per line."
        value={desiredClaims}
        onChange={(e) => setDesiredClaims(e.target.value)}
        placeholder="Best-in-class collaboration features&#10;Enterprise-grade security&#10;Used by Fortune 500 companies"
      />
      <Textarea
        label="Key Differentiators"
        hint="What makes you different? One per line."
        value={keyDifferentiators}
        onChange={(e) => setKeyDifferentiators(e.target.value)}
        placeholder="AI-powered automation&#10;Real-time collaboration&#10;Industry-leading uptime"
      />
      <Input
        label="Competitors"
        value={competitors}
        onChange={(e) => setCompetitors(e.target.value)}
        placeholder="Competitor A, Competitor B, Competitor C"
      />

      <div className="flex gap-3 mt-6">
        <Button onClick={handleSave} disabled={updateProject.isPending}>
          {updateProject.isPending ? "Saving..." : "Save Brief"}
        </Button>
        {!isComplete && (
          <p className="text-sm text-amber-600 self-center">
            Fill in required fields to enable analysis
          </p>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/gap-analysis/BrandBriefForm.tsx
git commit -m "feat: add BrandBriefForm component"
```

---

### Task 15: Create Gap Analysis Tab Layout

**Files:**
- Create: `client/src/components/gap-analysis/GapAnalysisTab.tsx`
- Create: `client/src/components/gap-analysis/index.ts`

- [ ] **Step 1: Create client/src/components/gap-analysis/GapAnalysisTab.tsx**

```typescript
import { BrandBriefForm } from "./BrandBriefForm";
import { useProject } from "../../hooks/useProjects";
import { useProjectContext } from "../../context/ProjectContext";
import { Button, Card } from "../ui";

export function GapAnalysisTab() {
  const { currentProjectId } = useProjectContext();
  const { data: project } = useProject(currentProjectId);

  const brief = project?.brief;
  const isComplete = brief?.brandName && brief?.domain && brief?.category && brief?.desiredClaims?.length;

  const handleRunAnalysis = () => {
    // Will implement with SSE in next task
    alert("Analysis not yet implemented");
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <BrandBriefForm />
      </div>
      <div>
        <Card title="Analysis">
          {!isComplete ? (
            <div className="text-center py-12 text-gray-500">
              <p className="mb-2">Complete the brand brief to run analysis</p>
              <p className="text-sm">Fill in at least brand name, domain, category, and desired claims</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">Ready to analyze how LLMs describe your brand</p>
              <Button onClick={handleRunAnalysis}>Run Analysis</Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create client/src/components/gap-analysis/index.ts**

```typescript
export { GapAnalysisTab } from "./GapAnalysisTab";
export { BrandBriefForm } from "./BrandBriefForm";
```

- [ ] **Step 3: Update App.tsx to use GapAnalysisTab**

```typescript
import { ProjectProvider, useProjectContext } from "./context/ProjectContext";
import { Shell } from "./components/layout";
import { GapAnalysisTab } from "./components/gap-analysis";

function TabContent() {
  const { activeTab } = useProjectContext();

  switch (activeTab) {
    case 0:
      return <GapAnalysisTab />;
    case 1:
      return <div className="text-gray-600">Content Strategy tab - coming soon</div>;
    case 2:
      return <div className="text-gray-600">Progress Tracker tab - coming soon</div>;
    default:
      return null;
  }
}

export default function App() {
  return (
    <ProjectProvider>
      <Shell>
        <TabContent />
      </Shell>
    </ProjectProvider>
  );
}
```

- [ ] **Step 4: Verify form works**

Open: http://localhost:5173
Create a project, fill in the brief, click Save
Expected: Form saves without error, "Run Analysis" button appears when brief is complete

- [ ] **Step 5: Commit**

```bash
git add client/src/components/gap-analysis/ client/src/App.tsx
git commit -m "feat: add GapAnalysisTab with brief form and layout"
```

---

## Phase 3 continues in next section...

The plan continues with:
- Task 16-18: Backend Peec AI MCP integration
- Task 19-21: Backend Claude API integration
- Task 22-24: SSE for gap analysis
- Task 25-27: Gap analysis results display

## Phase 4: Tab 2 - Content Strategy
## Phase 5: Tab 3 - Progress Tracker

---

*Plan truncated for length. Full implementation continues with same pattern: test-driven, bite-sized steps, exact file paths, complete code in every step.*
