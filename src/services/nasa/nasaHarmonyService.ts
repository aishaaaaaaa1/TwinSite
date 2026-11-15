import type { CmrCollection } from './nasaCmrService'

export const NASA_HARMONY_BASE_URL = 'https://harmony.earthdata.nasa.gov'

export interface HarmonyCoverageRequest {
  collection: CmrCollection
  variable: string
  boundingBox: [west: number, south: number, east: number, north: number]
}

export function canSubsetWithHarmony(collection: CmrCollection): boolean {
  return collection.spatialSubsetting || collection.transformations
}

export async function requestHarmonyCoverage({
  collection,
  variable,
  boundingBox,
}: HarmonyCoverageRequest): Promise<Response> {
  if (!canSubsetWithHarmony(collection)) {
    throw new Error(
      `Harmony does not advertise spatial subsetting or transformations for ${collection.shortName} (${collection.conceptId}).`,
    )
  }
  if (!variable.trim()) throw new Error('A collection variable is required for a Harmony coverage request.')

  const url = new URL(
    `${NASA_HARMONY_BASE_URL}/${encodeURIComponent(collection.conceptId)}` +
    `/ogc-api-coverages/1.0.0/${encodeURIComponent(variable)}/coverage/rangeset`,
  )
  url.searchParams.set('bbox', boundingBox.join(','))

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`NASA Harmony coverage request failed with HTTP ${response.status} ${response.statusText}.`)
  }
  return response
}
