# Peekd

Peekd is a hackathon build for the Peec AI track focused on helping a smaller brand win distribution against larger competitors.

This repository now contains two parts:

- `backend/`: Python agents and Peec-oriented utilities for prompt recommendation, source infiltration, and sentiment-oriented workflows.
- `frontend/`: a Next.js app for the **Adblume Query Gap + Action Engine**.

## What The Frontend Does

The frontend takes a measured Peec snapshot for Adblume and turns it into an execution workflow:

1. Detect query gaps where competitors appear in AI answers and Adblume does not.
2. Score each gap by intent, brand fit, competitor pressure, and measured visibility gap.
3. Let a human approve or reject the opportunity.
4. Generate an action plan and a ready-to-publish execution brief.
5. Export a PDF or Markdown implementation plan for the real Adblume website.

Primary product loop:

`Detect -> Validate -> Act -> Measure`

## Demo Focus

This build is optimized for the Peec AI hackathon demo, not as a production SaaS.

The current frontend uses a measured Peec snapshot captured for Adblume on April 25, 2026. It demonstrates:

- measured visibility gaps
- competitor comparison
- brand-fit review
- action plan generation
- implementation brief export

The strongest current example is the gap:

`Best jewelry product photography studio for ecommerce brands`

For that gap, the app produces a concrete service-page execution brief designed to be implemented on `adblume.com`.

## Run The Frontend

From the repo root:

```bash
cd frontend
npm install
npm run dev
```

Open:

`http://localhost:3000`

Useful commands:

```bash
npm run lint
npm run build
```

## Frontend Structure

- `frontend/app/page.tsx`: dashboard UI and tab workflow
- `frontend/data/adblume-snapshot.ts`: measured Peec snapshot fixture
- `frontend/lib/gaps.ts`: classification and scoring logic
- `frontend/lib/actions.ts`: action-plan generation and export logic
- `frontend/public/adblume-implementation-plan.pdf`: downloadable implementation brief
- `frontend/public/adblume-implementation-plan.md`: editable implementation brief

## Run The Backend

From the repo root:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

Backend files currently present:

- `main.py`
- `peec_client.py`
- `prompt_recommender.py`
- `sentiment_flip_agent.py`
- `source_infiltration_agent.py`

## Hackathon Positioning

This project is aimed at the Peec AI challenge:

- use Peec data to identify where a smaller brand is missing from LLM answers
- prioritize the most valuable gaps
- recommend the next actions that should close those gaps
- make the output implementable by a real marketing or product team

Instead of stopping at analytics, this repo pushes the workflow into execution by generating implementation-ready assets.

## Status

Implemented on branch:

`croesch-gap-analysis`

Current PR:

`issamoxix/peekd#2`
