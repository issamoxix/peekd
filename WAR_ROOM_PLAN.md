# Competitive War Room with Live Alerts

## Context

Build a daily-running competitive monitoring system on top of Peec AI's brand-tracking data. Each morning the system pulls fresh brand-report data for the user's brand and competitors, diffs it against yesterday, and surfaces material shifts (sentiment drops, visibility falls, position changes, competitor spikes) as actionable alerts — both to a Slack channel and to a Next.js "War Room" dashboard.

**Why now:** the repo is a clean slate (`backend/` is a stub FastAPI app, `big-hack/` is a fresh Next.js scaffold) and Peec AI's MCP/REST surface already exposes everything needed (`POST /customer/v1/reports/brands`, plus `get_actions` for suggested responses). The hackathon win is turning Peec's on-demand metrics into a proactive monitoring loop — Peec's docs explicitly note alerting/scheduling is *not* an out-of-the-box capability.

**Outcome:** a daily scheduled job that produces ranked alerts with engine/topic context and a recommended next action, delivered to Slack and visible in a dashboard.

## Architecture

```
┌──────────────────────┐    daily cron     ┌──────────────────────┐
│  APScheduler (08:00 UTC) ─────────────► │  run_war_room()      │
└──────────────────────┘                   │  - fetch today       │
                                           │  - fetch yesterday   │
                                           │  - persist snapshots │
                                           │  - diff + threshold  │
                                           │  - get_actions()     │
                                           │  - write alerts      │
                                           │  - post Slack        │
                                           └─────┬────────────────┘
                                                 │
                            SQLite ◄─────────────┤
                            (snapshots, alerts)  │
                                                 ▼
                                       Next.js /war-room
                                       reads via REST
```

External: Peec REST API (`X-API-Key` header) → `https://api.peec.ai/customer/v1`.

## Backend changes — `backend/`

### New deps (add to `requirements.txt`)
- `httpx` — Peec API + Slack webhook client
- `apscheduler` — daily cron (AsyncIOScheduler)
- `python-dotenv` — load `.env`
- `pydantic-settings` — typed config

(Keep stdlib `sqlite3` for storage; no ORM needed for this scope.)

### New files

**`backend/config.py`** — Pydantic `Settings` reading env vars: `PEEC_API_KEY`, `PEEC_PROJECT_ID`, `SLACK_WEBHOOK_URL`, `OWN_BRAND_ID`, `WAR_ROOM_CRON_HOUR` (default 8 UTC), thresholds (`SENTIMENT_DROP=5`, `VISIBILITY_DROP_PP=5`, `POSITION_DELTA=1`, `COMPETITOR_VIS_SPIKE_PP=10`), and `DB_PATH` (default `./warroom.db`).

**`backend/services/peec_client.py`** — thin async client around Peec REST. Methods:
- `get_brands_report(start_date, end_date, dimensions=None, filters=None)` → `POST /reports/brands` with `X-API-Key`
- `list_brands()` → `GET /brands`
- `get_actions(start_date, end_date, scope="overview", filters=None)` → `POST /actions` (per Peec MCP `get_actions` shape; check OpenAPI at `https://api.peec.ai/customer/v1/openapi/json` for the exact REST path during implementation)

Each call returns the raw `data: [...]` list. Pagination: pass `limit=10000` to fetch in one shot for typical project sizes.

**`backend/services/storage.py`** — SQLite layer. Schema:
```sql
CREATE TABLE snapshots(
  date TEXT, brand_id TEXT, brand_name TEXT,
  dimension_type TEXT,        -- 'overall' | 'model' | 'topic'
  dimension_id   TEXT,        -- nullable for 'overall'
  visibility REAL, sentiment REAL, position REAL,
  share_of_voice REAL, mention_count INTEGER,
  PRIMARY KEY(date, brand_id, dimension_type, dimension_id)
);
CREATE TABLE alerts(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT, alert_type TEXT, severity TEXT,
  brand_id TEXT, brand_name TEXT,
  dimension_type TEXT, dimension_id TEXT, dimension_label TEXT,
  metric TEXT, prev_value REAL, curr_value REAL, delta REAL,
  message TEXT, suggested_actions_json TEXT
);
```

**`backend/services/diff.py`** — pure functions:
- `compute_deltas(today, yesterday) -> list[Delta]` — joins on `(brand_id, dimension_type, dimension_id)`
- `apply_thresholds(deltas, settings, own_brand_id) -> list[Alert]` — emits one alert per breached rule:
  - `OWN_SENTIMENT_DROP` if own brand sentiment Δ ≤ −5
  - `OWN_VISIBILITY_DROP` if own brand visibility Δ ≤ −0.05 (5 pp)
  - `POSITION_SHIFT` if own brand position Δ ≥ +1 OR any competitor's Δ ≤ −1
  - `COMPETITOR_VIS_SPIKE` if competitor visibility Δ ≥ +0.10
- Severity: `critical` if breach is ≥2× threshold, else `warning`.

**`backend/services/notifier.py`** — `post_slack(alerts, summary)` formats Slack Block Kit message: header with date + counts, then one section per alert showing brand, metric, prev → curr (with delta), engine/topic context, and the top 1–2 suggested actions from `get_actions`. Uses incoming-webhook POST.

**`backend/jobs/war_room.py`** — orchestrator:
1. Fetch overall report for `today` and `yesterday`.
2. Fetch by-engine (`dimensions=["model_id"]`) and by-topic (`dimensions=["topic_id"]`) for both days.
3. Persist all rows to `snapshots`.
4. Compute deltas + apply thresholds for each dimension; collapse duplicates so an "overall" alert is preferred over its engine/topic siblings unless those are materially worse — attach the worst engine/topic to the overall alert as context.
5. For each alert, call `get_actions(scope="overview")` filtered by the relevant `model_id`/`topic_id` and pick the top-`opportunity_score` recommendation as `suggested_actions_json`.
6. Write alerts to DB; if any alerts, POST to Slack.

**`backend/scheduler.py`** — `AsyncIOScheduler` with a cron trigger on `WAR_ROOM_CRON_HOUR`. Started in FastAPI's lifespan handler.

### Edits

**`backend/main.py`** — wire the lifespan-managed scheduler and mount routes:
- `GET /api/brands` → list of tracked brands (cached daily)
- `GET /api/snapshots?date=YYYY-MM-DD&brand_id=…` → snapshot rows for the dashboard tables
- `GET /api/alerts?limit=50` → recent alerts (newest first)
- `POST /api/run-now` → triggers `run_war_room()` immediately (manual button on dashboard)

CORS is already configured — keep it as-is.

## Frontend changes — `big-hack/`

### New files

**`big-hack/src/lib/api.ts`** — typed fetch client; `BACKEND_URL` from `NEXT_PUBLIC_BACKEND_URL` (default `http://localhost:8000`).

**`big-hack/src/app/war-room/page.tsx`** — server component that fetches `/api/alerts` and `/api/snapshots` and renders:
- Top strip: own brand's visibility / sentiment / position / SoV with day-over-day delta chips (green up / red down).
- Competitor table: same metrics + delta per competitor, sortable.
- Alert feed: stacked cards, color-coded by severity, each showing metric movement, engine/topic context, and the suggested action text.
- "Run now" button → client component calling `POST /api/run-now`, then `router.refresh()`.

**`big-hack/src/app/war-room/RunNowButton.tsx`** — small `"use client"` component for the manual trigger.

(No state library, no chart lib — keep it Tailwind + plain components for hackathon speed. If a sparkline is wanted, add `recharts` later.)

## Critical files to modify
- `backend/main.py` — wire scheduler + routes
- `backend/requirements.txt` — add deps
- `big-hack/src/app/war-room/page.tsx` — new dashboard

## Reusable / external references
- Peec REST: `POST /customer/v1/reports/brands` (auth via `X-API-Key`); response in `data[]` with `brand{id,name}`, `visibility`, `sentiment` (0–100), `position`, `share_of_voice`, `mention_count`. Source: https://docs.peec.ai/api-reference/reports/get-brands-report.md
- Peec MCP tools we model after: `get_brand_report`, `get_actions` (`scope=overview` first, drill into `owned/editorial/reference/ugc`). Source: https://docs.peec.ai/mcp/tools.md
- OpenAPI spec for exact REST shapes: `https://api.peec.ai/customer/v1/openapi/json`
- FastAPI's existing CORS middleware at `backend/main.py` — reuse, don't reconfigure.

## Open question to resolve at impl time
Peec REST API access is documented as Enterprise-tier. If the user's API key works against `https://api.peec.ai/customer/v1`, we proceed as planned. If not, fall back to running the same logic via the MCP tools through a Claude Code `/schedule` prompt and have the agent POST results to the FastAPI backend — same DB schema, same dashboard.

## Verification

1. **Unit-level**
   - `pytest backend/tests/test_diff.py` — feed crafted snapshot pairs covering each threshold (own sentiment drop, own visibility drop, position shift both directions, competitor spike) and assert exactly the expected `Alert` set is emitted, including severity escalation at 2× threshold.

2. **Live integration**
   - Set `PEEC_API_KEY`, `PEEC_PROJECT_ID`, `OWN_BRAND_ID`, `SLACK_WEBHOOK_URL` in `backend/.env`.
   - `uvicorn backend.main:app --reload`
   - `curl -X POST localhost:8000/api/run-now` — verify: snapshots rows appear in `warroom.db`, alerts row(s) written if thresholds breached, Slack message lands with correct formatting.
   - Manually edit `snapshots` for "yesterday" to fabricate a sentiment drop, hit `/api/run-now` again — confirm alert + Slack message.

3. **Dashboard**
   - `cd big-hack && npm run dev`, open `http://localhost:3000/war-room`.
   - Confirm snapshot table renders today's data, deltas have correct sign/color, alert feed lists DB rows newest-first, "Run now" triggers a refresh.

4. **Scheduled run**
   - Temporarily set `WAR_ROOM_CRON_HOUR` to the next minute (or use a `seconds=*/30` trigger), verify the scheduler fires `run_war_room()` and produces the same end-state as the manual trigger.
