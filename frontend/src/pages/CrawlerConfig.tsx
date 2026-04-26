import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { Bot, Copy, Download, Check } from 'lucide-react'
import { useState } from 'react'

export default function CrawlerConfig() {
  const [strategy, setStrategy] = useState('balanced')
  const [copied, setCopied] = useState(false)

  const generate = useMutation({
    mutationFn: (s: string) => axios.post('/api/crawlers/generate', { strategy: s }),
  })

  const { data: robotsData } = useQuery({
    queryKey: ['robots', strategy],
    queryFn: async () => (await axios.get(`/api/crawlers/robots?strategy=${strategy}`)).data,
  })

  const handleGenerate = () => generate.mutate(strategy)

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const strategies = [
    { id: 'balanced', name: 'Balanced', desc: 'Block training, allow retrieval bots' },
    { id: 'max_visibility', name: 'Max Visibility', desc: 'Allow all AI bots for maximum exposure' },
    { id: 'training_block', name: 'Training Block', desc: 'Strictly block AI training crawlers' },
  ]

  const crawlers = [
    { name: 'Claude-SearchBot', type: 'Retrieval', desc: 'Stay cited in Claude answers', default: true },
    { name: 'Claude-User', type: 'Retrieval', desc: 'User-initiated Claude requests', default: true },
    { name: 'OAI-SearchBot', type: 'Retrieval', desc: 'Stay cited in ChatGPT search', default: true },
    { name: 'ChatGPT-User', type: 'Retrieval', desc: 'User-initiated ChatGPT requests', default: true },
    { name: 'PerplexityBot', type: 'Retrieval', desc: 'Stay cited in Perplexity answers', default: true },
    { name: 'Perplexity-User', type: 'Retrieval', desc: 'User-initiated Perplexity requests', default: true },
    { name: 'ClaudeBot', type: 'Training', desc: 'Claude model training data', default: false },
    { name: 'GPTBot', type: 'Training', desc: 'OpenAI model training data', default: false },
    { name: 'CCBot', type: 'Training', desc: 'Common Crawl training data', default: false },
    { name: 'Google-Extended', type: 'Training', desc: 'Gemini model training data', default: false },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Crawler Configuration</h1>
        <p className="text-muted text-sm mt-1">Manage AI crawler access to your content</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Configuration */}
        <div className="space-y-6">
          {/* Strategy Selector */}
          <div className="bg-panel rounded-xl border border-soft-line p-6">
            <h2 className="text-lg font-semibold text-ink mb-4">Strategy</h2>
            <div className="space-y-3">
              {strategies.map(s => (
                <label key={s.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${strategy === s.id ? 'border-blue-500 bg-sage-soft' : 'border-soft-line hover:border-line'}`}>
                  <input type="radio" name="strategy" value={s.id} checked={strategy === s.id} onChange={() => setStrategy(s.id)} className="text-sage" />
                  <div>
                    <div className="text-sm font-medium text-ink">{s.name}</div>
                    <div className="text-xs text-muted">{s.desc}</div>
                  </div>
                </label>
              ))}
            </div>
            <button onClick={handleGenerate} className="mt-4 w-full bg-sage hover:bg-sage text-ink px-4 py-2 rounded-lg text-sm font-medium">
              Generate Configuration
            </button>
          </div>

          {/* Crawler List */}
          <div className="bg-panel rounded-xl border border-soft-line p-6">
            <h2 className="text-lg font-semibold text-ink mb-4">AI Crawlers</h2>
            <div className="space-y-2">
              {crawlers.map(c => (
                <div key={c.name} className="flex items-center justify-between p-3 bg-pearl/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Bot className="w-4 h-4 text-muted" />
                    <div>
                      <div className="text-sm text-ink">{c.name}</div>
                      <div className="text-xs text-muted">{c.desc}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${c.type === 'Retrieval' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>{c.type}</span>
                    <div className={`w-3 h-3 rounded-full ${c.default ? 'bg-green-500' : 'bg-gray-600'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="space-y-6">
          <div className="bg-panel rounded-xl border border-soft-line p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-ink">robots.txt Preview</h2>
              <div className="flex gap-2">
                <button onClick={() => handleCopy(robotsData || '')} className="flex items-center gap-1 text-xs bg-pearl hover:bg-pearl text-ink px-3 py-1.5 rounded-lg">
                  {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={() => {
                  const blob = new Blob([robotsData || ''], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a'); a.href = url; a.download = 'robots.txt'; a.click()
                }} className="flex items-center gap-1 text-xs bg-pearl hover:bg-pearl text-ink px-3 py-1.5 rounded-lg">
                  <Download className="w-3 h-3" /> Download
                </button>
              </div>
            </div>
            <pre className="bg-paper rounded-lg p-4 text-xs text-green-400 font-mono overflow-auto max-h-[500px] whitespace-pre-wrap border border-soft-line">
              {robotsData || 'Click "Generate Configuration" to preview'}
            </pre>
          </div>

          {/* Cloudflare Rules */}
          {generate.data && (
            <div className="bg-panel rounded-xl border border-soft-line p-6">
              <h2 className="text-lg font-semibold text-ink mb-4">Cloudflare WAF Rules</h2>
              <div className="space-y-3">
                {((generate.data as any).data?.cloudflare_rules ?? []).map((rule: any, i: number) => (
                  <div key={i} className="bg-pearl/50 rounded-lg p-4">
                    <div className="text-sm font-medium text-ink mb-1">{rule.name}</div>
                    <div className="text-xs text-muted mb-2">{rule.description}</div>
                    <code className="text-xs text-orange-400 bg-paper px-2 py-1 rounded block">{rule.rule}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
