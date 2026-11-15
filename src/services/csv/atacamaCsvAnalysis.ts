import type {
  EarthSite,
  FeatureSet,
  Planet,
  PlanetaryRegion,
  RegionGeometry,
  SiteScore,
  WeightSet,
} from '@/types'

const CSV_FEATURES = ['elevation_mean', 'slope_mean', 'roughness', 'temp_mean'] as const
type CsvFeature = typeof CSV_FEATURES[number]
type NumericFeatures = Record<CsvFeature, number>
type CsvBody = 'earth' | 'moon' | 'mars'

interface GridCell {
  latitude: number
  longitude: number
  features: NumericFeatures
}

interface FeatureStats {
  mean: number
  std: number
}

interface FeatureAccumulator {
  count: number
  mean: number
  m2: number
}

type FeatureAccumulators = Record<CsvFeature, FeatureAccumulator>

export interface CsvExperimentResult {
  target: PlanetaryRegion
  ranked: SiteScore[]
  candidateCount: number
  targetSampleCount: number
  targetSampleMethod: 'nearest grid cell' | 'mean over selected area'
  usedFeatures: CsvFeature[]
}

const compressedFiles = new Map<CsvBody, Promise<ArrayBuffer>>()
const EARTHDATASET_SOURCE = {
  name: 'Project CSV',
  dataset: 'earth_features (1).csv',
  resolution: 'Local Atacama grid; source resolution not documented',
  limits: 'Atacama-only coverage; exploratory feature mapping; quality flags are not included.',
}

function getCompressedFile(body: CsvBody): Promise<ArrayBuffer> {
  const cached = compressedFiles.get(body)
  if (cached) return cached

  const request = fetch(`/data/measurements/${body}.csv.gz`).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Could not load the ${body} CSV measurements (HTTP ${response.status}).`)
    }
    return response.arrayBuffer()
  }).catch((error: unknown) => {
    compressedFiles.delete(body)
    throw error
  })

  compressedFiles.set(body, request)
  return request
}

function parseCell(line: string, indexes: Record<string, number>): GridCell | null {
  const values = line.split(',')
  const numeric = (column: string): number | null => {
    const raw = values[indexes[column]]
    if (raw === undefined || raw.trim() === '') return null
    const value = Number(raw)
    return Number.isFinite(value) ? value : null
  }

  const latitude = numeric('latitude')
  const longitude = numeric('longitude')
  const elevation = numeric('elevation')
  const slope = numeric('slope')
  const roughness = numeric('roughness')
  const temperatureDay = numeric('temperature_day')
  const temperatureNight = numeric('temperature_night')
  if (
    latitude === null ||
    longitude === null ||
    elevation === null ||
    slope === null ||
    roughness === null ||
    temperatureDay === null ||
    temperatureNight === null ||
    temperatureDay <= 0 ||
    temperatureNight <= 0
  ) {
    return null
  }

  return {
    latitude,
    longitude,
    features: {
      elevation_mean: elevation,
      slope_mean: slope,
      roughness,
      temp_mean: (temperatureDay + temperatureNight) / 2 - 273.15,
    },
  }
}

async function* readCells(body: CsvBody): AsyncGenerator<GridCell> {
  const compressed = await getCompressedFile(body)
  const bytes = new Uint8Array(compressed)
  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b
  if (isGzip && typeof DecompressionStream === 'undefined') {
    throw new Error('This browser does not support gzip decompression required for the project CSV data.')
  }
  const stream = new Blob([compressed]).stream()
  const reader = (isGzip ? stream.pipeThrough(new DecompressionStream('gzip')) : stream).getReader()
  const decoder = new TextDecoder()
  let pending = ''
  let indexes: Record<string, number> | null = null

  const consumeLine = (line: string): GridCell | null => {
    if (!indexes) {
      const headers = line.replace(/^\uFEFF/, '').trimEnd().split(',')
      const requiredColumns = [
        'latitude',
        'longitude',
        'elevation',
        'slope',
        'roughness',
        'temperature_day',
        'temperature_night',
      ]
      const parsedIndexes: Record<string, number> = {}
      for (const column of requiredColumns) {
        const index = headers.indexOf(column)
        if (index < 0) throw new Error(`Project CSV is missing the required "${column}" column.`)
        parsedIndexes[column] = index
      }
      indexes = parsedIndexes
      return null
    }
    return line ? parseCell(line, indexes) : null
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      pending += decoder.decode(value, { stream: !done })
      const lines = pending.split(/\r?\n/)
      pending = lines.pop() ?? ''
      for (const line of lines) {
        const cell = consumeLine(line)
        if (cell) yield cell
      }
      if (done) break
    }
    const lastCell = consumeLine(pending)
    if (lastCell) yield lastCell
    if (!indexes) throw new Error('Project CSV is empty.')
  } finally {
    reader.releaseLock()
  }
}

function haversineKm(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
  planet: Planet,
): number {
  const radians = (degrees: number) => degrees * Math.PI / 180
  const radiusKm = planet === 'moon' ? 1737.4 : planet === 'mars' ? 3389.5 : 6371
  const deltaLatitude = radians(latitude2 - latitude1)
  const deltaLongitude = radians((((longitude2 - longitude1) + 540) % 360) - 180)
  const a = Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(radians(latitude1)) * Math.cos(radians(latitude2)) * Math.sin(deltaLongitude / 2) ** 2
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function pointInRing(longitude: number, latitude: number, ring: Array<[number, number]>): boolean {
  let inside = false
  let previousLongitude = ring[0]?.[0] ?? 0
  let previousLatitude = ring[0]?.[1] ?? 0

  for (let index = 1; index <= ring.length; index += 1) {
    const point = ring[index % ring.length]
    if (!point) continue
    let currentLongitude = point[0]
    currentLongitude += 360 * Math.round((longitude - currentLongitude) / 360)
    previousLongitude += 360 * Math.round((longitude - previousLongitude) / 360)

    const intersects = (previousLatitude > latitude) !== (point[1] > latitude) &&
      longitude < ((currentLongitude - previousLongitude) * (latitude - previousLatitude)) /
        (point[1] - previousLatitude) + previousLongitude
    if (intersects) inside = !inside
    previousLongitude = point[0]
    previousLatitude = point[1]
  }

  return inside
}

function contains(geometry: RegionGeometry, longitude: number, latitude: number): boolean {
  if (geometry.type === 'Point') return false
  const [outerRing, ...holes] = geometry.coordinates
  if (!outerRing || !pointInRing(longitude, latitude, outerRing)) return false
  return holes.every((ring) => !pointInRing(longitude, latitude, ring))
}

function createAccumulators(): FeatureAccumulators {
  return {
    elevation_mean: { count: 0, mean: 0, m2: 0 },
    slope_mean: { count: 0, mean: 0, m2: 0 },
    roughness: { count: 0, mean: 0, m2: 0 },
    temp_mean: { count: 0, mean: 0, m2: 0 },
  }
}

function addToAccumulators(accumulators: FeatureAccumulators, features: NumericFeatures): void {
  for (const key of CSV_FEATURES) {
    const item = accumulators[key]
    item.count += 1
    const delta = features[key] - item.mean
    item.mean += delta / item.count
    item.m2 += delta * (features[key] - item.mean)
  }
}

function finishMean(accumulators: FeatureAccumulators): NumericFeatures {
  return {
    elevation_mean: accumulators.elevation_mean.mean,
    slope_mean: accumulators.slope_mean.mean,
    roughness: accumulators.roughness.mean,
    temp_mean: accumulators.temp_mean.mean,
  }
}

async function sampleTarget(
  target: PlanetaryRegion,
): Promise<{ features: NumericFeatures; count: number; method: CsvExperimentResult['targetSampleMethod'] }> {
  const geometry = target.geometry ?? { type: 'Point' as const, coordinates: [target.lon, target.lat] as [number, number] }
  const areaAccumulators = createAccumulators()
  let areaCellCount = 0
  let nearest: GridCell | null = null
  let nearestDistance = Number.POSITIVE_INFINITY

  for await (const cell of readCells(target.planet)) {
    if (geometry.type === 'Point') {
      const [pointLongitude, pointLatitude] = geometry.coordinates
      const distance = haversineKm(pointLatitude, pointLongitude, cell.latitude, cell.longitude, target.planet)
      if (distance < nearestDistance) {
        nearest = cell
        nearestDistance = distance
      }
    } else if (contains(geometry, cell.longitude, cell.latitude)) {
      addToAccumulators(areaAccumulators, cell.features)
      areaCellCount += 1
    }
  }

  if (geometry.type === 'Point') {
    if (!nearest || nearestDistance > 100) {
      throw new Error('No complete CSV grid cell was found within 100 km of the selected point.')
    }
    return { features: nearest.features, count: 1, method: 'nearest grid cell' }
  }

  if (areaCellCount === 0) {
    throw new Error('No complete CSV grid cells fell inside the selected area; use a larger area or a point.')
  }
  return {
    features: finishMean(areaAccumulators),
    count: areaCellCount,
    method: 'mean over selected area',
  }
}

function calculateStats(accumulators: FeatureAccumulators): Record<CsvFeature, FeatureStats> {
  return {
    elevation_mean: {
      mean: accumulators.elevation_mean.mean,
      std: Math.sqrt(accumulators.elevation_mean.m2 / accumulators.elevation_mean.count) || 1,
    },
    slope_mean: {
      mean: accumulators.slope_mean.mean,
      std: Math.sqrt(accumulators.slope_mean.m2 / accumulators.slope_mean.count) || 1,
    },
    roughness: {
      mean: accumulators.roughness.mean,
      std: Math.sqrt(accumulators.roughness.m2 / accumulators.roughness.count) || 1,
    },
    temp_mean: {
      mean: accumulators.temp_mean.mean,
      std: Math.sqrt(accumulators.temp_mean.m2 / accumulators.temp_mean.count) || 1,
    },
  }
}

function toFeatureSet(features: NumericFeatures): FeatureSet {
  return {
    elevation_mean: features.elevation_mean,
    relief_std: null,
    slope_mean: features.slope_mean,
    slope_p90: null,
    roughness: features.roughness,
    temp_mean: features.temp_mean,
    temp_min: null,
    temp_max: null,
    aridity: null,
    terrainClass: null,
  }
}

function createEarthSite(cell: GridCell): EarthSite {
  const id = `atacama_csv_${cell.latitude.toFixed(4)}_${cell.longitude.toFixed(4)}`
  return {
    id,
    name: `Atacama CSV cell (${cell.latitude.toFixed(3)}°, ${cell.longitude.toFixed(3)}°)`,
    country: 'Chile',
    lat: cell.latitude,
    lon: cell.longitude,
    area_km2: 0,
    features: toFeatureSet(cell.features),
    sources: [EARTHDATASET_SOURCE],
    description: 'Experimental analogue grid cell from the project CSV. Scores are limited to the available Atacama dataset.',
  }
}

export async function runAtacamaCsvExperiment(
  target: PlanetaryRegion,
  weights: WeightSet,
  resultCount: number,
): Promise<CsvExperimentResult> {
  if (target.planet === 'earth') {
    throw new Error('The Atacama CSV experiment requires a Moon or Mars target.')
  }

  const targetSample = await sampleTarget(target)
  const measuredTarget: PlanetaryRegion = {
    ...target,
    features: toFeatureSet(targetSample.features),
    sources: [...target.sources, {
      name: 'Project CSV',
      dataset: `${target.planet}_features.csv`,
      resolution: 'Global 0.5° grid',
      limits: `${targetSample.method}; ${targetSample.count} complete cell(s) sampled. Temperature is interpreted as Kelvin and converted to °C. Experimental only.`,
    }],
  }
  const activeWeights = CSV_FEATURES.filter((key) => weights[key] > 0)
  const totalWeight = activeWeights.reduce((sum, key) => sum + weights[key], 0)
  if (totalWeight <= 0) throw new Error('Set a positive weight for elevation, slope, roughness, or temperature.')

  let earthCellCount = 0
  const earthAccumulators = createAccumulators()
  for await (const cell of readCells('earth')) {
    addToAccumulators(earthAccumulators, cell.features)
    earthCellCount += 1
  }
  if (earthCellCount === 0) throw new Error('The Atacama CSV contains no complete Earth grid cells.')
  const stats = calculateStats(earthAccumulators)
  const targetZ: NumericFeatures = {
    elevation_mean: (targetSample.features.elevation_mean - stats.elevation_mean.mean) / stats.elevation_mean.std,
    slope_mean: (targetSample.features.slope_mean - stats.slope_mean.mean) / stats.slope_mean.std,
    roughness: (targetSample.features.roughness - stats.roughness.mean) / stats.roughness.std,
    temp_mean: (targetSample.features.temp_mean - stats.temp_mean.mean) / stats.temp_mean.std,
  }
  const limit = Math.max(1, Math.min(20, Math.floor(resultCount)))
  const top: SiteScore[] = []

  for await (const cell of readCells('earth')) {
    let weightedDistanceSquared = 0
    for (const key of activeWeights) {
      const candidateZ = (cell.features[key] - stats[key].mean) / stats[key].std
      const difference = targetZ[key] - candidateZ
      weightedDistanceSquared += (weights[key] / totalWeight) * difference ** 2
    }
    const score = Math.exp(-weightedDistanceSquared / (2 * 1.5 ** 2)) * 100
    const candidate: SiteScore = {
      site: createEarthSite(cell),
      score,
      distance: Math.sqrt(weightedDistanceSquared),
      contributions: Object.fromEntries(activeWeights.map((key) => {
        const candidateZ = (cell.features[key] - stats[key].mean) / stats[key].std
        const difference = targetZ[key] - candidateZ
        return [key, (weights[key] / totalWeight) * difference ** 2]
      })),
      rank: 0,
    }
    const insertAt = top.findIndex((item) => item.score < candidate.score)
    if (insertAt >= 0) top.splice(insertAt, 0, candidate)
    else if (top.length < limit) top.push(candidate)
    if (top.length > limit) top.pop()
  }

  if (top.length === 0) throw new Error('No complete Atacama CSV candidate cells were available for ranking.')
  top.forEach((item, index) => { item.rank = index + 1 })

  return {
    target: measuredTarget,
    ranked: top,
    candidateCount: earthCellCount,
    targetSampleCount: targetSample.count,
    targetSampleMethod: targetSample.method,
    usedFeatures: [...activeWeights],
  }
}
