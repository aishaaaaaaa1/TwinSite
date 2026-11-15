import type { RegionGeometry } from './nasaTypes'
import type { RasterGrid, TerrainStatistics } from './nasaTypes'

export interface PdsRasterLabel {
  productId: string
  lines: number
  lineSamples: number
  sampleBits: 8 | 16 | 32
  sampleType: string
  scaleFactor: number
  offset: number
  units: string
  mapResolutionPixelsPerDegree: number
  lineProjectionOffset: number | null
  sampleProjectionOffset: number | null
  referenceRadiusMeters: number | null
  missingConstant: number | null
  acquisitionStart: string | null
  acquisitionStop: string | null
  raw: Record<string, string>
}

function labelValue(label: string, key: string): string | null {
  const match = label.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*?)\\s*$`, 'im'))
  if (!match) return null
  return match[1].replace(/^["']|["']$/g, '').trim()
}

function numberValue(label: string, key: string): number | null {
  const value = labelValue(label, key)
  if (value === null) return null
  const parsed = Number(value.replace(/\s*<[^>]+>\s*$/, ''))
  return Number.isFinite(parsed) ? parsed : null
}

export function parsePdsRasterLabel(label: string): PdsRasterLabel {
  const lines = numberValue(label, 'LINES')
  const lineSamples = numberValue(label, 'LINE_SAMPLES')
  const bits = numberValue(label, 'SAMPLE_BITS')
  const resolution = numberValue(label, 'MAP_RESOLUTION')
  const productId = labelValue(label, 'PRODUCT_ID')
  const sampleType = labelValue(label, 'SAMPLE_TYPE')

  if (
    !lines || !lineSamples ||
    (bits !== 8 && bits !== 16 && bits !== 32) ||
    !resolution || !productId || !sampleType
  ) {
    throw new Error('PDS label is missing raster dimensions, sample type, product ID, or map resolution.')
  }

  const raw: Record<string, string> = {}
  for (const key of [
    'DATA_SET_ID', 'PRODUCT_ID', 'START_TIME', 'STOP_TIME', 'SAMPLE_TYPE',
    'SAMPLE_BITS', 'UNIT', 'UNITS', 'SCALING_FACTOR', 'OFFSET',
    'MAP_RESOLUTION', 'LINE_PROJECTION_OFFSET', 'SAMPLE_PROJECTION_OFFSET',
    'MISSING_CONSTANT', 'A_AXIS_RADIUS',
  ]) {
    const value = labelValue(label, key)
    if (value !== null) raw[key] = value
  }

  const radiusKm = numberValue(label, 'A_AXIS_RADIUS')
  return {
    productId,
    lines,
    lineSamples,
    sampleBits: bits,
    sampleType,
    scaleFactor: numberValue(label, 'SCALING_FACTOR') ?? 1,
    offset: numberValue(label, 'OFFSET') ?? 0,
    units: labelValue(label, 'UNIT') ?? labelValue(label, 'UNITS') ?? 'unknown',
    mapResolutionPixelsPerDegree: resolution,
    lineProjectionOffset: numberValue(label, 'LINE_PROJECTION_OFFSET'),
    sampleProjectionOffset: numberValue(label, 'SAMPLE_PROJECTION_OFFSET'),
    referenceRadiusMeters: radiusKm === null ? null : radiusKm * (label.includes('<KM>') ? 1000 : 1),
    missingConstant: numberValue(label, 'MISSING_CONSTANT'),
    acquisitionStart: labelValue(label, 'START_TIME'),
    acquisitionStop: labelValue(label, 'STOP_TIME'),
    raw,
  }
}

export function decodePdsRaster(data: ArrayBuffer, label: PdsRasterLabel): RasterGrid {
  const bytesPerSample = label.sampleBits / 8
  const expectedBytes = label.lines * label.lineSamples * bytesPerSample
  if (data.byteLength < expectedBytes) {
    throw new Error(`PDS raster is truncated: expected ${expectedBytes} bytes, received ${data.byteLength}.`)
  }
  const view = new DataView(data)
  const littleEndian = label.sampleType.toUpperCase().startsWith('LSB')
  const values = new Float32Array(label.lines * label.lineSamples)
  const valueOffset = label.referenceRadiusMeters === null ? label.offset : 0

  for (let index = 0; index < values.length; index += 1) {
    const byteOffset = index * bytesPerSample
    let rawValue: number
    if (label.sampleBits === 8) rawValue = view.getUint8(byteOffset)
    else if (label.sampleBits === 16) rawValue = view.getInt16(byteOffset, littleEndian)
    else rawValue = view.getInt32(byteOffset, littleEndian)

    values[index] = label.missingConstant === rawValue
      ? Number.NaN
      : rawValue * label.scaleFactor + valueOffset
  }

  const bodyRadius = label.referenceRadiusMeters
  const pixelSizeMetersAtEquator = bodyRadius === null
    ? Number.NaN
    : bodyRadius * Math.PI / (180 * label.mapResolutionPixelsPerDegree)
  return {
    columns: label.lineSamples,
    rows: label.lines,
    values,
    west: 0,
    north: 90,
    pixelsPerDegree: label.mapResolutionPixelsPerDegree,
    pixelIsPoint: true,
    noDataValues: [Number.NaN, -32768],
    pixelSizeMetersAtEquator,
  }
}

export interface HgtTile {
  grid: RasterGrid
  south: number
  west: number
}

function findEndOfCentralDirectory(view: DataView): number {
  const start = Math.max(0, view.byteLength - 65_557)
  for (let offset = view.byteLength - 22; offset >= start; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset
  }
  throw new Error('NASADEM granule is not a valid ZIP archive.')
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser does not support ZIP deflate decompression required for NASADEM.')
  }
  const buffer = new ArrayBuffer(data.byteLength)
  new Uint8Array(buffer).set(data)
  const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

export async function decodeHgtZip(data: ArrayBuffer): Promise<Uint8Array> {
  const view = new DataView(data)
  const directoryOffset = findEndOfCentralDirectory(view)
  const entries = view.getUint16(directoryOffset + 10, true)
  let cursor = view.getUint32(directoryOffset + 16, true)

  for (let index = 0; index < entries; index += 1) {
    if (view.getUint32(cursor, true) !== 0x02014b50) {
      throw new Error('NASADEM ZIP central directory is invalid.')
    }
    const method = view.getUint16(cursor + 10, true)
    const compressedSize = view.getUint32(cursor + 20, true)
    const nameLength = view.getUint16(cursor + 28, true)
    const extraLength = view.getUint16(cursor + 30, true)
    const commentLength = view.getUint16(cursor + 32, true)
    const localHeaderOffset = view.getUint32(cursor + 42, true)
    const name = new TextDecoder().decode(new Uint8Array(data, cursor + 46, nameLength))

    if (name.toLowerCase().endsWith('.hgt')) {
      if (view.getUint32(localHeaderOffset, true) !== 0x04034b50) {
        throw new Error('NASADEM ZIP local file header is invalid.')
      }
      const localNameLength = view.getUint16(localHeaderOffset + 26, true)
      const localExtraLength = view.getUint16(localHeaderOffset + 28, true)
      const contentOffset = localHeaderOffset + 30 + localNameLength + localExtraLength
      const compressed = new Uint8Array(data, contentOffset, compressedSize)
      let output: Uint8Array
      if (method === 0) output = compressed.slice()
      else if (method === 8) output = await inflateRaw(compressed)
      else throw new Error(`Unsupported NASADEM ZIP compression method ${method}.`)
      return output
    }
    cursor += 46 + nameLength + extraLength + commentLength
  }
  throw new Error('NASADEM granule ZIP does not contain a .hgt elevation raster.')
}

export function decodeHgtTile(
  data: Uint8Array,
  south: number,
  west: number,
  noDataValue = -32768,
): RasterGrid {
  if (data.byteLength % 2 !== 0) throw new Error('NASADEM HGT raster has an invalid byte length.')
  const samples = Math.sqrt(data.byteLength / 2)
  if (!Number.isInteger(samples) || samples < 2) throw new Error('NASADEM HGT raster dimensions are invalid.')
  const values = new Float32Array(samples * samples)
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength)
  for (let index = 0; index < values.length; index += 1) {
    const value = view.getInt16(index * 2, false)
    values[index] = value === noDataValue ? Number.NaN : value
  }
  return {
    columns: samples,
    rows: samples,
    values,
    west,
    north: south + 1,
    pixelsPerDegree: samples - 1,
    pixelIsPoint: true,
    noDataValues: [noDataValue],
    pixelSizeMetersAtEquator: 30.87,
  }
}

function normalizeLongitude(longitude: number): number {
  return ((longitude % 360) + 360) % 360
}

function pointInRing(longitude: number, latitude: number, ring: Array<[number, number]>): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const crosses = (yi > latitude) !== (yj > latitude) &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi
    if (crosses) inside = !inside
  }
  return inside
}

function contains(geometry: RegionGeometry, longitude: number, latitude: number): boolean {
  if (geometry.type === 'Point') return true
  const [outer, ...holes] = geometry.coordinates
  if (!outer || !pointInRing(longitude, latitude, outer)) return false
  return holes.every((ring) => !pointInRing(longitude, latitude, ring))
}

function coordinateToIndex(grid: RasterGrid, longitude: number, latitude: number): [number, number] {
  const longitudeDegrees = grid.columns / grid.pixelsPerDegree >= 300
    ? normalizeLongitude(longitude)
    : longitude
  const column = Math.floor((longitudeDegrees - grid.west) * grid.pixelsPerDegree)
  const row = Math.floor((grid.north - latitude) * grid.pixelsPerDegree)
  return [
    Math.min(grid.columns - 1, Math.max(0, column)),
    Math.min(grid.rows - 1, Math.max(0, row)),
  ]
}

function cellCenter(grid: RasterGrid, column: number, row: number): [number, number] {
  const halfCell = grid.pixelIsPoint ? 0.5 : 0
  return [
    grid.west + (column + halfCell) / grid.pixelsPerDegree,
    grid.north - (row + halfCell) / grid.pixelsPerDegree,
  ]
}

function quantile(values: number[], fraction: number): number {
  if (values.length === 0) return Number.NaN
  const sorted = [...values].sort((a, b) => a - b)
  const position = (sorted.length - 1) * fraction
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}

export function calculateTerrainStatistics(
  grids: RasterGrid[],
  geometry: RegionGeometry,
  bodyRadiusMeters: number,
): TerrainStatistics {
  const samples: Array<{ value: number; grid: RasterGrid; column: number; row: number; latitude: number }> = []
  for (const grid of grids) {
    if (geometry.type === 'Point') {
      const [column, row] = coordinateToIndex(grid, geometry.coordinates[0], geometry.coordinates[1])
      const value = grid.values[row * grid.columns + column]
      if (Number.isFinite(value)) {
        samples.push({ value, grid, column, row, latitude: geometry.coordinates[1] })
      }
      continue
    }

    const points = geometry.coordinates[0] ?? []
    if (points.length === 0) continue
    const west = Math.min(...points.map(([longitude]) => longitude))
    const east = Math.max(...points.map(([longitude]) => longitude))
    const south = Math.min(...points.map(([, latitude]) => latitude))
    const north = Math.max(...points.map(([, latitude]) => latitude))
    const [startColumn, startRow] = coordinateToIndex(grid, west, north)
    const [endColumn, endRow] = coordinateToIndex(grid, east, south)

    for (let row = Math.min(startRow, endRow); row <= Math.max(startRow, endRow); row += 1) {
      for (let column = Math.min(startColumn, endColumn); column <= Math.max(startColumn, endColumn); column += 1) {
        const [longitude, latitude] = cellCenter(grid, column, row)
        const value = grid.values[row * grid.columns + column]
        if (Number.isFinite(value) && contains(geometry, longitude, latitude)) {
          samples.push({ value, grid, column, row, latitude })
        }
      }
    }
  }
  if (samples.length === 0) {
    throw new Error('The selected region contains no valid numerical elevation samples in the retrieved raster.')
  }

  const values = samples.map(({ value }) => value)
  const elevationMean = values.reduce((sum, value) => sum + value, 0) / values.length
  const elevationMin = Math.min(...values)
  const elevationMax = Math.max(...values)
  const elevationStdDev = Math.sqrt(values.reduce((sum, value) => sum + (value - elevationMean) ** 2, 0) / values.length)
  const slopes: number[] = []
  const roughnessSquared: number[] = []

  for (const sample of samples) {
    const { grid, column, row, value, latitude } = sample
    if (column === 0 || column >= grid.columns - 1 || row === 0 || row >= grid.rows - 1) continue
    const west = grid.values[row * grid.columns + column - 1]
    const east = grid.values[row * grid.columns + column + 1]
    const north = grid.values[(row - 1) * grid.columns + column]
    const south = grid.values[(row + 1) * grid.columns + column]
    if (![west, east, north, south].every(Number.isFinite)) continue
    const yResolution = bodyRadiusMeters * Math.PI / (180 * grid.pixelsPerDegree)
    const xResolution = Math.max(0.01, yResolution * Math.cos(latitude * Math.PI / 180))
    const dzdx = (east - west) / (2 * xResolution)
    const dzdy = (south - north) / (2 * yResolution)
    slopes.push(Math.atan(Math.hypot(dzdx, dzdy)) * 180 / Math.PI)

    for (const [dx, dy] of [
      [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1],
    ]) {
      const neighbor = grid.values[(row + dy) * grid.columns + column + dx]
      if (Number.isFinite(neighbor)) roughnessSquared.push((neighbor - value) ** 2)
    }
  }

  return {
    validSamples: samples.length,
    elevationMean,
    elevationMin,
    elevationMax,
    relief: elevationMax - elevationMin,
    elevationStdDev,
    slopeMean: slopes.length ? slopes.reduce((sum, value) => sum + value, 0) / slopes.length : null,
    slopeP90: slopes.length ? quantile(slopes, 0.9) : null,
    roughness: roughnessSquared.length
      ? Math.sqrt(roughnessSquared.reduce((sum, value) => sum + value, 0) / roughnessSquared.length)
      : null,
    processingMethod:
      'Population elevation statistics from valid grid-cell samples inside the selected geometry; slope uses central differences in meters with latitude-corrected east-west spacing; roughness is the RMS difference from the eight neighboring cells.',
  }
}
