import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ErrorCard, PredictionCard } from '../components/PredictionCard'
import { PageLink } from '../components/PageLink'
import { Icon } from '../components/Icon'
import { WatershedArt } from '../components/WatershedArt'
import { friendlyError, requestPrediction, resolveLocation, today, validateCoordinates, type Prediction } from '../services/prediction'

export function EstimatePage() {
  const [mode, setMode] = useState<'place' | 'coordinates'>('place')
  const [location, setLocation] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [date, setDate] = useState(today)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [error, setError] = useState<ReturnType<typeof friendlyError> | null>(null)
  const [loading, setLoading] = useState(false)
  const requestRef = useRef<AbortController | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => () => requestRef.current?.abort(), [])

  const clearResult = () => { requestRef.current?.abort(); setLoading(false); setPrediction(null); setError(null) }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true); setError(null); setPrediction(null)
    try {
      const point = mode === 'place' ? await resolveLocation(location, controller.signal) : validateCoordinates({ latitude: Number(latitude), longitude: Number(longitude) })
      const result = await requestPrediction(point, date, controller.signal)
      if (!controller.signal.aborted) setPrediction(result)
    } catch (caught) {
      if (!controller.signal.aborted) setError(friendlyError(caught))
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  return <main className="page-shell estimate-page">
    <div className="page-heading"><h1>Estimate DOC</h1><PageLink className="text-button" to="/explore"><Icon name="map" />Use the map<Icon name="arrow" size={16} /></PageLink></div>
    <div className="estimate-layout">
      <form ref={formRef} className="prediction-form card" onSubmit={submit} aria-label="DOC estimate">
        <h2>Your location</h2>
        <div className="segmented-control" role="group" aria-label="Location entry">
          <button type="button" aria-pressed={mode === 'place'} onClick={() => { clearResult(); setMode('place') }}>Place</button>
          <button type="button" aria-pressed={mode === 'coordinates'} onClick={() => { clearResult(); setMode('coordinates') }}>Coordinates</button>
        </div>
        {mode === 'place' ? <div className="field"><label htmlFor="location">City or address</label><div className="input-icon"><Icon name="search" /><input id="location" value={location} onChange={(event) => { clearResult(); setLocation(event.target.value) }} placeholder="Search a place" required autoComplete="off" /></div></div> : <div className="coordinate-fields">
          <div className="field"><label htmlFor="latitude">Latitude</label><input id="latitude" type="number" min="-90" max="90" step="any" value={latitude} onChange={(event) => { clearResult(); setLatitude(event.target.value) }} placeholder="39.3500" required /></div>
          <div className="field"><label htmlFor="longitude">Longitude</label><input id="longitude" type="number" min="-180" max="180" step="any" value={longitude} onChange={(event) => { clearResult(); setLongitude(event.target.value) }} placeholder="−84.3600" required /></div>
        </div>}
        <div className="field"><label htmlFor="prediction-date">Date</label><input id="prediction-date" type="date" value={date} onChange={(event) => { clearResult(); setDate(event.target.value) }} required /></div>
        <button className="button full-width" disabled={loading}>{loading ? <><span className="spinner" />Estimating…</> : <>Get estimate<Icon name="arrow" /></>}</button>
        <div className="sample-row"><span>Sample places</span><div><button className="sample-chip" type="button" onClick={() => { clearResult(); setMode('coordinates'); setLatitude('39.35'); setLongitude('-84.36') }}>Mason west</button><button className="sample-chip" type="button" onClick={() => { clearResult(); setMode('coordinates'); setLatitude('39.35'); setLongitude('-84.25') }}>Mason east</button></div></div>
      </form>
      <div className="estimate-output" aria-busy={loading}>
        {prediction ? <PredictionCard prediction={prediction} /> : error ? <ErrorCard error={error} onRetry={() => formRef.current?.requestSubmit()} /> : <section className={`result-placeholder ${loading ? 'is-loading' : ''}`}>
          <WatershedArt />
          <span className="placeholder-symbol"><Icon name={loading ? 'wave' : 'drop'} size={24} /></span>
          <h2 role="status">{loading ? 'Preparing your result…' : 'Your water, in focus.'}</h2>
          {!loading && <p>Choose a place to see its DOC estimate.</p>}
        </section>}
      </div>
    </div>
  </main>
}
