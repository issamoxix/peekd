import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { ListChecks, ExternalLink, TrendingUp } from 'lucide-react'
import { useState } from 'react'

interface Action {
  id: string; category: string; opportunity_score: number; opportunity_level: string
  domain: string; title: string; rationale: string; competitor_presence: string[]
  keywords: string[]; status: string
}

const tabs = ['ALL', 'OWNED_PAGES', 'EDITORIAL', 'REFERENCE', 'UGC']
const levelColors: Record<string, string> = { HIGH: 'text-green-400 bg-green-500/10', MEDIUM: 'text-yellow-400 bg-yellow-500/10', LOW: 'text-gray-400 bg-gray-500/10' }

export default function ActionQueue() {
  const [tab, setTab] = useState('ALL')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['actions', tab],
    queryFn: async () => {
      const params = new URLSearchParams({ status: 'PENDING' })
      if (tab !== 'ALL') params.set('category', tab)
      return (await axios.get(`/api/actions?${params}`)).data
    },
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => axios.patch(`/api/actions/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  })

  const actions: Action[] = data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Action Queue</h1>
        <p className="text-gray-400 text-sm mt-1">Ranked opportunities to improve AI visibility</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1 border border-gray-800 w-fit">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            {t === 'ALL' ? 'All' : t.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
      ) : actions.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <ListChecks className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-300">No pending actions</h3>
          <p className="text-gray-500 text-sm mt-2">Actions will be generated based on domain and URL analysis.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {actions.map(a => (
            <div key={a.id} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
              <div className="flex items-start gap-4">
                {/* Score */}
                <div className="w-16 text-center shrink-0">
                  <div className="text-2xl font-bold text-blue-400">{(a.opportunity_score * 100).toFixed(0)}</div>
                  <div className="text-[10px] text-gray-500 uppercase">Score</div>
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${levelColors[a.opportunity_level] || levelColors.LOW}`}>{a.opportunity_level}</span>
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">{a.category.replace('_', ' ')}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">{a.title}</h3>
                  <p className="text-xs text-gray-400 mb-2">{a.rationale}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <ExternalLink className="w-3 h-3" />
                    <span>{a.domain}</span>
                    {a.keywords.length > 0 && (
                      <span className="ml-2">Keywords: {a.keywords.slice(0, 3).join(', ')}</span>
                    )}
                  </div>
                </div>
                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  <button onClick={() => updateStatus.mutate({ id: a.id, status: 'IN_PROGRESS' })} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs">Start</button>
                  <button onClick={() => updateStatus.mutate({ id: a.id, status: 'DONE' })} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs">Done</button>
                  <button onClick={() => updateStatus.mutate({ id: a.id, status: 'DISMISSED' })} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-xs">Skip</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
