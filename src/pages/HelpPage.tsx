import { PageLink } from '../components/PageLink'

const solutions = [
  {
    title: 'My location is unavailable',
    answer: 'Search for a place or click the map. To use GPS, allow location access in your browser settings.',
  },
  {
    title: 'I cannot find a place',
    answer: 'Enter a city and state, such as Mason, Ohio. You can also enter coordinates: 39.36, -84.31.',
  },
  {
    title: 'No catchment covers my location',
    answer: 'Real data covers U.S. catchments. Demo data includes sample areas near Mason, Ohio. Choose a nearby catchment or change the data source.',
  },
  {
    title: 'Real data is unavailable',
    answer: 'Choose Demo data in Settings to try the app. The app owner must prepare the BasinATLAS dataset to enable real data.',
  },
  {
    title: 'My estimate will not load',
    answer: 'Check your connection and try again. If the error stays, ask the app owner to restart the prediction service.',
  },
  {
    title: 'Guidance is unavailable',
    answer: 'Try the estimate again. If guidance still fails, ask the app owner to check the OpenAI connection.',
  },
]

export function HelpPage() {
  return (
    <main className="page-shell help-page">
      <header className="page-heading"><h1>Help</h1></header>

      <section className="help-list" aria-label="Common problems">
        {solutions.map(({ title, answer }) => (
          <details className="compact-details help-item" key={title}>
            <summary>{title}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </section>

      <div className="hero-actions help-actions">
        <PageLink className="button" to="/explore">Back to map <span aria-hidden="true">→</span></PageLink>
        <PageLink className="button button-secondary" to="/settings">Data settings</PageLink>
      </div>

      <details className="compact-details help-setup">
        <summary>App owner setup</summary>
        <h2>Start the app</h2>
        <p>Run each command in a separate terminal from the project folder.</p>
        <pre><code>npm run dev</code></pre>
        <pre><code>python -m uvicorn api.app:app --host 127.0.0.1 --port 8000</code></pre>

        <h2>Prepare real data</h2>
        <p>Place the extracted official geodatabase at <code>data/raw/BasinATLAS_v10.gdb</code>.</p>
        <pre><code>python scripts/build_hydroatlas_dataset.py</code></pre>
        <p>The script creates <code>data/processed/basins.parquet</code>. Restart the API, then select Real data in Settings.</p>

        <h2>Connect guidance</h2>
        <p>Set <code>OPENAI_API_KEY</code> in the project’s <code>.env</code> file. Restart the API after saving changes.</p>
      </details>
    </main>
  )
}
