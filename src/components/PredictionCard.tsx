import type { Prediction } from '../services/prediction'

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function textList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(text).filter(Boolean)
  const item = text(value)
  return item ? [item] : []
}

function formatNumber(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString(undefined, { maximumFractionDigits: 3 })
    : 'Not available'
}

function formatDate(value: string): string {
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function basinId(value: unknown): string {
  return value == null ? 'Not available' : String(value).replace(/\.0$/, '')
}

export function PredictionCard({ prediction }: { prediction: Prediction }) {
  const watershed = prediction.watershed
  const guidance = prediction.guidance
  const pets = text(guidance?.pets)
  const people = text(guidance?.people)
  const actions = textList(guidance?.actions)
  const resources = textList(guidance?.resources)
  const note = text(guidance?.note)
  const hasGuidance = Boolean(pets || people || actions.length || resources.length)
  const isDemo = prediction.data_source === 'mock'
  const source = isDemo ? 'Demo data' : prediction.data_source === 'BasinATLAS' ? 'BasinATLAS' : 'Source unavailable'
  const inputs = Object.entries(prediction.inputs ?? {})

  return <section className="result-card" aria-label="DOC result">
    <div className="result-heading">
      <h2>DOC estimate</h2>
      <span className={`source-badge ${isDemo ? 'demo' : 'real'}`}>{source}</span>
    </div>
    <div className="result-value" role="status" aria-live="polite">
      <span>{formatNumber(prediction.doc_mg_l)}</span>
      <small>{prediction.unit}</small>
    </div>
    <div className="result-meta">
      <time dateTime={prediction.date}>{formatDate(prediction.date)}</time>
      <span>Catchment {basinId(prediction.basin_id)}</span>
    </div>

    {hasGuidance ? <section className="result-guidance" aria-label="Water guidance">
      <h3>What you can do</h3>
      <div className="guidance-sections">
        {actions.length > 0 && <details className="guidance-section" open>
          <summary>Help your water</summary>
          <ul>{actions.map((action, index) => <li key={index}>{action}</li>)}</ul>
        </details>}
        {people && <details className="guidance-section" open>
          <summary>People</summary>
          <p>{people}</p>
        </details>}
        {pets && <details className="guidance-section" open>
          <summary>Pets</summary>
          <p>{pets}</p>
        </details>}
        {resources.length > 0 && <details className="guidance-section" open>
          <summary>Learn more</summary>
          <ul>{resources.map((resource, index) => <li key={index}>{resource}</li>)}</ul>
        </details>}
      </div>
    </section> : <section className="guidance-error" role="status">
      <h3>Guidance is unavailable</h3>
      <p>{prediction.guidance_error || 'Try the estimate again.'}</p>
    </section>}

    <details className="technical-details" open>
      <summary>Technical details</summary>
      <dl className="input-grid">
        <div><dt>HYBAS_ID</dt><dd>{basinId(watershed?.hybas_id ?? prediction.basin_id)}</dd></div>
        <div><dt>Upstream drainage area</dt><dd>{formatNumber(watershed?.area_upstream_km2)}{watershed?.area_upstream_km2 != null && ' km²'}</dd></div>
        <div><dt>Mean elevation</dt><dd>{formatNumber(watershed?.elevation_mean_m_asl)}{watershed?.elevation_mean_m_asl != null && ' m ASL'}</dd></div>
        <div><dt>Mean annual natural discharge</dt><dd>{formatNumber(watershed?.natural_discharge_m3_s)}{watershed?.natural_discharge_m3_s != null && ' m³/s'}</dd></div>
        <div><dt>GLC2000 class code</dt><dd>{watershed?.glc2000_class ?? 'Not available'}</dd></div>
        <div><dt>Mapped land-cover class</dt><dd>{text(watershed?.mapped_land_cover) || 'unknown'}</dd></div>
      </dl>
      {prediction.approximate_inputs && <p>Spatial predictors use approximate mappings from watershed attributes to model features.</p>}
      {note && <p>{note}</p>}
      {inputs.length > 0 && <div className="table-scroll" role="region" aria-label="Model inputs" tabIndex={0}>
        <table className="model-inputs-table">
          <caption>Model input vector</caption>
          <thead><tr><th scope="col">Feature</th><th scope="col">Value</th></tr></thead>
          <tbody>{inputs.map(([feature, value]) => <tr key={feature}>
            <th scope="row">{feature}</th>
            <td>{value == null || !Number.isFinite(value) ? 'Missing (imputed)' : String(value)}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </details>
  </section>
}

export function ErrorCard({ error, onRetry }: { error: { title: string; detail: string; action: string }; onRetry?: () => void }) {
  const showDetails = error.detail && error.detail !== error.title && error.detail !== error.action
  return <section className="error-card" role="alert">
    <h2>{error.title}</h2>
    <p>{error.action}</p>
    {showDetails && <details className="error-details"><summary>Error details</summary><p>{error.detail}</p></details>}
    {onRetry && <button className="text-button" onClick={onRetry}>Try again</button>}
  </section>
}
