import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { ListChecks, ExternalLink, Loader, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

interface Action {
  id: string; category: string; opportunity_score: number; opportunity_level: string
  domain: string; title: string; rationale: string; competitor_presence: string[]
  keywords: string[]; steps?: string[]; timeline?: string; status: string
}

const tabs = ['ALL', 'OWNED_PAGES', 'EDITORIAL', 'REFERENCE', 'UGC']
const tabLabels: Record<string, string> = {
  ALL: 'All', OWNED_PAGES: 'Owned Pages', EDITORIAL: 'Editorial', REFERENCE: 'Reference', UGC: 'Community'
}
const levelColors: Record<string, string> = {
  HIGH: 'text-green-400 bg-green-500/10 border border-green-500/20',
  MEDIUM: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20',
  LOW: 'text-gray-400 bg-gray-500/10 border border-gray-700',
}
const timelineColors: Record<string, string> = {
  Immediate: 'text-red-400 bg-red-500/10',
  'This week': 'text-yellow-400 bg-yellow-500/10',
  'This month': 'text-blue-400 bg-blue-500/10',
}

export default function ActionQueue() {
  const [tab, setTab] = useState('ALL')
  const [expanded, setExpanded] = useState<string | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['actions', tab],
    queryFn: async () => {
      const params = new URLSearchParams({ status: 'PENDING' })
      if (tab !== 'ALL') params.set('category', tab)
      return (await axios.get(`/api/actions?${params}`)).data
    },
    staleTime: 900000, // 15 min — matches AI engine cache
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      axios.patch(`/api/actions/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  })

  const actions: Action[] = data?.data ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Action Queue</h1>
          <p className="text-gray-400 text-sm mt-1">AI-generated ranked actions from live reputation data</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-lg">
          <Sparkles className="w-3.5 h-3.5" />
          Powered by Claude AI
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1 border border-gray-800 w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader className="w-8 h-8 text-blue-400 animate-spin" />
          <p className="text-gray-400 text-sm">Claude is generating your action queue from live data…</p>
        </div>
      ) : actions.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <ListChecks className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-300">No actions yet</h3>
          <p className="text-gray-500 text-sm mt-2">Actions are generated from live threat and competitor data. Make sure a project is configured in Settings.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map((a, idx) => (
            <div key={a.id} className="bg-gray-900 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  {/* Rank + Score */}
                  <div className="w-14 text-center shrink-0">
                    <div className="text-2xl font-bold text-blue-400">{(a.opportunity_score * 100).toFixed(0)}</div>
                    <div className="text-[10px] text-gray-600 uppercase">Score</div>
                    <div className="text-[10px] text-gray-700 mt-0.5">#{idx + 1}</div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${levelColors[a.opportunity_level] || levelColors.LOW}`}>{a.opportunity_level}</span>
                      <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{(tabLabels[a.category] || a.category).replace('_', ' ')}</span>
                      {a.timeline && (
                        <span className={`text-xs px-2 py-0.5 rounded ${timelineColors[a.timeline] || 'text-gray-400 bg-gray-800'}`}>{a.timeline}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1">{a.title}</h3>
                    <p className="text-xs text-gray-400 mb-2 leading-relaxed">{a.rationale}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><ExternalLink className="w-3 h-3" />{a.domain}</span>
                      {a.competitor_presence.length > 0 && (
                        <span className="text-orange-400">vs {a.competitor_presence.slice(0, 2).join(', ')}</span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => updateStatus.mutate({ id: a.id, status: 'IN_PROGRESS' })} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs">Start</button>
                    <button onClick={() => updateStatus.mutate({ id: a.id, status: 'DONE' })} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs">Done</button>
                    <button onClick={() => updateStatus.mutate({ id: a.id, status: 'DISMISSED' })} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-xs">Skip</button>
                  </div>
                </div>

                {/* Expand steps */}
                {a.steps && a.steps.length > 0 && (
                  <button
                    onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mt-3 pl-[72px]"
                  >
                    {expanded === a.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {expanded === a.id ? 'Hide steps' : `Show ${a.steps.length} action steps`}
                  </button>
                )}
              </div>

              {/* Steps panel */}
              {expanded === a.id && a.steps && (
                <div className="border-t border-gray-800 px-5 py-4 bg-gray-800/30">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Action Steps</p>
                  <ol className="space-y-1.5">
                    {a.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="text-blue-400 font-mono text-xs w-5 shrink-0 mt-0.5">{i + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  {a.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {a.keywords.map((kw, i) => (
                        <span key={i} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{kw}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
