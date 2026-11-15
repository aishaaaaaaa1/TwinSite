export const NASA_CMR_BASE_URL = 'https://cmr.earthdata.nasa.gov/search'

export interface CmrCollection {
  conceptId: string
  shortName: string
  version: string
  title: string
  datasetId: string
  temporalStart: string | null
  spatialSubsetting: boolean
  transformations: boolean
  raw: Record<string, unknown>
}

export interface CmrGranule {
  conceptId: string
  producerGranuleId: string
  title: string
  datasetId: string
  timeStart: string | null
  timeEnd: string | null
  dataUrl: string | null
  raw: Record<string, unknown>
}

export interface CmrRegion {
  latitude: number
  longitude: number
  boundingBox?: [west: number, south: number, east: number, north: number]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`NASA CMR response is missing ${field}.`)
  }
  return value
}

async function requestJson(url: URL): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`NASA CMR request failed with HTTP ${response.status} ${response.statusText}.`)
  }

  try {
    return await response.json() as unknown
  } catch (error) {
    throw new Error(`NASA CMR returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export function parseCmrCollection(value: unknown): CmrCollection {
  if (!isRecord(value)) throw new Error('NASA CMR collection metadata is not an object.')
  return {
    conceptId: requireString(value.id, 'collection concept ID'),
    shortName: requireString(value.short_name, 'collection short name'),
    version: requireString(value.version_id, 'collection version'),
    title: requireString(value.entry_title, 'collection title'),
    datasetId: typeof value.dataset_id === 'string' ? value.dataset_id : '',
    temporalStart: typeof value.time_start === 'string' ? value.time_start : null,
    spatialSubsetting: value.has_spatial_subsetting === true,
    transformations: value.has_transforms === true,
    raw: value,
  }
}

function getDataUrl(links: unknown): string | null {
  if (!Array.isArray(links)) return null
  const link = links.find((item) =>
    isRecord(item) &&
    typeof item.href === 'string' &&
    typeof item.rel === 'string' &&
    item.rel.endsWith('/data#'),
  )
  return isRecord(link) && typeof link.href === 'string' ? link.href : null
}

export function parseCmrGranule(value: unknown): CmrGranule {
  if (!isRecord(value)) throw new Error('NASA CMR granule metadata is not an object.')
  return {
    conceptId: requireString(value.id, 'granule concept ID'),
    producerGranuleId: typeof value.producer_granule_id === 'string' ? value.producer_granule_id : '',
    title: typeof value.title === 'string' ? value.title : '',
    datasetId: typeof value.dataset_id === 'string' ? value.dataset_id : '',
    timeStart: typeof value.time_start === 'string' ? value.time_start : null,
    timeEnd: typeof value.time_end === 'string' ? value.time_end : null,
    dataUrl: getDataUrl(value.links),
    raw: value,
  }
}

export async function searchCmrCollections(
  shortName: string,
  pageSize = 20,
): Promise<CmrCollection[]> {
  const url = new URL(`${NASA_CMR_BASE_URL}/collections.json`)
  url.search = new URLSearchParams({
    short_name: shortName,
    has_granules: 'true',
    page_size: String(pageSize),
  }).toString()
  const payload = await requestJson(url)
  if (!isRecord(payload) || !isRecord(payload.feed) || !Array.isArray(payload.feed.entry)) {
    throw new Error('NASA CMR collection search returned an invalid feed.')
  }
  return payload.feed.entry.map(parseCmrCollection)
}

export async function fetchCmrCollection(conceptId: string): Promise<CmrCollection> {
  const payload = await requestJson(new URL(`${NASA_CMR_BASE_URL}/concepts/${encodeURIComponent(conceptId)}.json`))
  return parseCmrCollection(payload)
}

export async function searchCmrGranules(
  collectionConceptId: string,
  region: CmrRegion,
  pageSize = 100,
): Promise<CmrGranule[]> {
  const url = new URL(`${NASA_CMR_BASE_URL}/granules.json`)
  const params = new URLSearchParams({
    collection_concept_id: collectionConceptId,
    page_size: String(pageSize),
    online_only: 'true',
  })
  if (region.boundingBox) {
    params.set('bounding_box', region.boundingBox.join(','))
  } else {
    params.set('point', `${region.longitude},${region.latitude}`)
  }
  url.search = params.toString()

  const payload = await requestJson(url)
  if (!isRecord(payload) || !isRecord(payload.feed) || !Array.isArray(payload.feed.entry)) {
    throw new Error('NASA CMR granule search returned an invalid feed.')
  }
  return payload.feed.entry.map(parseCmrGranule)
}
