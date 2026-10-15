import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ErrorCard, PredictionCard } from '../components/PredictionCard'
import { Icon } from '../components/Icon'
import { friendlyError, requestCatchments, requestPrediction, resolveLocation, today, type CatchmentCollection, type Coordinates, type Prediction } from '../services/prediction'

declare global { interface Window { L?: any } }
let leafletPromise: Promise<any> | null = null
function loadLeaflet(): Promise<any> {
  if (window.L) return Promise.resolve(window.L)
  if (leafletPromise) return leafletPromise
  const sources = ['https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js']
  leafletPromise = new Promise((resolve, reject) => {
    const attempt = (index: number) => {
      if (index === sources.length) { leafletPromise = null; reject(new Error('Could not load the map. Check your connection.')); return }
      const script = document.createElement('script')
      script.src = sources[index]
      script.onload = () => window.L ? resolve(window.L) : attempt(index + 1)
      script.onerror = () => { script.remove(); attempt(index + 1) }
      document.head.appendChild(script)
    }
    attempt(0)
  })
  return leafletPromise
}

export function ExploreMapPage() {
  const mapElement = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const layerRef = useRef<any>(null)
  const predictionRequest = useRef<AbortController | null>(null)
  const searchRequest = useRef<AbortController | null>(null)
  const selectionVersion = useRef(0)
  const mounted = useRef(false)
  const [mapReady, setMapReady] = useState(false)
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)
  const [search, setSearch] = useState('')
  const [date, setDate] = useState(today)
  const dateRef = useRef(date)
  dateRef.current = date
  const [gpsMessage, setGpsMessage] = useState('')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [error, setError] = useState<ReturnType<typeof friendlyError> | null>(null)
  const [errorSource, setErrorSource] = useState<'search' | 'prediction'>('prediction')
  const [loading, setLoading] = useState(false)
  const [loadingCatchments, setLoadingCatchments] = useState(false)
  const [catchmentError, setCatchmentError] = useState('')
  const [catchments, setCatchments] = useState<CatchmentCollection['features']>([])
  const [dataSource, setDataSource] = useState<CatchmentCollection['data_source'] | null>(null)

  const clearResult = () => { predictionRequest.current?.abort(); setPrediction(null); setError(null); setLoading(false) }
  const selectLocation = (point: Coordinates) => {
    selectionVersion.current += 1
    searchRequest.current?.abort()
    setSearching(false)
    clearResult()
    setCoordinates(point)
    setGpsMessage('')
  }
  const requestGps = () => {
    if (!navigator.geolocation) { setGpsMessage('Location is unavailable. Search or select a point.'); return }
    setGpsLoading(true); setGpsMessage('')
    const version = selectionVersion.current
    navigator.geolocation.getCurrentPosition((position) => {
      if (!mounted.current) return
      setGpsLoading(false)
      if (selectionVersion.current === version) selectLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude })
    }, () => {
      if (!mounted.current) return
      setGpsLoading(false)
      if (selectionVersion.current === version) setGpsMessage('Location is unavailable. Search or select a point.')
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 })
  }

  useEffect(() => {
    mounted.current = true
    let active = true
    loadLeaflet().then((L) => {
      if (!active || !mapElement.current) return
      const map = L.map(mapElement.current, { zoomControl: false }).setView([39.35, -84.31], 10)
      L.control.zoom({ position: 'bottomright' }).addTo(map)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map)
      map.on('click', (event: any) => active && selectLocation({ latitude: event.latlng.lat, longitude: event.latlng.lng }))
      mapRef.current = map
      setMapReady(true)
    }).catch(() => active && setCatchmentError('Could not load the map. Check your connection.'))
    requestGps()
    return () => { active = false; mounted.current = false; selectionVersion.current += 1; predictionRequest.current?.abort(); searchRequest.current?.abort(); mapRef.current?.remove(); mapRef.current = null }
  }, [])

  useEffect(() => {
    if (!mapReady || !coordinates || !mapRef.current || !window.L) return
    const map = mapRef.current; const L = window.L
    const controller = new AbortController()
    markerRef.current?.remove(); layerRef.current?.remove()
    markerRef.current = L.circleMarker([coordinates.latitude, coordinates.longitude], { radius: 8, color: '#ffffff', fillColor: '#087b69', fillOpacity: 1, weight: 3, interactive: false }).addTo(map)
    map.setView([coordinates.latitude, coordinates.longitude], 11, { animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches })
    setCatchments([]); setCatchmentError(''); setLoadingCatchments(true); setDataSource(null)
    requestCatchments(coordinates, controller.signal).then((collection) => {
      if (controller.signal.aborted) return
      layerRef.current = L.geoJSON(collection, {
        style: (feature: any) => feature?.properties?.selected
          ? { color: '#ae6910', weight: 3.5, fillColor: '#e7b45a', fillOpacity: .24 }
          : { color: '#276e65', weight: 2, fillColor: '#91c3b1', fillOpacity: .12 },
        onEachFeature: (feature: any, layer: any) => {
          const label = document.createElement('span')
          label.textContent = `Catchment ${String(feature.properties.hybas_id).replace(/\.0$/, '')}`
          layer.bindTooltip(label, { sticky: true })
        },
      }).addTo(map)
      markerRef.current?.bringToFront()
      setCatchments(collection.features); setDataSource(collection.data_source)
      if (collection.features.some((feature) => feature.properties.selected)) {
        void estimate(coordinates)
      } else {
        setCatchmentError('No catchment covers this location. Choose a nearby catchment.')
      }
    }).catch((caught) => {
      if (!controller.signal.aborted) {
        const problem = friendlyError(caught)
        setCatchmentError(`${problem.title}. ${problem.action}`)
      }
    }).finally(() => { if (!controller.signal.aborted) setLoadingCatchments(false) })
    return () => controller.abort()
  }, [coordinates, mapReady])

  const searchMap = async (event?: FormEvent) => {
    event?.preventDefault()
    searchRequest.current?.abort()
    const controller = new AbortController(); searchRequest.current = controller
    clearResult(); setSearching(true)
    // Stop a late GPS response from replacing a searched location.
    selectionVersion.current += 1
    try { const point = await resolveLocation(search, controller.signal); if (!controller.signal.aborted) selectLocation(point) }
    catch (caught) { if (!controller.signal.aborted) { setErrorSource('search'); setError(friendlyError(caught)) } }
    finally { if (!controller.signal.aborted) setSearching(false) }
  }
  const estimate = async (point: Coordinates) => {
    predictionRequest.current?.abort()
    const controller = new AbortController(); predictionRequest.current = controller
    setLoading(true); setError(null); setPrediction(null)
    try { const result = await requestPrediction(point, dateRef.current, controller.signal); if (!controller.signal.aborted) setPrediction(result) }
    catch (caught) { if (!controller.signal.aborted) { setErrorSource('prediction'); setError(friendlyError(caught)) } }
    finally { if (!controller.signal.aborted) setLoading(false) }
  }

  return <main className="page-shell map-page">
    <div className="page-heading"><h1>Explore the map</h1><button className="button-secondary" onClick={requestGps} disabled={gpsLoading}><Icon name="target" />{gpsLoading ? 'Locating…' : 'Use my location'}</button></div>
    <div className="map-workspace">
      <div className="map-stack">
        <form onSubmit={searchMap} className="map-search" aria-label="Find a location"><label className="sr-only" htmlFor="map-search">City, address, or coordinates</label><Icon name="search" /><input id="map-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="City, address, or coordinates" required /><button className="button" disabled={searching}>{searching ? 'Finding…' : 'Find'}</button></form>
        <div ref={mapElement} className="map-frame" aria-label="Catchment map. Use search to select a point with a keyboard." />
        {!mapReady && <div className="map-loading" role="status">{catchmentError || 'Loading map…'}</div>}
        <div className="catchment-legend"><span><i className="legend-selected" />Selected</span><span><i className="legend-nearby" />Nearby</span></div>
      </div>
      <aside className="map-panel">
        <div className="panel-heading"><h2>Your location</h2>{dataSource === 'mock' && <span className="badge badge-muted">Demo</span>}</div>
        {coordinates ? <>
          <p className="coordinates"><Icon name="pin" size={16} />{coordinates.latitude.toFixed(4)}, {coordinates.longitude.toFixed(4)}</p>
          <form onSubmit={(event) => { event.preventDefault(); void estimate(coordinates) }}>
            <div className="field"><label htmlFor="map-date">Date</label><input id="map-date" type="date" value={date} onChange={(event) => { clearResult(); setDate(event.target.value) }} required /></div>
            <button className="button full-width" disabled={loading || loadingCatchments || Boolean(catchmentError)}>{loadingCatchments ? 'Finding catchment…' : loading ? <><span className="spinner" />Estimating…</> : prediction ? <>Update estimate<Icon name="arrow" /></> : <>Get estimate<Icon name="arrow" /></>}</button>
          </form>
          <section className="nearby-catchments" aria-label="Nearest catchments" aria-busy={loadingCatchments}>
            <div className="panel-heading"><h3>Nearby catchments</h3>{catchments.length > 0 && <span className="count-badge">{Math.min(catchments.length, 3)}</span>}</div>
            {loadingCatchments && <p className="status-line" role="status">Finding catchments…</p>}
            {catchmentError && <div className="catchment-error" role="alert"><p className="inline-error">{catchmentError}</p><button type="button" className="text-button" onClick={() => setCoordinates({ ...coordinates })}>Try again</button></div>}
            {!loadingCatchments && !catchmentError && catchments.length === 0 && <p className="status-line">No nearby catchments found. Search another place.</p>}
            {catchments.slice(0, 3).map((catchment, index) => <button type="button" className={`catchment-choice ${catchment.properties.selected ? 'selected' : ''}`} key={catchment.properties.hybas_id} aria-pressed={catchment.properties.selected} aria-label={`Select catchment ${String(catchment.properties.hybas_id).replace(/\.0$/, '')} and estimate DOC`} onClick={() => selectLocation(catchment.properties.center)} disabled={!date}>
              <span className="catchment-number">{String(index + 1).padStart(2, '0')}</span><span><b>{String(catchment.properties.hybas_id).replace(/\.0$/, '')}</b><small>{catchment.properties.selected ? 'Selected' : `About ${catchment.properties.distance_km.toFixed(1)} km away`}</small></span><Icon name="arrow" size={16} />
            </button>)}
          </section>
        </> : <div className="map-empty"><span className="placeholder-symbol"><Icon name="pin" size={26} /></span><p>Select a point on the map.</p><button className="text-button" onClick={() => selectLocation({ latitude: 39.35, longitude: -84.36 })}>Try Mason, Ohio<Icon name="arrow" size={16} /></button></div>}
        {gpsMessage && <p className="status-line" role="status">{gpsMessage}</p>}
      </aside>
    </div>
    {loading && <section className="loading-card" role="status"><span className="spinner" />Preparing your result…</section>}
    {prediction && <PredictionCard prediction={prediction} />}
    {error && <ErrorCard error={error} onRetry={() => errorSource === 'search' ? void searchMap() : coordinates && void estimate(coordinates)} />}
  </main>
}
