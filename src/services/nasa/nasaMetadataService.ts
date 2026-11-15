import { fetchCmrCollection, searchCmrCollections } from './nasaCmrService'
import { fetchPdsLabel } from './nasaPdsService'

export async function discoverNasaDemCollection() {
  const collections = await searchCmrCollections('NASADEM_HGT')
  const collection = collections.find((entry) => entry.shortName === 'NASADEM_HGT')
  if (!collection) throw new Error('NASA CMR has no granule-bearing NASADEM_HGT collection.')
  return fetchCmrCollection(collection.conceptId)
}

export async function retrievePdsLabel(url: string): Promise<string> {
  const label = await fetchPdsLabel(url)
  if (!label.includes('PDS_VERSION_ID')) {
    throw new Error(`PDS product label at ${url} is missing PDS_VERSION_ID.`)
  }
  return label
}
