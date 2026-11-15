export const NASA_POWER_CLIMATOLOGY_URL =
  'https://power.larc.nasa.gov/api/temporal/climatology/point'

const PARAMETER_CODES = ['T2M', 'T2M_MIN', 'T2M_MAX', 'PRECTOTCORR'] as const

export type PowerParameterCode = typeof PARAMETER_CODES[number]

export interface PowerMeasurement {
  code: PowerParameterCode
  name: string
  annualValue: number | null
  unit: string | null
  status: 'verified' | 'unavailable'
}

export interface PowerClimatology {
  latitude: number
  longitude: number
  dataset: string
  period: string
  sources: string[]
  retrievedAt: string
  measurements: PowerMeasurement[]
}

interface PowerResponse {
  geometry: { coordinates: [number, number, number?] }
  properties: { parameter: Record<string, Record<string, number>> }
  header: { title: string; range: string; sources: string[]; fill_value: number }
  parameters: Record<string, { units: string; longname: string }>
}

const cache = new Map<string, Promise<PowerClimatology>>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseResponse(value: unknown): PowerResponse {
  if (!isRecord(value) || !isRecord(value.geometry) || !Array.isArray(value.geometry.coordinates)) {
    throw new Error('NASA POWER returned an invalid response geometry.')
  }
  if (!isRecord(value.properties) || !isRecord(value.properties.parameter)) {
    throw new Error('NASA POWER response is missing parameter values.')
  }
  if (!isRecord(value.header) || !isRecord(value.parameters)) {
    throw new Error('NASA POWER response is missing dataset metadata.')
  }

  const { coordinates } = value.geometry
  const header = value.header
  if (
    typeof coordinates[0] !== 'number' ||
    !Number.isFinite(coordinates[0]) ||
    typeof coordinates[1] !== 'number' ||
    !Number.isFinite(coordinates[1]) ||
    typeof header.title !== 'string' ||
    typeof header.range !== 'string' ||
    !Array.isArray(header.sources) ||
    !header.sources.every((source) => typeof source === 'string') ||
    typeof header.fill_value !== 'number' ||
    !Number.isFinite(header.fill_value)
  ) {
    throw new Error('NASA POWER response is missing required provenance fields.')
  }

  const rawParameters = value.properties.parameter
  const rawMetadata = value.parameters
  const measurements: Record<string, Record<string, number>> = {}
  const parameterMetadata: PowerResponse['parameters'] = {}

  for (const code of PARAMETER_CODES) {
    const rawValues = rawParameters[code]
    measurements[code] = {}
    if (isRecord(rawValues)) {
      for (const [period, entry] of Object.entries(rawValues)) {
        if (typeof entry === 'number' && Number.isFinite(entry)) {
          measurements[code][period] = entry
        }
      }
    }

    const metadata = rawMetadata[code]
    parameterMetadata[code] = {
      units: isRecord(metadata) && typeof metadata.units === 'string' ? metadata.units : '',
      longname: isRecord(metadata) && typeof metadata.longname === 'string'
        ? metadata.longname
        : code,
    }
  }

  return {
    geometry: {
      coordinates: [
        coordinates[0],
        coordinates[1],
        typeof coordinates[2] === 'number' ? coordinates[2] : undefined,
      ],
    },
    properties: { parameter: measurements },
    header: {
      title: header.title,
      range: header.range,
      sources: header.sources,
      fill_value: header.fill_value,
    },
    parameters: parameterMetadata,
  }
}

function getAnnualValue(
  parameters: Record<string, Record<string, number>>,
  code: PowerParameterCode,
  fillValue: number,
): number | null {
  const value = parameters[code]?.ANN
  return typeof value === 'number' && Number.isFinite(value) && value !== fillValue
    ? value
    : null
}

async function requestClimatology(latitude: number, longitude: number): Promise<PowerClimatology> {
  const url = new URL(NASA_POWER_CLIMATOLOGY_URL)
  url.search = new URLSearchParams({
    parameters: PARAMETER_CODES.join(','),
    community: 'RE',
    longitude: String(longitude),
    latitude: String(latitude),
    format: 'JSON',
  }).toString()

  let response: Response | undefined
  let lastError: Error | undefined
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    try {
      response = await fetch(url, { signal: controller.signal })
    } catch (error) {
      lastError = error instanceof Error && error.name === 'AbortError'
        ? new Error('request timed out after 15 seconds')
        : error instanceof Error
          ? error
          : new Error(String(error))
      if (attempt === 2) {
        throw new Error(`NASA POWER climatology is unavailable: ${lastError.message}`)
      }
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)))
      continue
    } finally {
      clearTimeout(timeout)
    }

    if (response.ok) break
    lastError = new Error(`NASA POWER request failed with HTTP ${response.status}.`)
    if ((response.status < 500 && response.status !== 429) || attempt === 2) {
      throw new Error(`NASA POWER climatology is unavailable: ${lastError.message}`)
    }
    await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)))
  }

  if (!response?.ok) {
    throw new Error(`NASA POWER climatology is unavailable: ${lastError?.message ?? 'request failed'}`)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch (error) {
    throw new Error(`NASA POWER returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }

  const result = parseResponse(payload)
  const values = result.properties.parameter
  const fillValue = result.header.fill_value
  const measurements = PARAMETER_CODES.map((code): PowerMeasurement => {
    const metadata = result.parameters[code]
    const annualValue = getAnnualValue(values, code, fillValue)
    return {
      code,
      name: metadata?.longname ?? code,
      annualValue,
      unit: metadata?.units ?? null,
      status: annualValue === null || !metadata?.units ? 'unavailable' : 'verified',
    }
  })

  return {
    longitude: result.geometry.coordinates[0],
    latitude: result.geometry.coordinates[1],
    dataset: result.header.title,
    period: result.header.range,
    sources: result.header.sources,
    retrievedAt: new Date().toISOString(),
    measurements,
  }
}

export function fetchPowerClimatology(latitude: number, longitude: number): Promise<PowerClimatology> {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return Promise.reject(new Error('Latitude must be between -90 and 90 degrees.'))
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return Promise.reject(new Error('Longitude must be between -180 and 180 degrees.'))
  }

  const key = `${latitude.toFixed(5)},${longitude.toFixed(5)}`
  const cached = cache.get(key)
  if (cached) return cached

  const request = requestClimatology(latitude, longitude).catch((error: unknown) => {
    cache.delete(key)
    throw error
  })
  cache.set(key, request)
  return request
}
