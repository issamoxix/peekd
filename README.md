# SENTINEL — AI Reputation Defense & Dominance System

**Full-stack application for monitoring and defending brand reputation across AI models**

Monitors what major AI models (ChatGPT, Perplexity, Gemini, Claude, Copilot, Grok) say about your brand, detects threats automatically, and provides actionable recommendations.

## 🏗️ Architecture

**Frontend:** React + TypeScript + Vite + Tailwind CSS + React Query
**Backend:** Python FastAPI + SQLAlchemy + SQLite
**APIs:** Peec AI (brand monitoring) + Anthropic Claude (threat analysis)

```
┌─────────────────────────────────────────────────────────┐
│                    REACT FRONTEND                        │
│  Dashboard · Threat Center · Action Queue · Crawlers    │
└────────────────────┬────────────────────────────────────┘
                     │ REST + SSE (real-time alerts)
┌────────────────────▼────────────────────────────────────┐
│                  PYTHON FASTAPI BACKEND                  │
│  Peec Client · Threat Engine · Action Engine           │
│  Claude AI Service · Background Scheduler               │
└─────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **Peec AI API Key** (get from [app.peec.ai](https://app.peec.ai))
- **Anthropic API Key** (optional, for enhanced threat detection)

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your API keys:
# PEECAI_API_KEY=your_key_here
# ANTHROPIC_API_KEY=your_key_here (optional)

# Run the server
python main.py
```

The backend will start on **http://localhost:8000**

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

The frontend will start on **http://localhost:5173**

## 📊 Features

### 1. **Real-Time Dashboard**
- Brand visibility score (0-100%)
- Sentiment tracking across AI models
- Live threat monitoring
- Trend analysis

### 2. **Threat Detection Engine**
- **Hallucinations**: Factually incorrect claims
- **Negative Framing**: True but misleading content
- **Risky Content**: Exploitable information
- **Sentiment Drops**: Score declines >10 points
- **Competitive Gaps**: Missed opportunities

### 3. **Action Queue**
- Ranked recommendations by opportunity score
- **Owned Pages**: Improve visibility of your content
- **Editorial**: Target high-value media sites
- **Reference Sites**: Get listed on authoritative sources
- **UGC Communities**: Engage on Reddit, forums

### 4. **Competitor Intelligence**
- Crisis detection (sentiment < 40)
- Visibility drop monitoring
- Opportunity identification
- Content sprint recommendations

### 5. **AI Heatmap**
- Model × prompt performance grid
- Visibility and sentiment breakdown per AI model
- Identify which models mention your brand most/least

### 6. **GEO — Generative Engine Optimization**
- AI-optimised content pages readable by LLM crawlers
- Auto-generate brand overviews, FAQ pages, and comparison pages
- Structured for retrieval by ChatGPT, Perplexity, Gemini, and others

### 7. **Crawler Configuration**
- Smart robots.txt generator
- Sitemap strategy recommendations
- Cloudflare WAF rules
- 3-tier bot management:
  - Block AI training bots
  - Allow AI retrieval bots
  - Control sensitive paths

### 8. **Background Automation**
- Scans every 2 hours
- Auto-threat detection
- Action queue refresh
- Real-time alerts (SSE)

## 🔧 API Endpoints

### Dashboard
- `GET /api/dashboard` - Overview metrics

### Threats
- `GET /api/threats` - List threats (filterable)
- `GET /api/threats/{id}` - Threat details
- `PATCH /api/threats/{id}` - Update status
- `POST /api/threats/{id}/fix` - Generate auto-fix

### Actions
- `GET /api/actions` - List action queue
- `PATCH /api/actions/{id}` - Update status

### Heatmap
- `GET /api/heatmap` - Model × prompt performance grid

### AI Content (GEO)
- `POST /api/ai-content/brand-overview` - Generate brand overview page
- `POST /api/ai-content/faq` - Generate FAQ page
- `POST /api/ai-content/comparison` - Generate competitor comparison page

### Crawlers
- `GET /api/crawlers/robots` - Get robots.txt
- `POST /api/crawlers/generate` - Generate config

### Settings
- `GET /api/settings/projects` - List Peec projects
- `POST /api/settings/configure` - Update config

### Real-Time
- `GET /api/alerts/stream` - SSE event stream

## 📁 Project Structure

```
sentinel/
├── backend/
│   ├── main.py                    # FastAPI entry point
│   ├── config.py                  # Settings & env vars
│   ├── database.py                # SQLAlchemy setup
│   ├── models.py                  # DB models
│   │
│   ├── peec/                      # Peec AI integration
│   │   ├── client.py
│   │   ├── schemas.py
│   │   └── cache.py
│   │
│   ├── engines/                   # Core logic
│   │   ├── threat_engine.py
│   │   ├── action_engine.py
│   │   ├── competitor_engine.py
│   │   ├── ai_engine.py           # GEO content engine
│   │   └── live_signals.py        # Real-time signal processing
│   │
│   ├── services/
│   │   ├── claude_service.py      # AI threat analysis
│   │   ├── ai_content_service.py  # GEO page generation
│   │   ├── scheduler.py           # Background jobs
│   │   ├── alert_service.py       # SSE broadcaster
│   │   └── crawler_config.py      # robots.txt generator
│   │
│   └── routers/                   # API endpoints
│       ├── dashboard.py
│       ├── heatmap.py
│       ├── threats.py
│       ├── actions.py
│       ├── competitors.py
│       ├── crawlers.py
│       ├── alerts.py
│       ├── ai_content.py
│       └── settings.py
│
└── frontend/
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── pages/
    │   │   ├── Dashboard.tsx
    │   │   ├── ThreatCenter.tsx
    │   │   ├── ActionQueue.tsx
    │   │   ├── Competitors.tsx
    │   │   ├── HeatMap.tsx
    │   │   ├── AIContent.tsx
    │   │   ├── CrawlerConfig.tsx
    │   │   └── Settings.tsx
    │   ├── components/
    │   │   └── layout/Sidebar.tsx
    │   └── index.css
    └── package.json
```

## 🔐 Environment Variables

### Backend (.env)

```env
# Required
PEECAI_API_KEY=your_peec_api_key

# Optional but recommended
ANTHROPIC_API_KEY=your_anthropic_key

# Security
SECRET_KEY=random_secret_key_change_me

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## 🎯 How It Works

### 1. Data Collection
- Connects to Peec AI API
- Pulls brand metrics across all AI models
- Retrieves chat conversations mentioning your brand
- Fetches domain and URL citation data

### 2. Threat Analysis
- Sends chat content to Claude AI
- Applies rule-based detection (fallback)
- Scores threats by severity (CRITICAL → LOW)
- Identifies auto-fixable issues

### 3. Opportunity Discovery
- Analyzes competitor presence
- Calculates opportunity scores
- Ranks actions by potential impact
- Groups by content type

### 4. Automated Defense
- Generates content briefs
- Creates robots.txt configurations
- Produces schema markup
- Drafts PR outreach templates

### 5. Continuous Monitoring
- Background scans every 2 hours
- Real-time alerting via SSE
- Historical trend tracking
- Sentiment drop detection

## 🧪 Testing

### Test Backend Connection
```bash
curl http://localhost:8000/
```

### Test Dashboard API
```bash
curl http://localhost:8000/api/dashboard
```

### Test Peec Connection
```bash
curl -X POST http://localhost:8000/api/settings/test-connection
```

## 📝 Configuration After Setup

1. **Navigate to the application** at http://localhost:5173
2. **If not configured**, you'll see setup instructions
3. **Add your Peec API key** in `backend/.env`
4. **Restart the backend** to load the configuration
5. **The dashboard will load** showing your brand metrics

## 🛠️ Technology Stack

### Backend
- **FastAPI** - Modern async API framework
- **SQLAlchemy** - ORM and database management
- **APScheduler** - Background task scheduling
- **Anthropic** - Claude AI for threat analysis
- **httpx** - Async HTTP client for Peec API
- **Pydantic** - Data validation

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **React Query** - Data fetching and caching
- **React Router** - Navigation
- **Axios** - HTTP client
- **Lucide React** - Icon library

## 🚨 Troubleshooting

### Backend won't start
- Check Python version: `python --version` (need 3.10+)
- Activate virtual environment
- Install dependencies: `pip install -r requirements.txt`

### Frontend won't start
- Check Node version: `node --version` (need 18+)
- Install dependencies: `npm install`
- Clear cache: `rm -rf node_modules package-lock.json && npm install`

### "Not configured" message
- Add `PEECAI_API_KEY` to `backend/.env`
- Restart backend server
- Refresh browser

### No data showing
- Verify Peec API key is valid
- Check backend logs for errors
- Ensure project and brand are configured in Peec

## 📄 License

This is a hackathon project built for demonstration purposes.

## 🤝 Contributing

Built for the AI Reputation Defense hackathon. See the technical specification for detailed implementation notes.

---

**Sentinel** - Defending your brand in the age of AI 🛡️
