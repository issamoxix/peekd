import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Check, Loader, AlertCircle, Wifi, Building2 } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Config {
  company_name: string; project_id: string; brand_id: string
  alert_email: string; sentiment_drop_threshold: number
  min_sentiment_alert: number; scan_frequency_hours: number
}
interface Project { id: string; name: string; status?: string }
interface Brand { id: string; name: string; domain?: string; is_own?: boolean }

export default function Settings() {
  const qc = useQueryClient()
  const [form, setForm] = useState<Partial<Config>>({})
  const [testResult, setTestResult] = useState<{ status: string; message: string } | null>(null)

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

  useEffect(() => { if (config) setForm(config) }, [config])

  const save = useMutation({
    mutationFn: (data: Partial<Config>) => axios.post('/api/settings/configure', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['config'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) },
  })
  const testConnection = async () => {
    try { setTestResult(null); const res = await axios.post('/api/settings/test-connection'); setTestResult(res.data) }
    catch { setTestResult({ status: 'error', message: 'Connection failed' }) }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Configure your company and monitoring preferences</p>
      </div>

      {/* Company Name - Prominent */}
      <div className="bg-gray-900 rounded-xl border border-blue-500/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Company to Analyze</h2>
            <p className="text-xs text-gray-400">The brand/company name you want to monitor across AI models</p>
          </div>
        </div>
        <input type="text" value={form.company_name || ''} onChange={e => setForm({ ...form, company_name: e.target.value })}
          placeholder="Enter your company name (e.g., Acme Corp)" className="w-full bg-gray-800 border border-gray-700 text-white text-lg rounded-lg px-4 py-3 placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
      </div>

      {/* Peec Connection */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Peec AI Connection</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-sm text-gray-300">API Key configured via environment</span>
            </div>
            <button onClick={testConnection} className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-xs flex items-center gap-2">
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
            <label className="block text-sm text-gray-400 mb-1">
              Project {projects && <span className="text-gray-500">— {projects.length} available</span>}
            </label>
            <select value={form.project_id || ''} onChange={e => setForm({ ...form, project_id: e.target.value, brand_id: '' })}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2">
              <option value="">Select project...</option>
              {(projects ?? []).map(p => <option key={p.id} value={p.id}>{p.name}{p.status && p.status !== 'CUSTOMER' ? ` [${p.status}]` : ''}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Brand {brands && <span className="text-gray-500">— {brands.length} in project</span>}
            </label>
            <select value={form.brand_id || ''} onChange={e => setForm({ ...form, brand_id: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2">
              <option value="">Select brand...</option>
              {(brands ?? []).map(b => (
                <option key={b.id} value={b.id}>
                  {b.is_own ? '★ ' : ''}{b.name}{b.domain ? ` (${b.domain})` : ''}{b.is_own ? ' — your brand' : ''}
                </option>
              ))}
            </select>
            {brands && brands.some(b => b.is_own) && (
              <p className="text-xs text-gray-500 mt-1">★ marks your own brand (auto-detected from Peec).</p>
            )}
          </div>
        </div>
      </div>

      {/* Alert Settings */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Alert Thresholds</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Alert Email</label>
            <input type="email" value={form.alert_email || ''} onChange={e => setForm({ ...form, alert_email: e.target.value })}
              placeholder="alerts@yourcompany.com" className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Sentiment Drop Threshold: {form.sentiment_drop_threshold ?? 10} pts</label>
            <input type="range" min={5} max={30} value={form.sentiment_drop_threshold ?? 10} onChange={e => setForm({ ...form, sentiment_drop_threshold: Number(e.target.value) })} className="w-full" />
            <div className="flex justify-between text-xs text-gray-600"><span>5 (sensitive)</span><span>30 (relaxed)</span></div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Min Sentiment Alert Level: {form.min_sentiment_alert ?? 45}</label>
            <input type="range" min={0} max={50} value={form.min_sentiment_alert ?? 45} onChange={e => setForm({ ...form, min_sentiment_alert: Number(e.target.value) })} className="w-full" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Scan Frequency</label>
            <select value={form.scan_frequency_hours ?? 1} onChange={e => setForm({ ...form, scan_frequency_hours: Number(e.target.value) })}
              className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg px-3 py-2">
              {[1, 2, 4, 6, 12, 24].map(h => <option key={h} value={h}>Every {h} hour{h > 1 ? 's' : ''}</option>)}
            </select>
          </div>
        </div>
      </div>

      <button onClick={() => save.mutate(form)} disabled={save.isPending}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2">
        {save.isPending ? <Loader className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {save.isPending ? 'Saving...' : save.isSuccess ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  )
}
