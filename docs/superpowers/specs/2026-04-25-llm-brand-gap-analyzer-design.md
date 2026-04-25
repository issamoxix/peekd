# LLM Brand Gap Analyzer — Design Spec

**Date:** 2026-04-25
**Status:** Approved
**Based on:** Product spec v1.0 for Antigravity

---

## Overview

A React application that diagnoses how LLMs describe a brand, generates content strategy to shift those descriptions, and tracks progress over time via Peec AI.

**Core decisions made during design:**
- Standalone React app (not Claude artifact)
- Simple Express backend proxy for API calls
- Direct MCP calls to Peec AI (not Claude-driven)
- SQLite for persistence
- SSE for long-running request progress

---

## 1. Project Structure

```
llm-brand-gap-analyzer/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/           # Shell, Sidebar, TabNav
│   │   │   ├── gap-analysis/     # Tab 1 components
│   │   │   ├── content-strategy/ # Tab 2 components
│   │   │   ├── progress/         # Tab 3 components
│   │   │   └── ui/               # Reusable: Button, Card, Input, etc.
│   │   ├── hooks/                # useProjects, useGapAnalysis, etc.
│   │   ├── services/             # api.ts (calls to backend)
│   │   ├── types/                # Re-exports from shared
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── package.json
├── server/
│   ├── src/
│   │   ├── routes/               # projects, analysis, strategy, progress
│   │   ├── services/
│   │   │   ├── peec.ts           # Direct MCP calls to Peec AI
│   │   │   └── claude.ts         # Anthropic API calls
│   │   ├── db/
│   │   │   ├── schema.sql        # SQLite schema
│   │   │   └── index.ts          # Database connection + queries
│   │   └── index.ts              # Express app
│   └── package.json
├── shared/
│   ├── types.ts                  # BrandBrief, GapAnalysis, Strategy, etc.
│   └── package.json
├── package.json                  # Root: scripts to run both
└── .env.example                  # ANTHROPIC_API_KEY, PEEC_API_KEY
```

**Key points:**
- Frontend knows nothing about Peec MCP or Anthropic API — just calls backend endpoints
- Backend handles all external API calls and database operations
- Shared types ensure frontend and backend stay in sync

---

## 2. Backend API Routes

```
POST /api/projects                    # Create new project with brand brief
GET  /api/projects                    # List all projects
GET  /api/projects/:id                # Get project details + brief
PUT  /api/projects/:id                # Update brand brief
DELETE /api/projects/:id              # Delete project and all related data

POST /api/projects/:id/analysis       # Run gap analysis (calls Peec + Claude)
GET  /api/projects/:id/analysis       # Get latest gap analysis
GET  /api/projects/:id/analysis/history  # List past analyses

POST /api/projects/:id/strategy       # Generate content strategy (calls Claude)
GET  /api/projects/:id/strategy       # Get current strategy
PUT  /api/projects/:id/quick-wins     # Update quick-wins checklist state

POST /api/projects/:id/snapshots      # Create weekly snapshot (calls Peec + Claude)
GET  /api/projects/:id/snapshots      # List all snapshots for progress chart
GET  /api/projects/:id/snapshots/baseline  # Get baseline snapshot

GET  /api/auth/peec                   # Initiate Peec OAuth flow
GET  /api/auth/peec/callback          # OAuth callback, exchanges code for token
GET  /api/auth/status                 # Check if Peec is authenticated
POST /api/auth/peec/disconnect        # Clear stored tokens
```

**Flow for "Run Analysis" button:**
1. Frontend calls `POST /api/projects/:id/analysis`
2. Backend calls Peec MCP tools: `get_brand_report`, `get_domain_report`, `list_chats`, etc.
3. Backend sends Peec data + brand brief to Claude for gap synthesis
4. Backend stores result in SQLite, returns to frontend

**Long-running requests:**
Gap analysis and strategy generation use Server-Sent Events (SSE) for real-time progress:
- Frontend calls `POST /api/projects/:id/analysis` with `Accept: text/event-stream`
- Backend opens SSE connection, sends progress events
- Final event contains result or error

**SSE Event Format:**
```typescript
// Progress event
{ type: "progress", step: "fetching_brand_data", status: "in_progress" | "complete" | "error", message?: string }

// Steps for gap analysis: "fetching_brand_report", "fetching_domain_report", "fetching_chats", "synthesizing_analysis"
// Steps for strategy: "generating_articles", "generating_schemas", "generating_pr_angles", "generating_quick_wins"

// Completion event
{ type: "complete", data: GapAnalysis | Strategy }

// Error event
{ type: "error", code: string, message: string }
```

---

## 3. Database Schema

```sql
-- Projects table
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Brand briefs (one per project)
CREATE TABLE brand_briefs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  category TEXT NOT NULL,
  desired_tone TEXT NOT NULL,          -- Professional/Friendly/Technical/Thought Leader
  desired_claims TEXT NOT NULL,         -- JSON array of strings
  key_differentiators TEXT NOT NULL,    -- JSON array of strings
  competitors TEXT NOT NULL,            -- JSON array of strings
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Gap analyses (multiple per project, timestamped)
CREATE TABLE gap_analyses (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  peec_data TEXT NOT NULL,              -- Raw Peec MCP response (JSON)
  analysis TEXT NOT NULL,               -- Claude's gap analysis (JSON)
  created_at TEXT NOT NULL
);

-- Content strategies (one active per project)
CREATE TABLE strategies (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  gap_analysis_id TEXT REFERENCES gap_analyses(id),
  content TEXT NOT NULL,                -- Full strategy JSON
  quick_wins_state TEXT NOT NULL,       -- JSON: { itemId: boolean }
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Progress snapshots (weekly)
CREATE TABLE snapshots (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  is_baseline INTEGER NOT NULL DEFAULT 0,
  week_key TEXT NOT NULL,               -- YYYY-WW format
  peec_data TEXT NOT NULL,              -- Raw Peec data (JSON)
  delta_analysis TEXT,                  -- Claude's comparison (JSON), null for baseline
  created_at TEXT NOT NULL,
  UNIQUE(project_id, week_key)
);

-- App settings (OAuth tokens, etc.)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

**Notes:**
- JSON fields stored as TEXT (SQLite doesn't have native JSON type, but supports JSON functions)
- Cascade deletes ensure cleanup when a project is removed
- `week_key` prevents duplicate snapshots in the same week

---

## 4. Frontend State & Data Flow

**State Management: React Query + Context**

```
React Query (server state)         Context (UI state)
├── useProjects()                  ├── ProjectContext
├── useProject(id)                 │   └── currentProjectId
├── useGapAnalysis(projectId)      ├── TabContext
├── useStrategy(projectId)         │   └── activeTab (0, 1, 2)
├── useSnapshots(projectId)        └── SSEContext
└── mutations:                         └── activeJobs, progress
    ├── useCreateProject()
    ├── useRunAnalysis()
    ├── useGenerateStrategy()
    └── useCreateSnapshot()
```

**SSE Integration:**
```typescript
// When user clicks "Run Analysis"
const { mutate: runAnalysis } = useRunAnalysis();

runAnalysis(projectId, {
  onSuccess: (jobId) => {
    // SSE connection opened automatically
    // Progress updates flow through SSEContext
    // UI shows: "Fetching brand visibility... ✓"
    //           "Fetching sentiment data... (in progress)"
    //           "Running Claude analysis..."
  }
});
```

**Tab Data Dependencies:**
- Tab 1 (Gap Analysis): Requires brand brief filled → enables "Run Analysis"
- Tab 2 (Content Strategy): Requires gap analysis complete → auto-generates or manual trigger
- Tab 3 (Progress): Requires baseline snapshot (created after first analysis)

**Component Hierarchy:**
```
App
└── ProjectProvider
    └── Shell
        ├── Sidebar (project selector, new project)
        └── MainContent
            ├── TabNav
            └── TabPanels
                ├── GapAnalysisTab
                │   ├── BrandBriefForm
                │   ├── AnalysisProgress (SSE-driven)
                │   └── GapResults
                ├── ContentStrategyTab
                │   ├── ArticleCards
                │   ├── SchemaCards
                │   ├── PRAngleCards
                │   ├── QuickWinsChecklist
                │   └── ExportButton
                └── ProgressTab
                    ├── TrendChart (recharts)
                    ├── DeltaCards
                    └── WeeklyLog
```

---

## 5. Peec AI MCP Integration

**Connection Method:**
The backend connects to Peec AI's MCP server using the official MCP client SDK (`@modelcontextprotocol/sdk`).

```typescript
// server/src/services/peec.ts
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const transport = new SSEClientTransport(
  new URL("https://api.peec.ai/mcp/sse")
);
const client = new Client({ name: "brand-gap-analyzer", version: "1.0.0" });
await client.connect(transport);
```

**Peec MCP Tools Used:**

| Tool | Purpose | When Called |
|------|---------|-------------|
| `list_projects` | Get user's Peec projects | On app load, project selector |
| `get_brand_report` | Visibility, sentiment, citations | Gap analysis, weekly snapshot |
| `get_domain_report` | Which domains get cited | Gap analysis |
| `list_chats` | Recent AI conversations about brand | Gap analysis (full context) |
| `get_chat` | Individual chat content | Drill-down if needed |
| `list_search_queries` | What queries trigger brand mentions | Gap analysis |

**Authentication:**
Peec AI uses OAuth. On first connection:
1. Backend initiates OAuth flow via `GET /api/auth/peec`
2. User redirected to Peec consent page in browser
3. Peec redirects back to `GET /api/auth/peec/callback` with auth code
4. Backend exchanges code for token, stores in SQLite `settings` table
5. Subsequent calls use stored token (auto-refresh if expired)

**Settings table for auth:**
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
-- Keys: peec_access_token, peec_refresh_token, peec_token_expires_at
```

**Error Handling:**
- Token expired → Trigger re-auth flow, notify frontend
- Peec API down → Return partial results, show warning
- Rate limited → Exponential backoff, queue requests

---

## 6. Claude API Integration

**Service Layer:**
```typescript
// server/src/services/claude.ts
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic(); // Uses ANTHROPIC_API_KEY env var

export async function synthesizeGapAnalysis(
  brandBrief: BrandBrief,
  peecData: PeecData
): Promise<GapAnalysis> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPTS.gapAnalysis,
    messages: [{ role: "user", content: formatGapAnalysisPrompt(brandBrief, peecData) }]
  });
  return parseJsonResponse(response);
}
```

**Three Claude Calls:**

| Function | Input | Output | Max Tokens |
|----------|-------|--------|------------|
| `synthesizeGapAnalysis` | Brand brief + Peec data | Gap analysis JSON | 4096 |
| `generateStrategy` | Gap analysis + brand brief | Content strategy JSON | 8192 |
| `compareSnapshots` | Baseline + current snapshot | Delta analysis JSON | 2048 |

**Prompts stored in:**
```
server/src/prompts/
├── gap-analysis.ts      # System + user prompt templates
├── content-strategy.ts
└── snapshot-comparison.ts
```

**Response Parsing:**
```typescript
function parseJsonResponse(response: Message): unknown {
  const text = response.content[0].type === "text"
    ? response.content[0].text
    : "";
  const clean = text.replace(/```json\n?|```\n?/g, "").trim();
  return JSON.parse(clean);
}
```

**Error Handling:**
- Invalid JSON → Retry once with "Return valid JSON only" appended
- Rate limit → Queue with backoff, SSE sends "waiting" status
- API error → Store partial results, surface error to user

---

## 7. Error Handling, Testing & Dev Setup

**Error Handling Strategy:**

| Layer | Approach |
|-------|----------|
| Frontend | React Error Boundaries per tab, toast notifications for API errors |
| API Routes | Try/catch with consistent error response: `{ error: string, code: string }` |
| Peec MCP | Graceful degradation — show partial data with warning banner |
| Claude API | Retry logic for transient failures, structured error for parse failures |
| Database | Transactions for multi-table writes, constraint violations return 400 |

**SSE Error Recovery:**
```typescript
// Frontend reconnects automatically on disconnect
eventSource.onerror = () => {
  setTimeout(() => reconnect(), 3000);
};
```

**Testing Approach:**

| What | Tool | Coverage |
|------|------|----------|
| Backend unit tests | Vitest | Services, prompt formatting, JSON parsing |
| API integration tests | Vitest + Supertest | Routes with mocked Peec/Claude |
| Frontend components | Vitest + Testing Library | Form validation, state transitions |
| E2E (optional, v2) | Playwright | Critical flows |

**Dev Setup:**
```bash
# Install all dependencies
npm install

# Start both frontend + backend
npm run dev
# → client on localhost:5173
# → server on localhost:3001
# → Vite proxies /api/* to server

# Environment
cp .env.example .env
# Add: ANTHROPIC_API_KEY, PEEC_OAUTH_TOKEN (or run OAuth flow)
```

**Production Build:**
```bash
npm run build        # Builds client + compiles server
npm run start        # Runs server, serves static client from dist
```

---

## 8. UI Design Guidelines

From product spec:
- **Color system:** Dark navy sidebar (`#0F172A`) + white content area + accent teal (`#0D9488`)
- **Loading states:** Show per-query progress while Peec MCP is running (not a single spinner)
- **Empty states:** Each tab has a clear CTA when no data exists
- **Tone:** Professional, not playful
- **No HTML form tags:** Use React state + onClick handlers
- **Responsive:** Min width 1024px (desktop tool)

---

## 9. Out of Scope (v1)

- Writing prompts back to Peec AI (read-only MCP)
- Email/Slack notifications
- PDF export (Markdown export is sufficient)
- User authentication (single-user)
- Historical data before tool setup

---

## 10. Open Questions (from product spec)

1. **Peec plan requirement:** Should the app surface a paywall notice if MCP auth fails?
2. **Strategy regeneration:** Allow regenerating strategy without losing baseline snapshot?
3. **Multi-user:** Team sharing needed in v1?
4. **Content brief format:** Individual Markdown files per article or combined document?

*These can be deferred to implementation or addressed as they come up.*
