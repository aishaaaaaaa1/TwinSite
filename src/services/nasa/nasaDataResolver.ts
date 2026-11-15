import type { Planet } from '@/types'
import { discoverNasaDemCollection, retrievePdsLabel } from './nasaMetadataService'
import { searchCmrGranules } from './nasaCmrService'
import { fetchPdsProduct, searchPdsProducts } from './nasaPdsService'
import {
  calculateTerrainStatistics,
  decodeHgtTile,
  decodeHgtZip,
  decodePdsRaster,
  parsePdsRasterLabel,
} from './nasaTerrainService'
import type { NasaTerrainResult, RasterGrid, RegionGeometry } from './nasaTypes'
import { NasaDatasetError } from './nasaTypes'
import { getEarthdataToken } from './earthdataAuth'

const PDS_PRODUCTS = {
  moon: {
    service: 'NASA LOLA Data Node (linked by the NASA PDS Geosciences Node)',
    dataset: 'LRO Lunar Orbiter Laser Altimeter Gridded Data Records',
    productId: 'LDEM_4',
    labelUrl: 'https://imbrium.mit.edu/DATA/LOLA_GDR/CYLINDRICAL/IMG/LDEM_4.LBL',
    dataUrl: 'https://imbrium.mit.edu/DATA/LOLA_GDR/CYLINDRICAL/IMG/LDEM_4.IMG',
    bodyRadiusMeters: 1_737_400,
    resolutionLabel: '4 pixels/degree; 7,580.84 m/pixel at the equator',
  },
  mars: {
    service: 'NASA PDS Geosciences Node',
    dataset: 'MGS-M-MOLA-5-MEGDR-L3-V1.0',
    productId: 'MEGT90N000CB.IMG',
    labelUrl: 'https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg004/megt90n000cb.lbl',
    dataUrl: 'https://pds-geosciences.wustl.edu/mgs/mgs-m-mola-5-megdr-l3-v1/mgsl_300x/meg004/megt90n000cb.img',
    bodyRadiusMeters: 3_396_000,
    resolutionLabel: '4 pixels/degree; 14,818 m/pixel at the equator',
  },
} as const

const rasterCache = new Map<string, Promise<RasterGrid>>()

async function fetchCachedRaster(url: string, load: () => Promise<RasterGrid>): Promise<RasterGrid> {
  const cached = rasterCache.get(url)
  if (cached) return cached
  const pending = load().catch((error: unknown) => {
    rasterCache.delete(url)
    throw error
  })
  rasterCache.set(url, pending)
  return pending
}

function getTileOrigin(producerGranuleId: string): { south: number; west: number } {
  const match = producerGranuleId.match(/_([ns])(\d{2})([ew])(\d{3})$/i)
  if (!match) throw new Error(`Cannot determine the NASADEM tile origin from granule ID ${producerGranuleId}.`)
  const [, latitudeHemisphere, latitude, longitudeHemisphere, longitude] = match
  return {
    south: (latitudeHemisphere.toLowerCase() === 's' ? -1 : 1) * Number(latitude),
    west: (longitudeHemisphere.toLowerCase() === 'w' ? -1 : 1) * Number(longitude),
  }
}

async function loadEarthRasters(geometry: RegionGeometry): Promise<{
  grids: RasterGrid[]
  collection: Awaited<ReturnType<typeof discoverNasaDemCollection>>
  granules: Awaited<ReturnType<typeof searchCmrGranules>>
}> {
  const earthdataToken = getEarthdataToken()
  if (!earthdataToken) {
    throw new Error('NASA Earth measurements require a NASA Earthdata user token.')
  }
  const collection = await discoverNasaDemCollection()
  const coordinates = geometry.type === 'Point'
    ? geometry.coordinates
    : geometry.coordinates[0]?.[0]
  if (!coordinates) throw new Error('Selected polygon has no coordinates.')
  const boundingBox = geometry.type === 'Point'
    ? undefined
    : geometry.coordinates[0].reduce<[number, number, number, number]>(
        ([west, south, east, north], [longitude, latitude]) => [
          Math.min(west, longitude),
          Math.min(south, latitude),
          Math.max(east, longitude),
          Math.max(north, latitude),
        ],
        [Infinity, Infinity, -Infinity, -Infinity],
      )
  const granules = await searchCmrGranules(collection.conceptId, {
    longitude: coordinates[0],
    latitude: coordinates[1],
    ...(boundingBox ? { boundingBox } : {}),
  })
  if (granules.length === 0) throw new Error('NASA CMR found no NASADEM granules covering the selected region.')

  const grids = await Promise.all(granules.map(async (granule) => {
    if (!granule.dataUrl) throw new Error(`CMR granule ${granule.conceptId} has no data access URL.`)
    return fetchCachedRaster(granule.dataUrl, async () => {
      const response = await fetch(`/api/nasadem/${encodeURIComponent(granule.producerGranuleId)}`, {
        headers: { Authorization: `Bearer ${earthdataToken}` },
      })
      if (!response.ok) {
        const error = new Error(`NASA Earthdata proxy returned HTTP ${response.status}: ${await response.text()}`)
        Object.assign(error, { authenticationRequired: response.status === 401 || response.status === 403 })
        throw error
      }
      const zip = await response.arrayBuffer()
      const hgt = await decodeHgtZip(zip)
      const origin = getTileOrigin(granule.producerGranuleId)
      return decodeHgtTile(hgt, origin.south, origin.west)
    })
  }))
  return { grids, collection, granules }
}

async function loadPdsRaster(body: 'moon' | 'mars') {
  const product = PDS_PRODUCTS[body]
  const pdsSearch = await searchPdsProducts(body === 'moon' ? 'LOLA LDEM lunar elevation' : 'MOLA MEGDR Mars elevation')
  const labelText = await retrievePdsLabel(product.labelUrl)
  const label = parsePdsRasterLabel(labelText)
  if (!label.productId.toUpperCase().includes(product.productId.split('.')[0])) {
    throw new Error(`PDS label product ID ${label.productId} does not match the requested product ${product.productId}.`)
  }
  const raster = await fetchCachedRaster(product.dataUrl, async () => {
    const data = await fetchPdsProduct(product.dataUrl)
    return decodePdsRaster(data, label)
  })
  return { product, pdsSearch, label, raster }
}

export async function resolveNasaTerrain(
  body: Planet,
  geometry: RegionGeometry,
): Promise<NasaTerrainResult> {
  if (body === 'earth') {
    try {
      const { grids, collection, granules } = await loadEarthRasters(geometry)
      const statistics = calculateTerrainStatistics(grids, geometry, 6_378_137)
      return {
        metadata: {
          body,
          service: 'NASA Earthdata CMR / NASADEM',
          dataset: collection.title,
          productId: collection.shortName,
          collectionId: collection.conceptId,
          acquisitionPeriod: collection.temporalStart,
          resolutionMeters: 30,
          resolutionLabel: '1 arc-second (~30 m at the equator)',
          units: 'meters',
          sourceUrl: granules[0]?.dataUrl ?? '',
          labelUrl: null,
          sourceMetadata: {
            collection: collection.raw,
            granules: granules.map((granule) => granule.raw),
            harmonySpatialSubsetting: collection.spatialSubsetting,
            harmonyTransformations: collection.transformations,
          },
        },
        statistics,
        retrievedAt: new Date().toISOString(),
        retrievalStatus: 'retrieved',
        processingStatus: 'complete',
      }
    } catch (error) {
      const auth = error instanceof Error && 'authenticationRequired' in error &&
        error.authenticationRequired === true
      throw new NasaDatasetError('NASA scientific data unavailable for this region.', {
        service: 'NASA Earthdata CMR / NASADEM',
        dataset: 'NASADEM_HGT',
        datasetExists: true,
        regionCovered: error instanceof Error && error.message.includes('no NASADEM granules') ? false : null,
        authenticationRequired: Boolean(auth),
        retrievalError: error instanceof Error ? error.message : String(error),
      })
    }
  }

  try {
    const { product, pdsSearch, label, raster } = await loadPdsRaster(body)
    const statistics = calculateTerrainStatistics([raster], geometry, product.bodyRadiusMeters)
    return {
      metadata: {
        body,
        service: product.service,
        dataset: product.dataset,
        productId: label.productId,
        collectionId: label.raw.DATA_SET_ID ?? null,
        acquisitionPeriod: label.acquisitionStart && label.acquisitionStop
          ? `${label.acquisitionStart} – ${label.acquisitionStop}`
          : null,
        resolutionMeters: raster.pixelSizeMetersAtEquator,
        resolutionLabel: product.resolutionLabel,
        units: label.units,
        sourceUrl: product.dataUrl,
        labelUrl: product.labelUrl,
        sourceMetadata: {
          label: label.raw,
          pdsSearchUrl: pdsSearch.queryUrl,
          pdsSearchResponse: pdsSearch.raw,
        },
      },
      statistics,
      retrievedAt: new Date().toISOString(),
      retrievalStatus: 'retrieved',
      processingStatus: 'complete',
    }
  } catch (error) {
    throw new NasaDatasetError('NASA scientific data unavailable for this region.', {
      service: PDS_PRODUCTS[body].service,
      dataset: PDS_PRODUCTS[body].dataset,
      productId: PDS_PRODUCTS[body].productId,
      datasetExists: null,
      regionCovered: null,
      authenticationRequired: false,
      retrievalError: error instanceof Error ? error.message : String(error),
    })
  }
}
