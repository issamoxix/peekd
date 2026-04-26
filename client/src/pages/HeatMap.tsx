import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Grid3X3, Building2 } from 'lucide-react'
import { useState } from 'react'
import { resolvePromptText } from '../utils/text'

interface HeatmapData {
  company_name: string
  models: string[]
  prompts: Array<{ id: string; message: string }>
  model_metrics: Record<string, { visibility: number; sentiment: number }>
  prompt_metrics: Record<string, { visibility: number; sentiment: number }>
  grid: Array<{ model: string; prompt_id: string; prompt_label: string; visibility: number; sentiment: number }>
  error?: string
}

const modelDisplayNames: Record<string, string> = {
  chatgpt: 'ChatGPT', perplexity: 'Perplexity', gemini: 'Gemini',
  claude: 'Claude', copilot: 'Copilot', grok: 'Grok',
}

function getHeatColor(value: number): string {
  // 0 = deep red, 0.5 = yellow, 1.0 = green
  if (value >= 0.7) return 'bg-green-500'
  if (value >= 0.5) return 'bg-green-600/70'
  if (value >= 0.35) return 'bg-yellow-500'
  if (value >= 0.2) return 'bg-orange-500'
  return 'bg-red-500'
}

function getHeatBg(value: number): string {
  if (value >= 0.7) return 'rgba(34,197,94,0.3)'
  if (value >= 0.5) return 'rgba(34,197,94,0.15)'
  if (value >= 0.35) return 'rgba(234,179,8,0.2)'
  if (value >= 0.2) return 'rgba(249,115,22,0.2)'
  return 'rgba(239,68,68,0.25)'
}

export default function HeatMap() {
  const [metric, setMetric] = useState<'visibility' | 'sentiment'>('visibility')
  const [hoveredCell, setHoveredCell] = useState<{ model: string; prompt: string } | null>(null)

  const { data, isLoading } = useQuery<HeatmapData>({
    queryKey: ['heatmap'],
    queryFn: async () => (await axios.get('/api/heatmap')).data,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-[80vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  )

  const d = data!
  const models = d.models || []
  const promptIds = Object.keys(d.prompt_metrics || {})
  const promptMap = new Map((d.prompts || []).map(p => [p.id, p.message]))

  // Build lookup: grid[model][prompt_id] -> value
  const gridLookup: Record<string, Record<string, { visibility: number; sentiment: number }>> = {}
  for (const cell of (d.grid || [])) {
    if (!gridLookup[cell.model]) gridLookup[cell.model] = {}
    gridLookup[cell.model][cell.prompt_id] = { visibility: cell.visibility, sentiment: cell.sentiment }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Grid3X3 className="w-7 h-7 text-blue-400" />
            Heat Map
          </h1>
          {d.company_name && (
            <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Analyzing <span className="text-white font-medium">{d.company_name}</span> across AI models and prompts
            </p>
          )}
        </div>
        {/* Metric Toggle */}
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1 border border-gray-800">
          <button onClick={() => setMetric('visibility')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${metric === 'visibility' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            Visibility
          </button>
          <button onClick={() => setMetric('sentiment')} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${metric === 'sentiment' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            Sentiment
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span>Legend:</span>
        <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-red-500"></div> Low</div>
        <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-orange-500"></div></div>
        <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-yellow-500"></div> Mid</div>
        <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-green-600/70"></div></div>
        <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-green-500"></div> High</div>
      </div>

      {models.length === 0 || promptIds.length === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <Grid3X3 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-300">No heatmap data available</h3>
          <p className="text-gray-500 text-sm mt-2">
            {!d.company_name ? 'Set your company name in Settings first.' : 'Waiting for Peec AI data. Make sure your project has prompts and model data.'}
          </p>
        </div>
      ) : (
        <>
          {/* Model Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {models.map(m => {
              const metrics = d.model_metrics[m]
              if (!metrics) return null
              const val = metric === 'visibility' ? metrics.visibility : metrics.sentiment / 100
              return (
                <div key={m} className="bg-gray-900 rounded-xl border border-gray-800 p-4 text-center">
                  <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${getHeatColor(val)}`}></div>
                  <div className="text-sm font-medium text-white capitalize">{modelDisplayNames[m] || m}</div>
                  <div className="text-lg font-bold text-blue-400 mt-1">
                    {metric === 'visibility' ? `${(metrics.visibility * 100).toFixed(0)}%` : metrics.sentiment.toFixed(0)}
                  </div>
                  <div className="text-[10px] text-gray-500 uppercase">{metric}</div>
                </div>
              )
            })}
          </div>

          {/* Heat Map Grid — prompts as rows, models as columns */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 overflow-x-auto">
            <h2 className="text-lg font-semibold text-white mb-4">Prompt × Model Grid</h2>
            <table className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="text-left text-xs text-gray-400 font-medium p-2 w-0 min-w-[300px] max-w-[400px]">
                    Reputation Prompt
                  </th>
                  {models.map(m => (
                    <th key={m} className="text-center text-xs text-gray-300 font-semibold p-2 capitalize min-w-[80px]">
                      {modelDisplayNames[m] || m}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {promptIds.slice(0, 15).map((pid, idx) => {
                  const label = resolvePromptText(promptMap.get(pid) || pid)
                  return (
                    <tr key={pid} className="group">
                      <td className="py-1 pr-4 text-xs text-gray-300 align-middle">
                        <div className="flex items-start gap-2">
                          <span className="text-gray-600 font-mono flex-shrink-0 mt-0.5">{idx + 1}.</span>
                          <span className="leading-snug line-clamp-2 group-hover:text-white transition-colors">{label}</span>
                        </div>
                      </td>
                      {models.map(m => {
                        const cell = gridLookup[m]?.[pid]
                        const val = cell ? (metric === 'visibility' ? cell.visibility : cell.sentiment / 100) : 0
                        const isHovered = hoveredCell?.model === m && hoveredCell?.prompt === pid
                        return (
                          <td key={m} className="p-1 text-center"
                            onMouseEnter={() => setHoveredCell({ model: m, prompt: pid })}
                            onMouseLeave={() => setHoveredCell(null)}>
                            <div
                              className={`h-9 rounded-md flex items-center justify-center text-xs font-bold text-white cursor-pointer transition-all ${isHovered ? 'ring-2 ring-white scale-105' : ''}`}
                              style={{ backgroundColor: getHeatBg(val), minWidth: '56px' }}
                            >
                              {cell ? (metric === 'visibility' ? `${(cell.visibility * 100).toFixed(0)}%` : cell.sentiment.toFixed(0)) : '—'}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Hover Tooltip */}
          {hoveredCell && gridLookup[hoveredCell.model]?.[hoveredCell.prompt] && (
            <div className="fixed bottom-6 right-6 bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-2xl z-50 min-w-[200px]">
              <div className="text-sm font-bold text-white capitalize mb-2">{modelDisplayNames[hoveredCell.model] || hoveredCell.model}</div>
              <div className="text-xs text-gray-400 mb-2 truncate" style={{ maxWidth: '250px' }}>
                {resolvePromptText(promptMap.get(hoveredCell.prompt) || hoveredCell.prompt)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-gray-500">Visibility:</span> <span className="text-white font-bold">{(gridLookup[hoveredCell.model][hoveredCell.prompt].visibility * 100).toFixed(1)}%</span></div>
                <div><span className="text-gray-500">Sentiment:</span> <span className="text-white font-bold">{gridLookup[hoveredCell.model][hoveredCell.prompt].sentiment.toFixed(1)}</span></div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
