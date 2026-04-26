import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Check, Loader, AlertCircle, Wifi, Building2 } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Config {
  company_name: string; project_id: string; brand_id: string
  alert_email: string; sentiment_drop_threshold: number
  min_sentiment_alert: number; scan_frequency_hours: number
  security_topic_enabled: boolean; security_topic_id: string
  custom_prompt_ids: string[]
}
interface Project { id: string; name: string; status?: string }
interface Brand { id: string; name: string; domain?: string; is_own?: boolean }
interface Topic { id: string; label: string }
interface Prompt { id: string; message: string; topics?: string[] }

export default function Settings() {
  const qc = useQueryClient()
  const [form, setForm] = useState<Partial<Config>>({})
  const [testResult, setTestResult] = useState<{ status: string; message: string } | null>(null)
  const [newTopicName, setNewTopicName] = useState('')
  const [newPromptMessage, setNewPromptMessage] = useState('')

  const { data: config } = useQuery<Config>({
    queryKey: ['config'],
    queryFn: async () => (await axios.get('/api/settings/config')).data,
  })
  const { data: projects } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: async () => (await axios.get('/api/settings/projects')).data,
  })
  const { data: brands } = useQuery<Brand[]>({
    queryKey: ['brands', form.project_id || config?.project_id],
    queryFn: async () => {
      const pid = form.project_id || config?.project_id
      if (!pid) return []
      return (await axios.get(`/api/settings/brands/${pid}`)).data
    },
    enabled: !!(form.project_id || config?.project_id),
  })
  const selectedBrandName = (brands ?? []).find(b => b.id === form.brand_id)?.name
  const currentProjectId = form.project_id || config?.project_id
  const { data: topics } = useQuery<Topic[]>({
    queryKey: ['topics', currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) return []
      return (await axios.get(`/api/settings/topics/${currentProjectId}`)).data
    },
    enabled: !!currentProjectId,
  })
  const { data: prompts } = useQuery<Prompt[]>({
    queryKey: ['prompts', currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) return []
      return (await axios.get(`/api/settings/prompts/${currentProjectId}`)).data
    },
    enabled: !!currentProjectId,
  })

  useEffect(() => { if (config) setForm(config) }, [config])

  // Auto-fill company name from the selected brand
  useEffect(() => {
    if (selectedBrandName) {
      setForm(prev => ({ ...prev, company_name: selectedBrandName }))
    }
  }, [selectedBrandName])

  const save = useMutation({
    mutationFn: (data: Partial<Config>) => axios.post('/api/settings/configure', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['config'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) },
  })
  const createTopic = useMutation({
    mutationFn: async () => {
      if (!currentProjectId || !newTopicName.trim()) return
      await axios.post('/api/settings/security/topic', { project_id: currentProjectId, name: newTopicName.trim() })
    },
    onSuccess: () => {
      setNewTopicName('')
      qc.invalidateQueries({ queryKey: ['topics', currentProjectId] })
    },
  })
  const createPrompt = useMutation({
    mutationFn: async () => {
      if (!currentProjectId || !newPromptMessage.trim()) return
      await axios.post('/api/settings/security/prompt', {
        project_id: currentProjectId,
        message: newPromptMessage.trim(),
        topic_id: form.security_topic_id || undefined,
      })
    },
    onSuccess: () => {
      setNewPromptMessage('')
      qc.invalidateQueries({ queryKey: ['prompts', currentProjectId] })
    },
  })
  const bootstrapRiskPrompts = useMutation({
    mutationFn: async (payload?: { project_id: string; brand_name?: string }) => {
      const project_id = payload?.project_id || currentProjectId
      if (!project_id) return null
      return (await axios.post('/api/settings/security/bootstrap-risk-prompts', {
        project_id,
        brand_name: payload?.brand_name || selectedBrandName || undefined,
      })).data
    },
    onSuccess: (result: any) => {
      if (!result) return
      setForm(prev => ({
        ...prev,
        security_topic_enabled: true,
        security_topic_id: result.topic_id,
        custom_prompt_ids: result.all_risk_prompt_ids || prev.custom_prompt_ids || [],
      }))
      qc.invalidateQueries({ queryKey: ['topics', currentProjectId] })
      qc.invalidateQueries({ queryKey: ['prompts', currentProjectId] })
      setTestResult({ status: 'success', message: result.message || 'Risk prompts ensured.' })
    },
    onError: (err: any) => {
      const detail = err?.response?.data?.detail || 'Failed to bootstrap risk prompts'
      setTestResult({ status: 'error', message: detail })
    },
  })
  const testConnection = async () => {
    try { setTestResult(null); const res = await axios.post('/api/settings/test-connection'); setTestResult(res.data) }
    catch { setTestResult({ status: 'error', message: 'Connection failed' }) }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-ink">Settings</h1>
        <p className="text-muted text-sm mt-1">Configure your company and monitoring preferences</p>
      </div>

      {/* Company Name - Prominent */}
      <div className="bg-panel rounded-xl border border-sage p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-sage-soft flex items-center justify-center">
            <Building2 className="w-5 h-5 text-sage" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink">Company to Analyze</h2>
            <p className="text-xs text-muted">The brand/company name you want to monitor across AI models</p>
          </div>
        </div>
        <input type="text" value={form.company_name || ''} onChange={e => setForm({ ...form, company_name: e.target.value })}
          placeholder="Enter your company name (e.g., Acme Corp)" className="w-full bg-pearl border border-line text-ink text-lg rounded-lg px-4 py-3 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
      </div>

      {/* Peec Connection */}
      <div className="bg-panel rounded-xl border border-soft-line p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Peec AI Connection</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-pearl/50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-ink">API Key configured via environment</span>
            </div>
            <button onClick={testConnection} className="bg-gray-700 hover:bg-gray-600 text-ink px-3 py-1.5 rounded-lg text-xs flex items-center gap-2">
              <Wifi className="w-3 h-3" /> Test Connection
            </button>
          </div>
          {testResult && (
            <div className={`text-sm flex items-center gap-2 ${testResult.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {testResult.status === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {testResult.message}
            </div>
          )}
          <div>
            <label className="block text-sm text-muted mb-1">
              Project {projects && <span className="text-muted">— {projects.length} available</span>}
            </label>
            <select value={form.project_id || ''} onChange={e => {
              const nextProjectId = e.target.value
              setForm(prev => ({ ...prev, project_id: nextProjectId, brand_id: '' }))
              if (nextProjectId) {
                bootstrapRiskPrompts.mutate({
                  project_id: nextProjectId,
                  brand_name: selectedBrandName || undefined,
                })
              }
            }}
              className="w-full bg-pearl border border-line text-ink text-sm rounded-lg px-3 py-2">
              <option value="">Select project...</option>
              {(projects ?? []).map(p => <option key={p.id} value={p.id}>{p.name}{p.status && p.status !== 'CUSTOMER' ? ` [${p.status}]` : ''}</option>)}
            </select>
            <div className="mt-2">
              <button
                onClick={() => bootstrapRiskPrompts.mutate(undefined)}
                disabled={!currentProjectId || bootstrapRiskPrompts.isPending}
                className="bg-sage hover:bg-sage disabled:opacity-50 text-ink px-3 py-2 rounded-lg text-xs"
              >
                {bootstrapRiskPrompts.isPending ? 'Adding risk prompts...' : 'Add/Refresh Risk Prompts (API + Haiku)'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">
              Brand {brands && <span className="text-muted">— {brands.length} in project</span>}
            </label>
            <select value={form.brand_id || ''} onChange={e => setForm({ ...form, brand_id: e.target.value })}
              className="w-full bg-pearl border border-line text-ink text-sm rounded-lg px-3 py-2">
              <option value="">Select brand...</option>
              {(brands ?? []).map(b => (
                <option key={b.id} value={b.id}>
                  {b.is_own ? '★ ' : ''}{b.name}{b.domain ? ` (${b.domain})` : ''}{b.is_own ? ' — your brand' : ''}
                </option>
              ))}
            </select>
            {brands && brands.some(b => b.is_own) && (
              <p className="text-xs text-muted mt-1">★ marks your own brand (auto-detected from Peec).</p>
            )}
          </div>
        </div>
      </div>

      {/* Alert Settings */}
      <div className="bg-panel rounded-xl border border-soft-line p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Alert Thresholds</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-muted mb-1">Alert Email</label>
            <input type="email" value={form.alert_email || ''} onChange={e => setForm({ ...form, alert_email: e.target.value })}
              placeholder="alerts@yourcompany.com" className="w-full bg-pearl border border-line text-ink text-sm rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Sentiment Drop Threshold: {form.sentiment_drop_threshold ?? 10} pts</label>
            <input type="range" min={5} max={30} value={form.sentiment_drop_threshold ?? 10} onChange={e => setForm({ ...form, sentiment_drop_threshold: Number(e.target.value) })} className="w-full" />
            <div className="flex justify-between text-xs text-muted"><span>5 (sensitive)</span><span>30 (relaxed)</span></div>
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Min Sentiment Alert Level: {form.min_sentiment_alert ?? 45}</label>
            <input type="range" min={0} max={50} value={form.min_sentiment_alert ?? 45} onChange={e => setForm({ ...form, min_sentiment_alert: Number(e.target.value) })} className="w-full" />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">Scan Frequency</label>
            <select value={form.scan_frequency_hours ?? 1} onChange={e => setForm({ ...form, scan_frequency_hours: Number(e.target.value) })}
              className="w-full bg-pearl border border-line text-ink text-sm rounded-lg px-3 py-2">
              {[1, 2, 4, 6, 12, 24].map(h => <option key={h} value={h}>Every {h} hour{h > 1 ? 's' : ''}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Security Analysis Configuration */}
      <div className="bg-panel rounded-xl border border-soft-line p-6">
        <h2 className="text-lg font-semibold text-ink mb-4">Security Analysis Configuration</h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between p-3 bg-pearl/40 rounded-lg border border-line">
            <div>
              <p className="text-sm text-ink font-medium">Use custom security prompts</p>
              <p className="text-xs text-muted">Limit analysis to selected security/fraud prompts</p>
            </div>
            <input
              type="checkbox"
              checked={!!form.security_topic_enabled}
              onChange={e => setForm({ ...form, security_topic_enabled: e.target.checked })}
              className="h-4 w-4"
            />
          </label>
          <div>
            <label className="block text-sm text-muted mb-1">Security Topic</label>
            <select
              value={form.security_topic_id || ''}
              onChange={e => setForm({ ...form, security_topic_id: e.target.value, custom_prompt_ids: [] })}
              className="w-full bg-pearl border border-line text-ink text-sm rounded-lg px-3 py-2"
            >
              <option value="">Select topic...</option>
              {(topics ?? []).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={newTopicName}
                onChange={e => setNewTopicName(e.target.value)}
                placeholder="Create topic (e.g. Security Threats & Fraud)"
                className="flex-1 bg-pearl border border-line text-ink text-sm rounded-lg px-3 py-2"
              />
              <button
                onClick={() => createTopic.mutate()}
                disabled={createTopic.isPending || !currentProjectId || !newTopicName.trim()}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-ink px-3 py-2 rounded-lg text-sm"
              >
                {createTopic.isPending ? 'Creating...' : 'Create Topic'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-muted mb-2">Custom Prompts (select at least 5)</label>
            <div className="mb-2 flex gap-2">
              <input
                type="text"
                value={newPromptMessage}
                onChange={e => setNewPromptMessage(e.target.value)}
                placeholder="Create prompt via API"
                className="flex-1 bg-pearl border border-line text-ink text-sm rounded-lg px-3 py-2"
              />
              <button
                onClick={() => createPrompt.mutate()}
                disabled={createPrompt.isPending || !currentProjectId || !newPromptMessage.trim()}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-ink px-3 py-2 rounded-lg text-sm"
              >
                {createPrompt.isPending ? 'Creating...' : 'Create Prompt'}
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto border border-line rounded-lg">
              {(prompts ?? []).filter(p => {
                if (!form.security_topic_id) return true
                return (p.topics || []).includes(form.security_topic_id)
              }).map(p => {
                const selected = (form.custom_prompt_ids || []).includes(p.id)
                return (
                  <label key={p.id} className="flex items-start gap-3 p-3 border-b border-soft-line last:border-b-0 hover:bg-pearl/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={e => {
                        const next = new Set(form.custom_prompt_ids || [])
                        if (e.target.checked) next.add(p.id)
                        else next.delete(p.id)
                        setForm({ ...form, custom_prompt_ids: Array.from(next) })
                      }}
                      className="mt-1 h-4 w-4"
                    />
                    <span className="text-sm text-ink">{p.message}</span>
                  </label>
                )
              })}
            </div>
            <p className="text-xs text-muted mt-2">Selected: {(form.custom_prompt_ids || []).length}</p>
          </div>
        </div>
      </div>

      <button onClick={() => save.mutate(form)} disabled={save.isPending}
        className="w-full bg-sage hover:bg-sage disabled:opacity-50 text-ink px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2">
        {save.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {save.isPending ? 'Saving...' : save.isSuccess ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  )
}
