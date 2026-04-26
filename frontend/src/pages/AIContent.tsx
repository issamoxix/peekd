import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  Bot, Copy, Check, Download, Sparkles, FileText, Globe,
  Search, Send, Loader, Shield, Play,
} from 'lucide-react'

const API = '/api'

type ContentType = 'brand-overview' | 'competitive-analysis' | 'faq' | 'llms-txt' | 'sitemap' | 'crawlers'

// ── Utility buttons ────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="flex items-center gap-1 text-xs bg-pearl hover:bg-pearl text-ink px-3 py-1.5 rounded-lg">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function DownloadButton({ text, filename }: { text: string; filename: string }) {
  return (
    <button onClick={() => { const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([text], { type: 'text/plain' })), download: filename }); a.click() }}
      className="flex items-center gap-1 text-xs bg-pearl hover:bg-pearl text-ink px-3 py-1.5 rounded-lg">
      <Download className="w-3 h-3" /> Download
    </button>
  )
}

function PushButton({ label = 'Push to website' }: { label?: string }) {
  const [pushed, setPushed] = useState(false)
  return (
    <button
      onClick={() => setPushed(true)}
      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${pushed ? 'bg-green-600 text-ink' : 'bg-purple-600 hover:bg-purple-700 text-ink'}`}
    >
      {pushed ? <Check className="w-3 h-3" /> : <Send className="w-3 h-3" />}
      {pushed ? 'Pushed to website ✓' : label}
    </button>
  )
}

// ── Payload builder ────────────────────────────────────────────────────────

function buildPayload(type: ContentType, brand: string, competitors: any[], questions: string[]): any | null {
  if (!brand) return null
  const compNames = competitors.map((e: any) => e.competitor_name).filter(Boolean)
  const compForAnalysis = competitors.map((e: any) => ({
    name: e.competitor_name,
    weakness: e.gap_analysis?.competitor_weakness || e.event_type,
    our_advantage: e.gap_analysis?.brand_advantage?.headline || `${brand} maintains a stronger reputation`,
  }))

  switch (type) {
    case 'brand-overview':
      return {
        brand_name: brand,
        brand_description: `a brand monitored for reputation across AI models`,
        key_features: ['AI model monitoring', 'Reputation threat detection', 'Competitor gap analysis', 'Counter-strategy playbooks'],
        target_audience: 'Marketing teams, brand managers, and growth leaders',
        competitors: compNames.length > 0 ? compNames : ['industry competitors'],
      }
    case 'competitive-analysis':
      return {
        brand_name: brand,
        brand_description: `a brand with active reputation monitoring`,
        key_differentiators: ['Real-time AI model monitoring', 'Proactive threat detection', 'Competitor opportunity capture'],
        competitors: compForAnalysis.length > 0 ? compForAnalysis : [{ name: 'Competitors', weakness: 'Less visibility in AI answers', our_advantage: `${brand} actively monitors and improves AI presence` }],
      }
    case 'faq':
      return {
        brand_name: brand,
        product_category: 'brand reputation and AI visibility',
        brand_description: `a brand focused on maintaining a strong reputation`,
        common_questions: questions.length > 0 ? questions : [
          `What makes ${brand} trustworthy?`,
          `How does ${brand} handle data security?`,
          `What are ${brand}'s key differentiators?`,
          `How does ${brand} compare to competitors?`,
          `What is ${brand}'s customer support like?`,
        ],
      }
    case 'llms-txt':
      return { brand_name: brand, brand_description: `a reputable brand committed to transparency`, base_url: 'https://yourdomain.com', do_not_train: true }
    case 'sitemap':
      return { base_url: 'https://yourdomain.com', brand_name: brand }
    default:
      return null
  }
}

// ── Crawler Control section ────────────────────────────────────────────────

function CrawlerControl({ brand }: { brand: string }) {
  const [strategy, setStrategy] = useState('balanced')
  const [generated, setGenerated] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [robotsContent, setRobotsContent] = useState<string>('')

  const strategies = [
    { id: 'balanced', name: 'Balanced', desc: 'Block training, allow retrieval bots' },
    { id: 'max_visibility', name: 'Max Visibility', desc: 'Allow all AI bots for maximum exposure' },
    { id: 'training_block', name: 'Training Block', desc: 'Strictly block AI training crawlers' },
  ]
  const crawlers = [
    { name: 'Claude-SearchBot', type: 'Retrieval', desc: 'Stay cited in Claude answers', allow: true },
    { name: 'Claude-User', type: 'Retrieval', desc: 'User-initiated Claude requests', allow: true },
    { name: 'OAI-SearchBot', type: 'Retrieval', desc: 'Stay cited in ChatGPT search', allow: true },
    { name: 'ChatGPT-User', type: 'Retrieval', desc: 'User-initiated ChatGPT requests', allow: true },
    { name: 'PerplexityBot', type: 'Retrieval', desc: 'Stay cited in Perplexity answers', allow: true },
    { name: 'Perplexity-User', type: 'Retrieval', desc: 'User-initiated Perplexity requests', allow: true },
    { name: 'ClaudeBot', type: 'Training', desc: 'Claude model training data', allow: false },
    { name: 'GPTBot', type: 'Training', desc: 'OpenAI model training data', allow: false },
    { name: 'CCBot', type: 'Training', desc: 'Common Crawl training data', allow: false },
    { name: 'Google-Extended', type: 'Training', desc: 'Gemini model training data', allow: false },
  ]

  async function handleGenerate() {
    setIsGenerating(true)
    try {
      const res = await axios.get(`${API}/crawlers/robots?strategy=${strategy}`)
      setRobotsContent(res.data || '')
      setGenerated(true)
    } catch {
      // fallback static robots.txt
      const allow = crawlers.filter(c => c.allow).map(c => `Allow: / # ${c.name}`).join('\n')
      const disallow = crawlers.filter(c => !c.allow).map(c => `Disallow: / # ${c.name}`).join('\n')
      setRobotsContent(`# robots.txt — generated for ${brand || 'your brand'}\n# Strategy: ${strategy}\n\n${crawlers.filter(c => c.allow).map(c => `User-agent: ${c.name}\nAllow: /\n`).join('\n')}\n${crawlers.filter(c => !c.allow).map(c => `User-agent: ${c.name}\nDisallow: /\n`).join('\n')}`)
      setGenerated(true)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <div className="bg-panel rounded-xl border border-soft-line p-6">
          <h2 className="text-base font-semibold text-ink mb-4">Crawler Strategy</h2>
          <div className="space-y-3">
            {strategies.map(s => (
              <label key={s.id} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${strategy === s.id ? 'border-blue-500 bg-sage-soft' : 'border-soft-line hover:border-line'}`}>
                <input type="radio" name="strategy" value={s.id} checked={strategy === s.id} onChange={() => { setStrategy(s.id); setGenerated(false) }} className="text-sage" />
                <div>
                  <div className="text-sm font-medium text-ink">{s.name}</div>
                  <div className="text-xs text-muted">{s.desc}</div>
                </div>
              </label>
            ))}
          </div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="mt-4 w-full bg-sage hover:bg-sage disabled:opacity-50 text-ink px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
          >
            {isGenerating ? <Loader className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isGenerating ? 'Generating…' : 'Generate robots.txt'}
          </button>
        </div>

        <div className="bg-panel rounded-xl border border-soft-line p-6">
          <h2 className="text-base font-semibold text-ink mb-4">AI Crawlers</h2>
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
                  <div className={`w-3 h-3 rounded-full ${c.allow ? 'bg-green-500' : 'bg-gray-600'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-panel rounded-xl border border-soft-line p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-base font-semibold text-ink">robots.txt Preview</h2>
          {robotsContent && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => { navigator.clipboard.writeText(robotsContent); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                className="flex items-center gap-1 text-xs bg-pearl hover:bg-pearl text-ink px-3 py-1.5 rounded-lg">
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <DownloadButton text={robotsContent} filename="robots.txt" />
              <PushButton />
            </div>
          )}
        </div>
        <pre className="bg-paper rounded-lg p-4 text-xs text-green-400 font-mono overflow-auto max-h-[500px] whitespace-pre-wrap border border-soft-line">
          {robotsContent || 'Select a strategy and click "Generate robots.txt"'}
        </pre>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

const TABS: { id: ContentType; label: string; icon: React.ReactNode; endpoint?: string; filename?: string; description: string; hasPush?: boolean }[] = [
  { id: 'brand-overview', label: 'Brand Overview', icon: <FileText className="w-4 h-4" />, endpoint: `${API}/ai-content/generate/brand-overview`, filename: 'brand-overview.md', description: 'Authority article Claude generates for your brand. AI retrieval bots cite this when users ask about your product.' },
  { id: 'competitive-analysis', label: 'Competitive Analysis', icon: <Search className="w-4 h-4" />, endpoint: `${API}/ai-content/generate/competitive-analysis`, filename: 'competitive-analysis.md', description: 'Comparison article with feature tables that AI models surface when users ask "X vs Y". Controls the narrative.', hasPush: true },
  { id: 'faq', label: 'FAQ Article', icon: <Bot className="w-4 h-4" />, endpoint: `${API}/ai-content/generate/faq`, filename: 'faq.md', description: 'Q&A phrased to match how people ask AI assistants. Each answer is self-contained for LLM quotation.', hasPush: true },
  { id: 'llms-txt', label: 'LLM Map (llms.txt)', icon: <Globe className="w-4 h-4" />, endpoint: `${API}/ai-content/generate/llms-txt`, filename: 'llms.txt', description: '/.well-known/llms.txt — tells LLMs what your site is about. Deploy at your domain root.', hasPush: true },
  { id: 'sitemap', label: 'AI Sitemap', icon: <Globe className="w-4 h-4" />, endpoint: `${API}/ai-content/generate/sitemap`, filename: 'sitemap-ai.xml', description: 'Prioritises /ai-context/* pages so LLMs index your authority content first.' },
  { id: 'crawlers', label: 'AI Crawler Control', icon: <Shield className="w-4 h-4" />, description: 'Control which AI crawlers can access your content and generate your robots.txt configuration.' },
]

export default function AIContent() {
  const [activeTab, setActiveTab] = useState<ContentType>('brand-overview')
  const [generating, setGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<Record<string, { content: string; word_count?: number; path?: string; generated_at?: string }>>({})

  const tab = TABS.find(t => t.id === activeTab)!

  const { data: config } = useQuery<{ company_name: string; brand_id: string; project_id: string }>({
    queryKey: ['config'],
    queryFn: () => axios.get(`${API}/settings/config`).then(r => r.data),
    staleTime: 30000,
  })
  const brand = config?.company_name || ''

  const { data: competitorData } = useQuery({
    queryKey: ['competitors'],
    queryFn: () => axios.get(`${API}/competitors`).then(r => r.data),
    enabled: !!brand,
    staleTime: 900000,
  })
  const { data: repData } = useQuery({
    queryKey: ['reputation-questions'],
    queryFn: () => axios.get(`${API}/threats/reputation-questions`).then(r => r.data),
    enabled: !!brand,
    staleTime: 900000,
  })

  const competitors: any[] = competitorData?.data ?? []
  const questions: string[] = (repData?.questions ?? []).map((q: any) => q.question).filter((q: string) => q && !q.includes('[brand]'))

  const payload = useMemo(
    () => tab.endpoint ? buildPayload(activeTab, brand, competitors, questions) : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab, brand, competitors.length, questions.length],
  )

  const generated = generatedContent[activeTab]
  const content = generated?.content ?? ''

  async function handleGenerate() {
    if (!tab.endpoint || !brand || !payload) return
    setGenerating(true)
    try {
      const res = await axios.post(tab.endpoint, payload)
      setGeneratedContent(prev => ({ ...prev, [activeTab]: res.data }))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Content Generation &amp; AI Crawler Control</h1>
        <p className="text-muted text-sm mt-1">
          Claude generates AI-optimised content based on your brand and live reputation data.
        </p>
        {brand && (
          <div className="flex items-center gap-2 mt-3 text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-lg px-3 py-2 w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            Generating for <span className="font-semibold">{brand}</span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeTab === t.id ? 'bg-sage text-ink' : 'bg-pearl text-muted hover:text-ink'}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Description */}
      <div className="bg-sage-soft border border-sage rounded-lg px-4 py-3">
        <p className="text-xs text-sage">{tab.description}</p>
      </div>

      {/* Crawler control tab is separate */}
      {activeTab === 'crawlers' ? (
        <CrawlerControl brand={brand} />
      ) : (
        <div className="space-y-4">
          {!brand ? (
            <div className="bg-panel rounded-xl border border-yellow-500/20 p-6 text-center">
              <p className="text-yellow-300 text-sm">No brand configured — go to <a href="/settings" className="underline font-semibold">Settings</a> and select your project first.</p>
            </div>
          ) : (
            <>
              {/* Generate button */}
              {!content && (
                <div className="flex justify-center py-8">
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-ink px-6 py-3 rounded-xl text-sm font-semibold shadow-lg shadow-purple-500/20 transition-all"
                  >
                    {generating ? <Loader className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    {generating ? `Claude is generating for ${brand}…` : `Generate ${tab.label} for ${brand}`}
                  </button>
                </div>
              )}

              {/* Result */}
              {content && (
                <div className="bg-panel rounded-xl border border-soft-line p-6">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-400" />
                      <h3 className="text-sm font-semibold text-ink">Generated {tab.label}</h3>
                      {generated?.word_count && <span className="text-xs text-muted">{generated.word_count} words</span>}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="flex items-center gap-1 text-xs bg-pearl hover:bg-pearl disabled:opacity-50 text-ink px-3 py-1.5 rounded-lg"
                      >
                        {generating ? <Loader className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-purple-400" />}
                        Regenerate
                      </button>
                      <CopyButton text={content} />
                      <DownloadButton text={content} filename={tab.filename!} />
                      {tab.hasPush && <PushButton />}
                    </div>
                  </div>
                  <pre className="bg-paper rounded-lg p-4 text-xs text-green-300 font-mono overflow-auto max-h-[520px] whitespace-pre-wrap border border-soft-line">
                    {content}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
