export type Coordinates = { latitude: number; longitude: number }

export const today = () => {
  const value = new Date()
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

export function validateCoordinates(point: Coordinates): Coordinates {
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude) || Math.abs(point.latitude) > 90 || Math.abs(point.longitude) > 180) {
    throw new PredictionError(422, 'Use latitude −90 to 90 and longitude −180 to 180.')
  }
  return point
}

export type Prediction = {
  doc_mg_l: number
  unit: string
  basin_id: string
  date: string
  inputs: Record<string, number | null>
  approximate_inputs: boolean
  data_source: 'mock' | 'BasinATLAS'
  notice: string
  watershed: {
    hybas_id: string
    area_upstream_km2: number
    elevation_mean_m_asl: number
    natural_discharge_m3_s: number
    glc2000_class: number | string | null
    mapped_land_cover: string
  }
  uncertainty: null
  method_note: string
  guidance: {
    source: 'openai'
    pets: string
    people: string
    actions: string[]
    resources: string[]
    note: string
  } | null
  guidance_error: string | null
}

export type CatchmentCollection = {
  type: 'FeatureCollection'
  selected_basin_id: string
  data_source: 'mock' | 'BasinATLAS'
  features: Array<{ type: 'Feature'; properties: { hybas_id: string; selected: boolean; center: Coordinates; distance_km: number }; geometry: object }>
}

export class PredictionError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
const apiUrl = (path: string) => `${API_BASE_URL}${path}`

export async function requestPrediction(coordinates: Coordinates, date: string, signal?: AbortSignal): Promise<Prediction> {
  validateCoordinates(coordinates)
  if (!date) throw new PredictionError(422, 'Choose a date.')
  const response = await fetch(apiUrl('/api/predict'), {
    signal,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...coordinates, date }),
  })
  const payload = await response.json().catch(() => null) as Prediction | { detail?: string } | null
  if (!response.ok) throw new PredictionError(response.status, payload && 'detail' in payload ? payload.detail ?? 'Prediction could not be completed.' : 'Prediction could not be completed.')
  return payload as Prediction
}

export async function requestCatchments(coordinates: Coordinates, signal?: AbortSignal): Promise<CatchmentCollection> {
  const query = new URLSearchParams({ latitude: String(coordinates.latitude), longitude: String(coordinates.longitude) })
  const response = await fetch(apiUrl(`/api/catchments?${query}`), { signal })
  const payload = await response.json().catch(() => null) as CatchmentCollection | { detail?: string } | null
  if (!response.ok) throw new PredictionError(response.status, payload && 'detail' in payload ? payload.detail ?? 'Catchment boundaries could not be loaded.' : 'Catchment boundaries could not be loaded.')
  return payload as CatchmentCollection
}

export async function resolveLocation(query: string, signal?: AbortSignal): Promise<Coordinates> {
  if (!query.trim()) throw new PredictionError(422, 'Enter a city, address, or coordinates.')
  const literal = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/)
  if (literal) return validateCoordinates({ latitude: Number(literal[1]), longitude: Number(literal[2]) })
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) throw new PredictionError(422, 'Place search is unavailable. Enter coordinates instead.')
  const places = await response.json() as Array<{ lat: string; lon: string }>
  if (!places.length) throw new PredictionError(422, 'No place found. Add a state or enter coordinates.')
  return validateCoordinates({ latitude: Number(places[0].lat), longitude: Number(places[0].lon) })
}

export function friendlyError(error: unknown): { title: string; detail: string; action: string } {
  const message = error instanceof Error ? error.message : 'Something unexpected happened.'
  const status = error instanceof PredictionError ? error.status : 0
  if (status === 503 || message.includes('BasinATLAS dataset')) return { title: 'Water data is unavailable', detail: message, action: 'Check your data source in Settings.' }
  if (status === 404) return { title: 'No catchment found', detail: message, action: 'Choose another place or check your data source in Settings.' }
  if (status === 422) return { title: 'Check your location or date', detail: message, action: message }
  return { title: 'Could not connect', detail: message, action: 'Check your connection and try again.' }
}
