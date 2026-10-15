import { PageLink } from '../components/PageLink'

export function LearnPage() {
  return (
    <main className="page-shell learn-page">
      <section className="learn-hero" aria-labelledby="learn-title">
        <div className="learn-hero-copy">
          <h1 id="learn-title">Know your water.<br /><em>Care for your community.</em></h1>
          <p>Explore the carbon in your local water.</p>
          <div className="hero-actions">
            <PageLink className="button" to="/explore">Explore the map <span aria-hidden="true">→</span></PageLink>
            <PageLink className="button button-secondary" to="/estimate">Get an estimate</PageLink>
          </div>
        </div>
        <div className="water-art" aria-hidden="true">
          <i className="sun" />
          <i className="hill hill-one" />
          <i className="hill hill-two" />
          <i className="river river-one" />
          <i className="river river-two" />
        </div>
      </section>

      <section className="learn-grid" aria-label="Understand your water">
        <article className="card learn-card">
          <span className="learn-card-number" aria-hidden="true">01</span>
          <h2>Why water turns brown</h2>
          <p>Leaves and soil release dissolved organic carbon, or DOC, into water. Like tea, it can give water a brown color.</p>
        </article>
        <article className="card learn-card">
          <span className="learn-card-number" aria-hidden="true">02</span>
          <h2>Why it matters</h2>
          <p>DOC supports aquatic food webs. Higher levels can reduce light and make water treatment harder.</p>
        </article>
        <article className="card learn-card">
          <span className="learn-card-number" aria-hidden="true">03</span>
          <h2>Small actions help</h2>
          <p>Pick up pet waste. Keep litter out of storm drains. Follow fertilizer and pesticide labels.</p>
        </article>
      </section>

      <details className="compact-details learn-method">
        <summary>About the science</summary>
        <p>A trained model estimates DOC concentration in milligrams per liter (mg/L) from location, date, and catchment attributes.</p>
        <p>BasinATLAS supplies upstream drainage area, mean elevation, annual natural discharge, and dominant land cover for HydroBASINS Level-12 catchments.</p>
      </details>
    </main>
  )
}
