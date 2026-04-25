import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { AlertTriangle, Zap, X, Eye, Filter } from 'lucide-react'
import { useState } from 'react'

interface Threat {
  id: string; type: string; severity: string; model: string; summary: string
  evidence: string; source_url?: string; auto_fixable: boolean; fix_type?: string
  status: string; detected_at: string
}

const severityColors: Record<string, string> = {
  CRITICAL: 'bg-red-500', HIGH: 'bg-orange-500', MEDIUM: 'bg-yellow-500', LOW: 'bg-gray-500',
}
const modelColors: Record<string, string> = {
  chatgpt: 'bg-green-500', perplexity: 'bg-blue-500', gemini: 'bg-purple-500',
  claude: 'bg-orange-500', copilot: 'bg-cyan-500', grok: 'bg-red-500',
}

export default function ThreatCenter() {
  const [severity, setSeverity] = useState<string>('')
  const [model, setModel] = useState<string>('')
  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['threats', severity, model],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (severity) params.set('severity', severity)
      if (model) params.set('model', model)
      params.set('status', 'OPEN')
      return (await axios.get(`/api/threats?${params}`)).data
    },
  })

  const dismiss = useMutation({
    mutationFn: (id: string) => axios.patch(`/api/threats/${id}`, { status: 'DISMISSED' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['threats'] }); setSelectedThreat(null) },
  })

  const fix = useMutation({
    mutationFn: (id: string) => axios.post(`/api/threats/${id}/fix`),
  })

  const threats: Threat[] = data?.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Threat Center</h1>
        <p className="text-gray-400 text-sm mt-1">Monitor and respond to reputation threats</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <Filter className="w-4 h-4 text-gray-400" />
        <select value={severity} onChange={e => setSeverity(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
          <option value="">All Severity</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
        <select value={model} onChange={e => setModel(e.target.value)} className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2">
          <option value="">All Models</option>
          {['chatgpt','perplexity','gemini','claude','copilot','grok'].map(m => (
            <option key={m} value={m} className="capitalize">{m}</option>
          ))}
        </select>
        <span className="text-sm text-gray-500 ml-auto">{threats.length} threats</span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : threats.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <AlertTriangle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-300">No threats found</h3>
          <p className="text-gray-500 text-sm mt-2">No active threats match your filters. The system scans automatically every 2 hours.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {threats.map(t => (
            <div key={t.id} className="bg-gray-900 rounded-xl border border-gray-800 p-5 hover:border-gray-700 transition-colors cursor-pointer" onClick={() => setSelectedThreat(t)}>
              <div className="flex items-start gap-4">
                <span className={`px-2 py-1 rounded text-xs font-bold text-white ${severityColors[t.severity]}`}>{t.severity}</span>
                <span className={`px-2 py-0.5 rounded text-xs text-white capitalize ${modelColors[t.model] || 'bg-gray-600'}`}>{t.model}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{t.summary}</p>
                  <p className="text-xs text-gray-500 mt-1 truncate">{t.evidence}</p>
                </div>
                <div className="flex items-center gap-2">
                  {t.auto_fixable && <Zap className="w-4 h-4 text-green-400" title="Auto-fixable" />}
                  <span className="text-xs text-gray-600 bg-gray-800 px-2 py-1 rounded">{t.type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selectedThreat && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedThreat(null)}>
          <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Threat Detail</h2>
              <button onClick={() => setSelectedThreat(null)} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded text-xs font-bold text-white ${severityColors[selectedThreat.severity]}`}>{selectedThreat.severity}</span>
                <span className={`px-2 py-0.5 rounded text-xs text-white capitalize ${modelColors[selectedThreat.model] || 'bg-gray-600'}`}>{selectedThreat.model}</span>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">{selectedThreat.type}</span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Summary</h3>
                <p className="text-white">{selectedThreat.summary}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Evidence</h3>
                <blockquote className="border-l-2 border-gray-600 pl-4 text-gray-300 italic text-sm">{selectedThreat.evidence}</blockquote>
              </div>
              {selectedThreat.source_url && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Source</h3>
                  <a href={selectedThreat.source_url} target="_blank" className="text-blue-400 hover:underline text-sm">{selectedThreat.source_url}</a>
                </div>
              )}
              <div className="flex gap-3 pt-4 border-t border-gray-800">
                {selectedThreat.auto_fixable && (
                  <button onClick={() => fix.mutate(selectedThreat.id)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Generate Fix
                  </button>
                )}
                <button onClick={() => dismiss.mutate(selectedThreat.id)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm">Dismiss</button>
              </div>
              {fix.data && (
                <div className="bg-gray-800 rounded-lg p-4 mt-4">
                  <h3 className="text-sm font-medium text-green-400 mb-2">Generated Fix</h3>
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap">{(fix.data as any).data?.fix_content}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
