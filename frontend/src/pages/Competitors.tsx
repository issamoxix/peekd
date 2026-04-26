import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Users, TrendingDown, Target, Sparkles } from 'lucide-react'

interface CompetitorEvent {
  id: string; competitor_name: string; event_type: string; severity: string
  affected_models: string[]; opportunity_score: number; recommended_actions: string[]
  detected_at: string
}

const eventColors: Record<string, string> = {
  SENTIMENT_CRISIS: 'bg-red-500', VISIBILITY_DROP: 'bg-orange-500', HALLUCINATION_DETECTED: 'bg-purple-500',
}

export default function Competitors() {
  const { data, isLoading } = useQuery({
    queryKey: ['competitors'],
    queryFn: async () => (await axios.get('/api/competitors')).data,
  })

  const events: CompetitorEvent[] = data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Competitor Intelligence</h1>
        <p className="text-gray-400 text-sm mt-1">Monitor competitor crises and discover opportunities</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-red-400" />
            </div>
            <span className="text-sm text-gray-400">Active Crises</span>
          </div>
          <div className="text-3xl font-bold text-red-400">{events.filter(e => e.event_type === 'SENTIMENT_CRISIS').length}</div>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-orange-400" />
            </div>
            <span className="text-sm text-gray-400">Opportunities</span>
          </div>
          <div className="text-3xl font-bold text-orange-400">{events.length}</div>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-sm text-gray-400">Avg Opportunity Score</span>
          </div>
          <div className="text-3xl font-bold text-green-400">
            {events.length > 0 ? (events.reduce((s, e) => s + e.opportunity_score, 0) / events.length * 100).toFixed(0) : '—'}
          </div>
        </div>
      </div>

      {/* Event List */}
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
      ) : events.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-300">No competitor events detected</h3>
          <p className="text-gray-500 text-sm mt-2">Competitor monitoring scans run every 4 hours. Events will appear when crises are detected.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map(e => (
            <div key={e.id} className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-gray-400">{e.competitor_name.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-white">{e.competitor_name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs text-white ${eventColors[e.event_type] || 'bg-gray-600'}`}>
                      {e.event_type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">{e.severity}</span>
                  </div>

                  {/* Affected Models */}
                  <div className="flex gap-1 mb-3">
                    {e.affected_models.map(m => (
                      <span key={m} className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded capitalize">{m}</span>
                    ))}
                  </div>

                  {/* Opportunity Score */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs text-gray-500">Opportunity:</span>
                    <div className="flex-1 h-2 bg-gray-800 rounded-full max-w-xs overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${e.opportunity_score * 100}%` }} />
                    </div>
                    <span className="text-sm font-bold text-green-400">{(e.opportunity_score * 100).toFixed(0)}%</span>
                  </div>

                  {/* Recommended Actions */}
                  {e.recommended_actions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-400 mb-1">Recommended Actions</h4>
                      <ul className="space-y-1">
                        {e.recommended_actions.map((action, i) => (
                          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                            <span className="text-blue-400 mt-1">→</span>{action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
