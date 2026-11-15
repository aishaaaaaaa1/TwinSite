import type { Planet } from '@/types'
export type { RegionGeometry } from '@/types'

export interface NasaRasterMetadata {
  body: Planet
  service: string
  dataset: string
  productId: string
  collectionId: string | null
  acquisitionPeriod: string | null
  resolutionMeters: number
  resolutionLabel: string
  units: string
  sourceUrl: string
  labelUrl: string | null
  sourceMetadata: Record<string, unknown>
}

export interface TerrainStatistics {
  validSamples: number
  elevationMean: number
  elevationMin: number
  elevationMax: number
  relief: number
  elevationStdDev: number
  slopeMean: number | null
  slopeP90: number | null
  roughness: number | null
  processingMethod: string
}

export interface NasaTerrainResult {
  metadata: NasaRasterMetadata
  statistics: TerrainStatistics
  retrievedAt: string
  retrievalStatus: 'retrieved'
  processingStatus: 'complete'
}

export interface RasterGrid {
  columns: number
  rows: number
  values: Float32Array
  west: number
  north: number
  pixelsPerDegree: number
  pixelIsPoint: boolean
  noDataValues: number[]
  pixelSizeMetersAtEquator: number
}

export interface NasaDatasetErrorContext {
  service: string
  dataset: string
  productId?: string
  collectionId?: string
  datasetExists: boolean | null
  regionCovered: boolean | null
  authenticationRequired: boolean
  retrievalError: string
}

export class NasaDatasetError extends Error {
  readonly context: NasaDatasetErrorContext

  constructor(
    message: string,
    context: NasaDatasetErrorContext,
  ) {
    super(message)
    this.name = 'NasaDatasetError'
    this.context = context
  }
}
