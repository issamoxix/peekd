# Sentinel — Unified Brand & Reputation Intelligence Dashboard

A single dashboard combining three feature streams:

- **Sentinel pages** (Dashboard, Heat Map, Threat Center, AI Content, Competitors,
  Action Queue, Crawler Config, Settings) — backed by a FastAPI service.
- **Brand Analyzer** (Gap Analysis, Content Strategy) — backed by an Express +
  Claude service.
- **Agents** (Sentiment Flip, Prompt Recommender, Source Infiltration) — backed
  by a FastAPI service.

## Layout

```
client/             React + Vite frontend (port 5173)
server/             Express + Claude analyzer backend (port 3001)
sentinel-backend/   FastAPI Sentinel backend          (port 8000)
backend/            FastAPI Agents backend            (port 8001)
shared/             Shared TypeScript types
```

## One-shot setup

```bash
make install
```

Create the `.env` files (see `sentinel-backend/.env.example` and
`backend/`'s required keys: `ANTHROPIC_API_KEY`, `PEEC_API_KEY`).

## Run everything

```bash
make dev
```

The Vite dev server proxies API prefixes to the right backend:

| Path prefix     | Target              |
|-----------------|---------------------|
| `/api/dashboard`, `/threats`, `/heatmap`, `/ai-content`, `/competitors`, `/actions`, `/crawlers`, `/alerts`, `/settings` | `:8000` (Sentinel) |
| `/api/projects`, `/snapshots`, … | `:3001` (Analyzer) |

App: http://localhost:5173
