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
