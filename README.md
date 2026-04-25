# peekd

Backend (FastAPI) + Frontend (Next.js).

## Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `backend/.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
PEEC_API_KEY=...
PEEC_PROJECT_ID=...   # optional default
```

Run:

```bash
uvicorn main:app --reload
```

API: http://localhost:8000

## Frontend

```bash
cd big-hack
npm install
npm run dev
```

App: http://localhost:3000
