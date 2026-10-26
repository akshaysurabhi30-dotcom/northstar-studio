import { useEffect, useState } from 'react'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
const apiUrl = (path: string) => `${API_BASE_URL}${path}`

type SourceMode = 'auto' | 'mock' | 'real'
type Settings = { mode: SourceMode; real_data_ready: boolean; mock_data_ready: boolean }
const options = [
  { mode: 'auto', name: 'Automatic', description: 'Use real data when available. Use demo data otherwise.', tag: 'Default' },
  { mode: 'real', name: 'Real data', description: 'Official BasinATLAS catchments across the U.S.', tag: 'BasinATLAS' },
  { mode: 'mock', name: 'Demo data', description: 'Sample catchments near Mason, Ohio.', tag: 'For practice' },
] as const

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [failedMode, setFailedMode] = useState<SourceMode | null>(null)
  const load = async (signal?: AbortSignal) => {
    setError(''); setFailedMode(null)
    try {
      const response = await fetch(apiUrl('/api/settings/data-source'), { signal })
      if (!response.ok) throw new Error('Could not load settings.')
      const value = await response.json() as Settings
      if (!signal?.aborted) setSettings(value)
    } catch { if (!signal?.aborted) setError('Could not connect. Try again.') }
  }
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort() }, [])
  const choose = async (mode: SourceMode) => {
    setSaving(true); setError(''); setFailedMode(null); setStatus('Saving…')
    try {
      const response = await fetch(apiUrl('/api/settings/data-source'), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode }) })
      if (!response.ok) throw new Error('Could not save settings.')
      setSettings(await response.json() as Settings)
      setStatus('Saved')
    } catch { setError('Could not save. Try again.'); setFailedMode(mode); setStatus('') } finally { setSaving(false) }
  }
  return <main className="page-shell settings-page">
    <header className="page-heading"><h1>Settings</h1></header>
    <section className="settings-section" aria-label="Data source">
      <h2>Data source</h2>
      {error && <div className="error-card" role="alert"><p>{error}</p><button className="text-button" onClick={() => failedMode ? void choose(failedMode) : void load()}>Try again</button></div>}
      {!settings && !error && <div className="empty-state" role="status">Loading settings…</div>}
      {settings && <div className="settings-grid" aria-busy={saving}>
        {options.map((option) => {
          const available = option.mode === 'real' ? settings.real_data_ready : option.mode === 'mock' ? settings.mock_data_ready : true
          const selected = settings.mode === option.mode
          return <button key={option.mode} className={`source-option ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={() => void choose(option.mode)} disabled={saving || !available}>
            <span className="source-option-heading"><span>{option.name}</span><span className="source-option-marker" aria-hidden="true" /></span>
            <span className="source-option-copy">{option.description}</span>
            <span className={`badge ${available ? '' : 'badge-muted'}`}>{available ? option.tag : 'Unavailable'}</span>
          </button>
        })}
      </div>}
      <p className="settings-status" role="status">{status}</p>
      <details className="compact-details settings-note"><summary>Data details</summary><p>Real data uses HydroBASINS Level-12 polygons and BasinATLAS environmental attributes. Demo data uses synthetic catchments.</p><p>This setting applies to the running prediction service.</p></details>
    </section>
  </main>
}
