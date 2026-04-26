# Sentinel — Unified Brand & Reputation Intelligence Dashboard

A single dashboard combining three feature streams:

- **Sentinel pages** (Dashboard, Heat Map, Threat Center, AI Content, Competitors,
  Action Queue, Crawler Config, Settings) — backed by a FastAPI service.
- **Brand Analyzer** (Gap Analysis, Content Strategy) — backed by an Express +
  Claude service.
- **Peec AI Agents** (Tracking Prompts, Sentiment Flip, Source Infiltration) —
  backed by a FastAPI service.

## Layout

```
frontend/                React + Vite frontend (port 5173)
backend/
  shared/                Shared TypeScript types
  analyzer/              Express + Claude analyzer backend (port 3001)
  sentinel/              FastAPI Sentinel backend          (port 8000)
  agents/                FastAPI Peec Agents backend       (port 8001)
```

## One-shot setup

```bash
make install
```

Create the `.env` files (see `backend/sentinel/.env.example` and the keys
required by `backend/agents/`: `ANTHROPIC_API_KEY`, `PEEC_API_KEY`).

## Run everything

```bash
make dev
```

The Vite dev server proxies API prefixes to the right backend:

| Path prefix     | Target              |
|-----------------|---------------------|
| `/api/dashboard`, `/threats`, `/heatmap`, `/ai-content`, `/competitors`, `/actions`, `/crawlers`, `/alerts`, `/settings` | `:8000` (Sentinel) |
| `/agents-api/*` (rewrites to `/`) | `:8001` (Agents) |
| `/api/projects`, `/snapshots`, … | `:3001` (Analyzer) |

App: http://localhost:5173
