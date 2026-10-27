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

    <section className="result-guidance" aria-label="Plain-language DOC guidance">
      <h3>What this means</h3>
      <p>For catchment {basinId(prediction.basin_id)} on {formatDate(prediction.date)}, the model estimates {formatNumber(prediction.doc_mg_l)} mg/L of DOC.</p>
      <p>DOC is carbon from plants and soil. This estimate can help compare carbon levels between watersheds. It does not test a water sample.</p>
      <p>Lower DOC is generally better for water clarity and can make treatment easier. Higher DOC is generally less favorable because it can darken water and make treatment harder.</p>
      {typeof prediction.doc_mg_l === 'number' && Number.isFinite(prediction.doc_mg_l) && <div className="doc-scale" role="img" aria-label={`DOC level scale from low to high. Estimate: ${formatNumber(prediction.doc_mg_l)} mg/L. Colors show DOC level, not water safety.`}>
        <div className="doc-scale-labels"><span>Low DOC</span><span>High DOC</span></div>
        <div className="doc-scale-track" aria-hidden="true">
          <span className="doc-scale-marker" style={{ left: `${Math.min(100, Math.max(0, prediction.doc_mg_l / 10 * 100))}%` }} />
        </div>
        <div className="doc-scale-values"><span>0 mg/L</span><span>10+ mg/L</span></div>
        <p className="doc-scale-note">Visual reference only. The colors do not show whether water is safe.</p>
      </div>}
      <p className="safety-warning"><strong>Warning:</strong> DOC is only one part of water quality. This estimate does not account for germs, metals, other chemicals, or local conditions. It cannot determine if water is safe to drink, swim in, or give to pets. Check local notices or use water testing.</p>
      <h4>What to do next</h4>
      <ul>
        <li>Check local health or water-agency notices before swimming. Keep people and pets away from water with an active warning, visible algae, or unusual color or foam.</li>
        <li>For tap water, read your utility’s annual water quality report. For a private well, contact a state-certified lab for testing.</li>
      </ul>
      <div className="guidance-links" aria-label="Trusted water resources">
        <a href="https://www.epa.gov/ccr/ccr-information-consumers" target="_blank" rel="noreferrer">EPA: Find your drinking water report</a>
        <a href="https://www.epa.gov/dwlabcert/contact-information-certification-programs-and-certified-laboratories-drinking-water" target="_blank" rel="noreferrer">EPA: Find a state-certified lab</a>
        <a href="https://www.cdc.gov/healthy-swimming/prevention/" target="_blank" rel="noreferrer">CDC: Check swimming precautions</a>
      </div>
    </section>
    {hasGuidance && <section className="result-guidance" aria-label="Additional location guidance">
      <h3>Local guidance</h3>
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
