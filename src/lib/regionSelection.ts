import type { Planet, PlanetaryRegion } from '@/types'
import type { RegionGeometry } from '@/types'

const BODY_RADIUS_METERS: Record<Planet, number> = {
  earth: 6_378_137,
  moon: 1_737_400,
  mars: 3_389_500,
}

function validateCoordinate(longitude: number, latitude: number): void {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error('Latitude must be between -90 and 90 degrees.')
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Longitude must be between -180 and 180 degrees.')
  }
}

export function createPolygonRegion(
  planet: Planet,
  vertices: Array<[longitude: number, latitude: number]>,
): { geometry: RegionGeometry; areaKm2: number } {
  if (vertices.length < 3) throw new Error('A polygon needs at least three coordinate pairs.')
  vertices.forEach(([longitude, latitude]) => validateCoordinate(longitude, latitude))

  const ring = [...vertices, vertices[0]]
  const meanLatitude = vertices.reduce((sum, [, latitude]) => sum + latitude, 0) / vertices.length
  const longitudeScale = Math.cos(meanLatitude * Math.PI / 180)
  const kilometersPerDegree = BODY_RADIUS_METERS[planet] / 1000 * (Math.PI / 180)
  const firstLongitude = vertices[0][0]
  const longitudes = vertices.map(([longitude]) =>
    firstLongitude + (((longitude - firstLongitude + 540) % 360) - 180),
  )
  let twiceArea = 0
  for (let index = 0; index < vertices.length; index += 1) {
    const nextIndex = (index + 1) % vertices.length
    twiceArea +=
      longitudes[index] * longitudeScale * vertices[nextIndex][1] -
      longitudes[nextIndex] * longitudeScale * vertices[index][1]
  }

  return {
    geometry: { type: 'Polygon', coordinates: [ring] },
    areaKm2: Math.max(0.01, Math.abs(twiceArea) * 0.5 * kilometersPerDegree ** 2),
  }
}

export function createCircleRegion(
  planet: Planet,
  latitude: number,
  longitude: number,
  radiusKm: number,
): { geometry: RegionGeometry; areaKm2: number } {
  validateCoordinate(longitude, latitude)
  if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
    throw new Error('Circle radius must be greater than zero kilometers.')
  }

  const angularDistance = radiusKm / (BODY_RADIUS_METERS[planet] / 1000)
  const centerLatitude = latitude * Math.PI / 180
  const centerLongitude = longitude * Math.PI / 180
  const vertices: Array<[number, number]> = []
  for (let index = 0; index < 48; index += 1) {
    const bearing = 2 * Math.PI * index / 48
    const pointLatitude = Math.asin(
      Math.sin(centerLatitude) * Math.cos(angularDistance) +
      Math.cos(centerLatitude) * Math.sin(angularDistance) * Math.cos(bearing),
    )
    const pointLongitude = centerLongitude + Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(centerLatitude),
      Math.cos(angularDistance) - Math.sin(centerLatitude) * Math.sin(pointLatitude),
    )
    const normalizedLongitude = ((pointLongitude * 180 / Math.PI + 540) % 360) - 180
    vertices.push([normalizedLongitude, pointLatitude * 180 / Math.PI])
  }
  const polygon = createPolygonRegion(planet, vertices)
  return { ...polygon, areaKm2: Math.PI * radiusKm ** 2 }
}

export function createRectangleRegion(
  planet: Planet,
  south: number,
  west: number,
  north: number,
  east: number,
): { geometry: RegionGeometry; areaKm2: number } {
  if (south >= north) throw new Error('South latitude must be less than north latitude.')
  if (west >= east) throw new Error('West longitude must be less than east longitude.')
  return createPolygonRegion(planet, [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
  ])
}

export function createRegionAtCoordinates(
  planet: Planet,
  lat: number,
  lon: number,
  referenceRegions: PlanetaryRegion[],
  areaKm2 = 25,
  geometry: PlanetaryRegion['geometry'] = { type: 'Point', coordinates: [lon, lat] },
): PlanetaryRegion {
  validateCoordinate(lon, lat)
  const coordinateLabel = `${Math.abs(lat).toFixed(2)}°${lat < 0 ? 'S' : 'N'}, ${Math.abs(lon).toFixed(2)}°${lon < 0 ? 'W' : 'E'}`
  const bodyName = planet === 'mars' ? 'Mars' : planet === 'moon' ? 'Moon' : 'Earth'
  const bodyNameFr = planet === 'mars' ? 'martienne' : planet === 'moon' ? 'lunaire' : 'terrestre'
  const matchingRegions = referenceRegions.filter((region) => region.planet === planet)
  if (matchingRegions.length === 0) {
    throw new Error(`No ${planet} terrain references are available.`)
  }
  const nearest = matchingRegions.reduce((best, region) => {
    const latitudeRadians = ((lat + region.lat) / 2) * Math.PI / 180
    const latitudeDelta = region.lat - lat
    const longitudeDelta = ((region.lon - lon + 540) % 360) - 180
    const distance = Math.hypot(latitudeDelta, longitudeDelta * Math.cos(latitudeRadians))
    const bestLatitudeRadians = ((lat + best.lat) / 2) * Math.PI / 180
    const bestLongitudeDelta = ((best.lon - lon + 540) % 360) - 180
    const bestDistance = Math.hypot(
      best.lat - lat,
      bestLongitudeDelta * Math.cos(bestLatitudeRadians),
    )
    return distance < bestDistance ? region : best
  })

  return {
    id: `custom-${planet}-${lat.toFixed(4)}-${lon.toFixed(4)}`,
    planet,
    name: `${bodyName} region ${coordinateLabel}`,
    nameFr: `Région ${bodyNameFr} ${coordinateLabel}`,
    lat,
    lon,
    area_km2: areaKm2,
    features: { ...nearest.features },
    sources: [...nearest.sources],
    geometry,
    metricsEstimated: true,
    description: `Example metrics estimated from the nearest catalogue region: ${nearest.name}.`,
    descriptionFr: `Métriques d’exemple estimées depuis la région de catalogue la plus proche : ${nearest.nameFr ?? nearest.name}.`,
  }
}
