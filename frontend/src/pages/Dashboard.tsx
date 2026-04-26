import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { cleanText } from '../utils/text'
import {
  Shield, AlertTriangle, TrendingUp, Activity,
  Eye, Target, Filter, AlertCircle
} from 'lucide-react'

interface DashboardData {
  configured: boolean
  company_name?: string
  project_id?: string
  brand_id?: string
  reputation_prompts_active?: boolean
  reputation_prompts_count?: number
  brand_visibility?: number
  sentiment_score?: number
  visibility_trend?: string
  sentiment_trend?: string
  active_threats?: { critical: number; high: number; medium: number; low: number }
  top_models?: Array<{ model: string; visibility: number; sentiment: number }>
  recent_threats?: Array<{ id: string; severity: string; type: string; model: string; summary: string; detected_at: string }>
  action_queue_count?: number
  security_topic_enabled?: boolean
  competitor_events?: Array<{ id: string; competitor_name: string; event_type: string; opportunity_score: number; detected_at: string }>
  narrative_shift_tracker?: { tracked_keywords: number; target_sentiment_delta: number; target_positive_mentions_delta_pct: number }
}

const modelColors: Record<string, string> = {
  chatgpt: 'bg-green-500', perplexity: 'bg-sage', gemini: 'bg-purple-500',
  claude: 'bg-orange-500', copilot: 'bg-cyan-500', grok: 'bg-red-500',
}

const severityColors: Record<string, string> = {
  CRITICAL: 'bg-red-500', HIGH: 'bg-orange-500', MEDIUM: 'bg-yellow-500', LOW: 'bg-gray-500',
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: async () => (await axios.get('/api/dashboard')).data,
    refetchInterval: 30000,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-[80vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-[80vh]">
      <div className="bg-panel rounded-xl border border-red-500/30 p-8 max-w-md text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-ink mb-2">Connection Error</h2>
        <p className="text-muted">Backend not reachable. Run <code className="bg-pearl px-2 py-1 rounded text-sm">python3 main.py</code> in the backend folder.</p>
      </div>
    </div>
  )

  const d = data!
  const totalThreats = d.active_threats ? Object.values(d.active_threats).reduce((a, b) => a + b, 0) : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink">
          Dashboard {d.company_name && <span className="text-sage">— {d.company_name}</span>}
        </h1>
        <p className="text-muted text-sm mt-1">
          {d.company_name ? `Monitoring ${d.company_name} across AI models` : 'Real-time brand monitoring across AI models'}
        </p>

        {/* Filter context */}
        {d.reputation_prompts_active ? (
          <div className="flex items-center gap-2 mt-3 text-xs text-sage bg-sage-soft border border-sage rounded-lg px-3 py-2 w-fit">
            <Filter className="w-3.5 h-3.5" />
            Showing threats scoped to <span className="font-semibold">{d.reputation_prompts_count} reputation risk questions</span> for this project
          </div>
        ) : d.project_id ? (
          <div className="flex items-center gap-2 mt-3 text-xs text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 w-fit">
            <AlertCircle className="w-3.5 h-3.5" />
            Showing all prompts — go to <a href="/settings" className="underline font-semibold">Settings</a> and select your project to load reputation risk questions
          </div>
        ) : null}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard icon={Eye} label="Brand Visibility" value={d.brand_visibility ? `${(d.brand_visibility * 100).toFixed(1)}%` : '—'} trend={d.visibility_trend} color="blue" />
        <KPICard icon={Activity} label="Sentiment Score" value={d.sentiment_score ? `${d.sentiment_score.toFixed(1)}` : '—'} trend={d.sentiment_trend} color={d.sentiment_score && d.sentiment_score >= 65 ? 'green' : d.sentiment_score && d.sentiment_score >= 45 ? 'yellow' : 'red'} />
        <KPICard icon={AlertTriangle} label="Active Threats" value={String(totalThreats)} trend={d.active_threats?.critical ? `${d.active_threats.critical} critical` : 'No critical'} color="red" />
        <KPICard icon={Target} label="Top Opportunities" value={String(d.competitor_events?.length ?? 0)} trend="competitor displacements" color="purple" />
      </div>

      {/* Threat Breakdown + Models */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Threat Severity */}
        <div className="bg-panel rounded-xl border border-soft-line p-6">
          <h2 className="text-lg font-semibold text-ink mb-4">Threat Severity Breakdown</h2>
          <div className="space-y-3">
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(sev => {
              const count = d.active_threats?.[sev.toLowerCase() as keyof typeof d.active_threats] ?? 0
              const max = Math.max(totalThreats, 1)
              return (
                <div key={sev} className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${severityColors[sev]}`} />
                  <span className="text-sm text-muted w-20">{sev}</span>
                  <div className="flex-1 h-2 bg-pearl rounded-full overflow-hidden">
                    <div className={`h-full ${severityColors[sev]} rounded-full transition-all`} style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                  <span className="text-sm font-mono text-ink w-8 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* AI Models */}
        <div className="bg-panel rounded-xl border border-soft-line p-6">
          <h2 className="text-lg font-semibold text-ink mb-4">AI Model Coverage</h2>
          {d.top_models && d.top_models.length > 0 ? (
            <div className="space-y-3">
              {d.top_models.map(m => (
                <div key={m.model} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${modelColors[m.model] || 'bg-gray-500'}`} />
                  <span className="text-sm text-ink w-24 capitalize">{m.model}</span>
                  <div className="flex-1 h-2 bg-pearl rounded-full overflow-hidden">
                    <div className="h-full bg-sage rounded-full" style={{ width: `${m.visibility * 100}%` }} />
                  </div>
                  <span className="text-xs text-muted w-16 text-right">{(m.visibility * 100).toFixed(0)}% vis</span>
                  <span className="text-xs text-muted w-16 text-right">{m.sentiment.toFixed(0)} sent</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-sm">No model data available yet. Data will appear after the first scan.</p>
          )}
        </div>
      </div>

      {/* Recent Threats */}
      <div className="bg-panel rounded-xl border border-soft-line p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Recent Threats</h2>
        {d.recent_threats && d.recent_threats.length > 0 ? (
          <div className="space-y-3">
            {d.recent_threats.map(t => (
              <div key={t.id} className="flex items-center gap-4 p-3 bg-pearl/50 rounded-lg">
                <span className={`px-2 py-1 rounded text-xs font-bold text-ink ${severityColors[t.severity]}`}>{t.severity}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${modelColors[t.model] || 'bg-gray-600'} text-ink capitalize`}>{t.model}</span>
                <span className="text-sm text-ink flex-1 truncate">{cleanText(t.summary, d.company_name || '')}</span>
                <span className="text-xs text-muted">{t.type}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted text-sm">No threats detected yet. Scans run automatically every 2 hours.</p>
        )}
      </div>

      {/* Competitor Opportunities */}
      <div className="bg-panel rounded-xl border border-soft-line p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Competitor Opportunities</h2>
        {d.competitor_events && d.competitor_events.length > 0 ? (
          <div className="space-y-3">
            {d.competitor_events.map(e => (
              <div key={e.id} className="flex items-center justify-between gap-4 p-3 bg-pearl/50 rounded-lg">
                <div>
                  <p className="text-sm text-ink">{e.competitor_name}</p>
                  <p className="text-xs text-muted">{e.event_type.replace('_', ' ')}</p>
                </div>
                <span className="text-sm font-semibold text-green-400">{(e.opportunity_score * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted text-sm">No competitor opportunities detected yet.</p>
        )}
      </div>

      {/* Status */}
      <div className="bg-sage-soft border border-sage rounded-xl p-4 flex items-center gap-3">
        <Shield className="w-5 h-5 text-sage" />
        <p className="text-sage text-sm">
          Peekd is actively monitoring your brand across major AI models.
          {d.security_topic_enabled ? ' Security-topic filtering is enabled.' : ' Security-topic filtering is currently off.'}
        </p>
      </div>
    </div>
  )
}

function KPICard({ icon: Icon, label, value, trend, color }: { icon: any; label: string; value: string; trend?: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'text-sage bg-sage-soft', green: 'text-green-400 bg-green-500/10',
    red: 'text-red-400 bg-red-500/10', yellow: 'text-yellow-400 bg-yellow-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
  }
  const [textColor] = (colorMap[color] || colorMap.blue).split(' ')
  return (
    <div className="bg-panel rounded-xl border border-soft-line p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className={`text-3xl font-bold ${textColor} mb-1`}>{value}</div>
      {trend && <p className="text-xs text-muted">{trend}</p>}
    </div>
  )
}
