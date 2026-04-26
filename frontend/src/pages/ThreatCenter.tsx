import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { AlertTriangle, Zap, X, Filter, Target, TrendingUp, ShieldCheck, ShieldAlert, ShieldX, CheckCircle, Loader, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { cleanText, resolvePromptText } from '../utils/text'

interface Threat {
  id: string; type: string; severity: string; model: string; summary: string
  evidence: string; source_url?: string; auto_fixable: boolean; fix_type?: string
  status: string; detected_at: string; counter_strategy?: any; prompt_id?: string
}

interface DefensiveStep {
  priority: string; action: string; why: string
}

interface CompetitorEvent {
  id: string; competitor_name: string; event_type: string; severity: string
  affected_models: string[]; affected_prompts: string[]; opportunity_score: number
  gap_analysis?: {
    competitor_weakness: string
    your_position: string
    opportunity_potential: string
    brand_advantage?: {
      headline: string
      key_message: string
      content_angle: string
      social_proof: string
    }
  }
  defensive_playbook?: {
    headline: string
    steps: DefensiveStep[]
  }
  winning_strategies?: Array<{ tactic: string; action: string; timeline?: string }>
  recommended_actions: string[]; detected_at: string
}

interface ReputationQuestion {
  prompt_id: string; question: string; status: 'SAFE' | 'AT_RISK' | 'CRISIS'
  threat?: Threat; recommended_actions: string[]
}

const severityColors: Record<string, string> = {
  CRITICAL: 'bg-red-500', HIGH: 'bg-orange-500', MEDIUM: 'bg-yellow-500', LOW: 'bg-gray-500',
}
const modelColors: Record<string, string> = {
  chatgpt: 'bg-green-500', perplexity: 'bg-sage', gemini: 'bg-purple-500',
  claude: 'bg-orange-500', copilot: 'bg-cyan-500', grok: 'bg-red-500',
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'CRISIS') return <ShieldX className="w-5 h-5 text-red-500 flex-shrink-0" />
  if (status === 'AT_RISK') return <ShieldAlert className="w-5 h-5 text-yellow-500 flex-shrink-0" />
  return <ShieldCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === 'CRISIS'
    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
    : status === 'AT_RISK'
    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
    : 'bg-green-500/20 text-green-400 border border-green-500/30'
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>{status.replace('_', ' ')}</span>
}

export default function ThreatCenter() {
  const [tab, setTab] = useState<'reputation' | 'threats' | 'opportunities' | 'narrative'>('reputation')
  const [severity, setSeverity] = useState<string>('')
  const [model, setModel] = useState<string>('')
  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null)
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null)
  const [aiStrategies, setAiStrategies] = useState<Record<string, any>>({})
  const [loadingStrategies, setLoadingStrategies] = useState<Record<string, boolean>>({})
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

  const { data: competitorData } = useQuery({
    queryKey: ['competitors'],
    queryFn: async () => (await axios.get('/api/competitors')).data,
  })

  const { data: reputationData, isLoading: reputationLoading } = useQuery({
    queryKey: ['reputation-questions'],
    queryFn: async () => (await axios.get('/api/threats/reputation-questions')).data,
    refetchInterval: 60000,
  })

  const { data: configData } = useQuery<{ company_name: string }>({
    queryKey: ['config'],
    queryFn: async () => (await axios.get('/api/settings/config')).data,
    staleTime: 30000,
  })
  const brand = configData?.company_name || ''

  const { data: narrativeData, isLoading: narrativeLoading } = useQuery({
    queryKey: ['narrative'],
    queryFn: async () => (await axios.get('/api/threats/narrative')).data,
    enabled: tab === 'narrative',
    staleTime: 900000,
  })

  async function fetchAiStrategies(eventId: string) {
    if (aiStrategies[eventId] || loadingStrategies[eventId]) return
    setLoadingStrategies(prev => ({ ...prev, [eventId]: true }))
    try {
      const res = await axios.post(`/api/competitors/${eventId}/strategies`)
      setAiStrategies(prev => ({ ...prev, [eventId]: res.data }))
    } finally {
      setLoadingStrategies(prev => ({ ...prev, [eventId]: false }))
    }
  }

  const dismiss = useMutation({
    mutationFn: (id: string) => axios.patch(`/api/threats/${id}`, { status: 'DISMISSED' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['threats'] }); setSelectedThreat(null) },
  })

  const fix = useMutation({
    mutationFn: (id: string) => axios.post(`/api/threats/${id}/fix`),
  })

  const threats: Threat[] = data?.data ?? []
  const competitorEvents: CompetitorEvent[] = competitorData?.data ?? []
  const reputationQuestions: ReputationQuestion[] = reputationData?.questions ?? []
  const reputationConfigured: boolean = reputationData?.configured ?? false
  const reputationCount: number = reputationData?.total ?? 0
  const totalStrategyActions = threats.reduce((acc, t) => acc + ((t.counter_strategy?.priority_actions || []).length), 0)

  const filteredQuestions = reputationQuestions.filter(q => !(/^pr_/i.test(q.question)))
  const displayQuestion = (q: ReputationQuestion) => cleanText(resolvePromptText(q.question), brand)

  const crisisCount = filteredQuestions.filter(q => q.status === 'CRISIS').length
  const atRiskCount = filteredQuestions.filter(q => q.status === 'AT_RISK').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Threat Center</h1>
        <p className="text-muted text-sm mt-1">Reputation risk monitoring, counter-strategies, and competitor opportunities</p>
        {reputationConfigured ? (
          <div className="flex items-center gap-2 mt-3 text-xs text-sage bg-sage-soft border border-sage rounded-lg px-3 py-2 w-fit">
            <Filter className="w-3.5 h-3.5" />
            Scoped to <span className="font-semibold">{reputationCount} reputation risk questions</span> for this project
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-3 text-xs text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 w-fit">
            <AlertTriangle className="w-3.5 h-3.5" />
            No project prompts configured — select a project in <a href="/settings" className="underline font-semibold">Settings</a> to scope results
          </div>
        )}
      </div>

      <div className="flex gap-2 bg-panel rounded-lg p-1 border border-soft-line w-fit flex-wrap">
        {[
          { id: 'reputation', label: `Reputation Risks${crisisCount > 0 ? ` (${crisisCount} crisis)` : atRiskCount > 0 ? ` (${atRiskCount} at risk)` : ''}` },
          { id: 'threats', label: 'Active Threats' },
          { id: 'opportunities', label: 'Competitor Opportunities' },
          { id: 'narrative', label: 'Narrative Dashboard' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 rounded-md text-sm whitespace-nowrap ${tab === t.id ? 'bg-sage text-ink' : 'text-muted hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── REPUTATION RISKS TAB ── */}
      {tab === 'reputation' && (
        <div className="space-y-4">
          {!reputationConfigured ? (
            <div className="bg-panel rounded-xl border border-soft-line p-12 text-center">
              <ShieldCheck className="w-12 h-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-ink">No reputation risk questions configured</h3>
              <p className="text-muted text-sm mt-2">{reputationData?.message || 'Select a project in Settings to auto-generate 10 reputation risk questions.'}</p>
            </div>
          ) : reputationLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-panel rounded-xl border border-red-500/20 p-4">
                  <p className="text-xs text-muted">Crisis</p>
                  <p className="text-3xl font-bold text-red-400">{crisisCount}</p>
                </div>
                <div className="bg-panel rounded-xl border border-yellow-500/20 p-4">
                  <p className="text-xs text-muted">At Risk</p>
                  <p className="text-3xl font-bold text-yellow-400">{atRiskCount}</p>
                </div>
                <div className="bg-panel rounded-xl border border-green-500/20 p-4">
                  <p className="text-xs text-muted">Safe</p>
                  <p className="text-3xl font-bold text-green-400">{filteredQuestions.length - crisisCount - atRiskCount}</p>
                </div>
              </div>

              <div className="space-y-2">
                {filteredQuestions.map((q, idx) => (
                  <div key={q.prompt_id} className={`bg-panel rounded-xl border p-4 transition-colors ${
                    q.status === 'CRISIS' ? 'border-red-500/30' : q.status === 'AT_RISK' ? 'border-yellow-500/30' : 'border-soft-line'
                  }`}>
                    <div className="flex items-start gap-3">
                      <span className="text-muted text-sm font-mono mt-0.5 w-5 flex-shrink-0">{idx + 1}.</span>
                      <StatusIcon status={q.status} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-ink flex-1">{displayQuestion(q)}</p>
                          <StatusBadge status={q.status} />
                        </div>
                        {q.threat && (
                          <p className="text-xs text-muted mt-1">{cleanText(q.threat.evidence, brand)}</p>
                        )}
                        {q.recommended_actions.length > 0 && (
                          <button
                            onClick={() => setExpandedQuestionId(expandedQuestionId === q.prompt_id ? null : q.prompt_id)}
                            className="text-xs text-sage mt-2 hover:text-sage"
                          >
                            {expandedQuestionId === q.prompt_id ? 'Hide actions' : `Show ${q.recommended_actions.length} recommended actions`}
                          </button>
                        )}
                        {expandedQuestionId === q.prompt_id && q.recommended_actions.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {q.recommended_actions.map((action, i) => (
                              <li key={i} className="text-xs text-ink flex items-start gap-1.5">
                                <CheckCircle className="w-3.5 h-3.5 text-sage flex-shrink-0 mt-0.5" />
                                {action}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {q.threat && (
                        <button
                          onClick={() => setSelectedThreat(q.threat!)}
                          className="text-xs text-muted hover:text-ink flex-shrink-0"
                        >
                          Details
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── ACTIVE THREATS TAB ── */}
      {tab === 'threats' && (
        <>
          <div className="flex gap-3 items-center">
            <Filter className="w-4 h-4 text-muted" />
            <select value={severity} onChange={e => setSeverity(e.target.value)} className="bg-pearl border border-line text-ink text-sm rounded-lg px-3 py-2">
              <option value="">All Severity</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <select value={model} onChange={e => setModel(e.target.value)} className="bg-pearl border border-line text-ink text-sm rounded-lg px-3 py-2">
              <option value="">All Models</option>
              {['chatgpt', 'perplexity', 'gemini', 'claude', 'copilot', 'grok'].map(m => (
                <option key={m} value={m} className="capitalize">{m}</option>
              ))}
            </select>
            <span className="text-sm text-muted ml-auto">{threats.length} threats</span>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : threats.length === 0 ? (
            <div className="bg-panel rounded-xl border border-soft-line p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-ink">No threats found</h3>
              <p className="text-muted text-sm mt-2">No active threats match your filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {threats.map(t => (
                <div key={t.id} className="bg-panel rounded-xl border border-soft-line p-5 hover:border-line transition-colors cursor-pointer" onClick={() => setSelectedThreat(t)}>
                  <div className="flex items-start gap-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold text-ink ${severityColors[t.severity]}`}>{t.severity}</span>
                    <span className={`px-2 py-0.5 rounded text-xs text-ink capitalize ${modelColors[t.model] || 'bg-gray-600'}`}>{t.model}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink">{cleanText(t.summary, brand)}</p>
                      <p className="text-xs text-muted mt-1">{cleanText(t.evidence, brand)}</p>
                      {t.counter_strategy?.priority_actions?.length > 0 && (
                        <p className="text-xs text-sage mt-2">Quick Action: {t.counter_strategy.priority_actions[0]}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {t.auto_fixable && <Zap className="w-4 h-4 text-green-400" aria-label="Auto-fixable" />}
                      <span className="text-xs text-muted bg-pearl px-2 py-1 rounded">{t.type}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── COMPETITOR OPPORTUNITIES TAB ── */}
      {tab === 'opportunities' && (
        <div className="space-y-4">
          {competitorEvents.length === 0 ? (
            <div className="bg-panel rounded-xl border border-soft-line p-12 text-center">
              <Target className="w-12 h-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-ink">No competitor opportunities yet</h3>
            </div>
          ) : competitorEvents.map(e => (
            <div key={e.id} className="bg-panel rounded-xl border border-soft-line p-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-ink font-semibold text-base">{e.competitor_name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded font-medium mt-1 inline-block ${
                    e.event_type === 'SENTIMENT_CRISIS' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                  }`}>{e.event_type.replace('_', ' ')}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted">Opportunity score</p>
                  <p className="text-green-400 font-bold text-lg">{(e.opportunity_score * 100).toFixed(0)}%</p>
                </div>
              </div>

              {/* Quick summary */}
              {e.gap_analysis && (
                <p className="text-sm text-muted mt-3">{e.gap_analysis.competitor_weakness}</p>
              )}

              {/* Affected prompts chips */}
              {e.affected_prompts.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {e.affected_prompts.map((p, i) => {
                    const label = cleanText(resolvePromptText(p), brand)
                    return (
                      <span key={i} className="text-xs bg-pearl text-muted px-2 py-0.5 rounded">
                        {label.length > 60 ? label.slice(0, 60) + '…' : label}
                      </span>
                    )
                  })}
                </div>
              )}

              <button
                onClick={() => setExpandedEventId(expandedEventId === e.id ? null : e.id)}
                className="mt-3 text-sm text-sage hover:text-sage"
              >
                {expandedEventId === e.id ? 'Hide full playbook ↑' : 'Show full playbook ↓'}
              </button>

              {expandedEventId === e.id && (
                <div className="mt-4 space-y-4 text-sm">

                  {/* ── DEFENSIVE SECTION ── */}
                  {e.defensive_playbook && (
                    <div className="border border-yellow-500/30 rounded-xl p-4 bg-yellow-500/5">
                      <div className="flex items-center gap-2 mb-3">
                        <ShieldCheck className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                        <p className="text-yellow-300 font-semibold">{e.defensive_playbook.headline}</p>
                      </div>
                      <div className="space-y-3">
                        {e.defensive_playbook.steps.map((step, i) => (
                          <div key={i} className="bg-panel/60 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded font-medium flex-shrink-0 ${
                                step.priority === 'Immediate' ? 'bg-red-500/20 text-red-400' :
                                step.priority === 'This week' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-gray-700 text-muted'
                              }`}>{step.priority}</span>
                              <div>
                                <p className="text-ink">{step.action}</p>
                                <p className="text-muted text-xs mt-1 italic">{step.why}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── OFFENSIVE SECTION ── */}
                  {e.gap_analysis?.brand_advantage && (
                    <div className="border border-sage rounded-xl p-4 bg-blue-950/30">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-sage flex-shrink-0" />
                        <p className="text-sage font-semibold">{e.gap_analysis.brand_advantage.headline}</p>
                      </div>
                      <p className="text-ink text-xs mb-3">{e.gap_analysis.brand_advantage.key_message}</p>
                      <div className="space-y-1.5 text-xs">
                        <p className="text-muted"><span className="text-sage font-medium">Content angle: </span>{e.gap_analysis.brand_advantage.content_angle}</p>
                        <p className="text-muted"><span className="text-sage font-medium">Social proof: </span>{e.gap_analysis.brand_advantage.social_proof}</p>
                        <p className="text-muted"><span className="text-green-400 font-medium">Opportunity: </span>{e.gap_analysis.opportunity_potential}</p>
                      </div>
                    </div>
                  )}

                  {/* ── WINNING TACTICS ── */}
                  {(e.winning_strategies || []).length > 0 && (
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wide mb-2">Winning Tactics</p>
                      <div className="space-y-2">
                        {(e.winning_strategies || []).map((s, idx) => (
                          <div key={idx} className="border border-soft-line rounded-lg p-3 flex items-start gap-3">
                            <span className="text-xs bg-pearl text-muted px-2 py-0.5 rounded flex-shrink-0 mt-0.5">{s.timeline || '—'}</span>
                            <div>
                              <p className="text-ink">{s.action}</p>
                              <p className="text-muted text-xs capitalize">{s.tactic.replace(/_/g, ' ')}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── AI STRATEGIES ── */}
                  {!aiStrategies[e.id] ? (
                    <button
                      onClick={() => fetchAiStrategies(e.id)}
                      disabled={loadingStrategies[e.id]}
                      className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 border border-purple-500/20 rounded-lg px-4 py-2 bg-purple-500/5 disabled:opacity-50 w-full justify-center"
                    >
                      {loadingStrategies[e.id] ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {loadingStrategies[e.id] ? 'Generating AI strategies…' : 'Generate deep AI strategies'}
                    </button>
                  ) : (
                    <div className="border border-purple-500/20 rounded-xl p-4 bg-purple-950/20 space-y-4">
                      <div className="flex items-center gap-2 text-purple-300 text-sm font-semibold">
                        <Sparkles className="w-4 h-4" />
                        Claude AI Strategies for {e.competitor_name}
                      </div>

                      {/* Offensive plays */}
                      {aiStrategies[e.id].offensive_plays?.length > 0 && (
                        <div>
                          <p className="text-xs text-green-400 font-medium uppercase tracking-wide mb-2">Offensive Plays</p>
                          <div className="space-y-2">
                            {aiStrategies[e.id].offensive_plays.map((p: any, i: number) => (
                              <div key={i} className="bg-panel/60 rounded-lg p-3">
                                <div className="flex items-start gap-2">
                                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded flex-shrink-0">{p.timeline}</span>
                                  <div>
                                    <p className="text-ink text-sm font-medium">{p.play}</p>
                                    <p className="text-muted text-xs mt-0.5">{p.action}</p>
                                    {p.content_example && <p className="text-purple-300 text-xs mt-1 italic">"{p.content_example}"</p>}
                                    {p.channel && <p className="text-muted text-xs mt-0.5">Channel: {p.channel}</p>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Defensive checks */}
                      {aiStrategies[e.id].defensive_checks?.length > 0 && (
                        <div>
                          <p className="text-xs text-yellow-400 font-medium uppercase tracking-wide mb-2">Defensive Checks</p>
                          <div className="space-y-2">
                            {aiStrategies[e.id].defensive_checks.map((c: any, i: number) => (
                              <div key={i} className="bg-panel/60 rounded-lg p-3">
                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${c.priority === 'Immediate' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{c.priority}</span>
                                <p className="text-ink text-sm mt-1">{c.check}</p>
                                <p className="text-muted text-xs mt-0.5">{c.action}</p>
                                <p className="text-muted text-xs italic mt-0.5">{c.why}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Content brief */}
                      {aiStrategies[e.id].content_brief && (
                        <div className="bg-panel/60 rounded-lg p-3">
                          <p className="text-xs text-sage font-medium uppercase tracking-wide mb-2">Content Brief</p>
                          <p className="text-ink font-medium text-sm">{aiStrategies[e.id].content_brief.headline}</p>
                          <p className="text-muted text-xs mt-1">{aiStrategies[e.id].content_brief.angle}</p>
                          {aiStrategies[e.id].content_brief.target_queries?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {aiStrategies[e.id].content_brief.target_queries.map((q: string, i: number) => (
                                <span key={i} className="text-xs bg-sage-soft text-sage px-2 py-0.5 rounded">{q}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── NARRATIVE DASHBOARD TAB ── */}
      {tab === 'narrative' && (
        narrativeLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader className="w-8 h-8 text-sage animate-spin" />
            <p className="text-muted text-sm">Generating narrative analysis with AI…</p>
          </div>
        ) : !narrativeData?.configured ? (
          <div className="bg-panel rounded-xl border border-soft-line p-12 text-center">
            <TrendingUp className="w-12 h-12 text-muted mx-auto mb-4" />
            <p className="text-muted">{narrativeData?.message || 'Select a project in Settings first.'}</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Health overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`bg-panel rounded-xl border p-5 ${narrativeData.overall_health === 'CRITICAL' ? 'border-red-500/40' : narrativeData.overall_health === 'AT_RISK' ? 'border-yellow-500/40' : 'border-green-500/40'}`}>
                <p className="text-xs text-muted">Narrative health</p>
                <p className={`text-2xl font-bold mt-1 ${narrativeData.overall_health === 'CRITICAL' ? 'text-red-400' : narrativeData.overall_health === 'AT_RISK' ? 'text-yellow-400' : 'text-green-400'}`}>{narrativeData.overall_health}</p>
              </div>
              <div className="bg-panel rounded-xl border border-soft-line p-5">
                <p className="text-xs text-muted">Health score</p>
                <p className="text-2xl font-bold text-sage mt-1">{narrativeData.health_score}/100</p>
              </div>
              <div className="bg-panel rounded-xl border border-soft-line p-5">
                <p className="text-xs text-muted">Active threats</p>
                <p className="text-2xl font-bold text-red-400 mt-1">{threats.length}</p>
              </div>
              <div className="bg-panel rounded-xl border border-soft-line p-5">
                <p className="text-xs text-muted">Narrative actions</p>
                <p className="text-2xl font-bold text-green-400 mt-1">{totalStrategyActions}</p>
              </div>
            </div>

            {/* AI badge */}
            <div className="flex items-center gap-2 text-xs text-sage">
              <Sparkles className="w-3.5 h-3.5" />
              Analysis generated by Claude AI based on live Peec data
            </div>

            {/* Current narrative */}
            <div className="bg-panel rounded-xl border border-soft-line p-5">
              <p className="text-sm font-semibold text-ink mb-2">Current Narrative State</p>
              <p className="text-ink text-sm">{narrativeData.current_narrative}</p>
              {narrativeData.narrative_gap && (
                <div className="mt-3 pt-3 border-t border-soft-line">
                  <p className="text-xs text-yellow-400 font-medium mb-1">Narrative gap</p>
                  <p className="text-muted text-xs">{narrativeData.narrative_gap}</p>
                </div>
              )}
            </div>

            {/* Key messages */}
            {narrativeData.key_messages?.length > 0 && (
              <div className="bg-panel rounded-xl border border-soft-line p-5">
                <p className="text-sm font-semibold text-ink mb-3">Key Messages to Amplify</p>
                <ul className="space-y-2">
                  {narrativeData.key_messages.map((msg: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-ink">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      {msg}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 30-day plan */}
            {narrativeData['30_day_plan']?.length > 0 && (
              <div className="bg-panel rounded-xl border border-soft-line p-5">
                <p className="text-sm font-semibold text-ink mb-3">30-Day Narrative Plan</p>
                <div className="space-y-3">
                  {narrativeData['30_day_plan'].map((phase: any, i: number) => (
                    <div key={i} className="border border-soft-line rounded-lg p-3">
                      <p className="text-xs font-semibold text-sage mb-1">{phase.week} — {phase.focus}</p>
                      <ul className="space-y-1">
                        {(phase.actions || []).map((a: string, j: number) => (
                          <li key={j} className="text-xs text-muted">• {a}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* KPIs */}
            {narrativeData.kpis?.length > 0 && (
              <div className="bg-panel rounded-xl border border-soft-line p-5">
                <p className="text-sm font-semibold text-ink mb-3">Target KPIs</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {narrativeData.kpis.map((kpi: any, i: number) => (
                    <div key={i} className="bg-pearl/50 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted">{kpi.metric}</p>
                        <p className="text-xs text-muted mt-0.5">{kpi.timeline}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-muted text-sm">{kpi.current}</p>
                        <p className="text-green-400 font-semibold text-sm">→ {kpi.target}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}

      {/* ── THREAT DETAIL MODAL ── */}
      {selectedThreat && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedThreat(null)}>
          <div className="bg-panel rounded-xl border border-line w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-ink">Threat Detail</h2>
              <button onClick={() => setSelectedThreat(null)} className="text-muted hover:text-ink"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <span className={`px-2 py-1 rounded text-xs font-bold text-ink ${severityColors[selectedThreat.severity]}`}>{selectedThreat.severity}</span>
                <span className={`px-2 py-0.5 rounded text-xs text-ink capitalize ${modelColors[selectedThreat.model] || 'bg-gray-600'}`}>{selectedThreat.model}</span>
                <span className="text-xs text-muted bg-pearl px-2 py-1 rounded">{selectedThreat.type}</span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted mb-1">Summary</h3>
                <p className="text-ink">{cleanText(selectedThreat.summary, brand)}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted mb-1">Evidence</h3>
                <blockquote className="border-l-2 border-line pl-4 text-ink italic text-sm">{cleanText(selectedThreat.evidence, brand)}</blockquote>
              </div>
              {selectedThreat.counter_strategy && (
                <div className="bg-pearl rounded-lg p-4">
                  <h3 className="text-sm font-medium text-sage mb-2">Counter-Strategy: Reputation Defense Playbook</h3>
                  <p className="text-sm text-ink mb-2">{selectedThreat.counter_strategy.narrative_goal}</p>
                  <ul className="space-y-1 text-xs text-ink">
                    {(selectedThreat.counter_strategy.priority_actions || []).map((a: string, idx: number) => <li key={idx}>- {a}</li>)}
                  </ul>
                </div>
              )}
              <div className="flex gap-3 pt-4 border-t border-soft-line">
                {selectedThreat.auto_fixable && (
                  <button onClick={() => fix.mutate(selectedThreat.id)} disabled={fix.isPending} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-ink px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                    <Zap className="w-4 h-4" /> {fix.isPending ? 'Generating...' : 'Generate Fix'}
                  </button>
                )}
                <button onClick={() => dismiss.mutate(selectedThreat.id)} className="bg-gray-700 hover:bg-gray-600 text-ink px-4 py-2 rounded-lg text-sm">Dismiss</button>
              </div>
              {fix.data && (
                <div className="bg-pearl rounded-lg p-4 mt-4">
                  <h3 className="text-sm font-medium text-green-400 mb-2">Generated Fix</h3>
                  <pre className="text-xs text-ink whitespace-pre-wrap">{(fix.data as any).data?.fix_content}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
