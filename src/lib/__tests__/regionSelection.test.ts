import { describe, expect, it } from 'vitest'
import type { PlanetaryRegion } from '@/types'
import {
  createCircleRegion,
  createPolygonRegion,
  createRectangleRegion,
  createRegionAtCoordinates,
} from '../regionSelection'

const referenceRegions: PlanetaryRegion[] = [
  {
    id: 'dateline',
    planet: 'mars',
    name: 'Dateline reference',
    lat: 0,
    lon: -179,
    area_km2: 100,
    features: {
      elevation_mean: 1200,
      relief_std: 200,
      slope_mean: 5,
      slope_p90: 15,
      roughness: 0.3,
      temp_mean: -20,
      temp_min: -60,
      temp_max: 10,
      aridity: 0.8,
      terrainClass: 'highland',
    },
    sources: [],
  },
  {
    id: 'other',
    planet: 'mars',
    name: 'Other reference',
    lat: 0,
    lon: 20,
    area_km2: 100,
    features: {
      elevation_mean: 0,
      relief_std: 0,
      slope_mean: 0,
      slope_p90: 0,
      roughness: 0,
      temp_mean: 0,
      temp_min: 0,
      temp_max: 0,
      aridity: 0,
      terrainClass: 'plain',
    },
    sources: [],
  },
]

describe('createRegionAtCoordinates', () => {
  it('creates a custom region with explicit estimated metrics from the nearest reference', () => {
    const region = createRegionAtCoordinates('mars', 0, 179, referenceRegions)

    expect(region.id).toBe('custom-mars-0.0000-179.0000')
    expect(region.lat).toBe(0)
    expect(region.lon).toBe(179)
    expect(region.metricsEstimated).toBe(true)
    expect(region.features).toEqual(referenceRegions[0].features)
    expect(region.description).toContain(referenceRegions[0].name)
  })

  it('creates an Earth region with Earth-specific labels', () => {
    const region = createRegionAtCoordinates(
      'earth',
      0,
      0,
      [{ ...referenceRegions[0], planet: 'earth' }],
    )

    expect(region.name).toMatch(/^Earth region/)
    expect(region.planet).toBe('earth')
    expect(region.metricsEstimated).toBe(true)
  })

  it.each([
    [91, 0],
    [-91, 0],
    [0, 181],
    [0, -181],
    [Number.NaN, 0],
    [0, Number.POSITIVE_INFINITY],
  ])('rejects invalid coordinates (%s, %s)', (lat, lon) => {
    expect(() => createRegionAtCoordinates('mars', lat, lon, referenceRegions)).toThrow()
  })

  it('reports when no reference regions are available', () => {
    expect(() => createRegionAtCoordinates('moon', 0, 0, [])).toThrow(
      'No moon terrain references are available.',
    )
  })

  it('creates a measured selection boundary for circles, rectangles, and coordinate polygons', () => {
    const circle = createCircleRegion('mars', 0, 0, 10)
    const rectangle = createRectangleRegion('mars', -1, -2, 1, 2)
    const polygon = createPolygonRegion('mars', [[0, 0], [1, 0], [0, 1]])

    expect(circle.geometry.type).toBe('Polygon')
    expect(circle.areaKm2).toBeCloseTo(Math.PI * 100)
    expect(rectangle.geometry.type).toBe('Polygon')
    expect(rectangle.areaKm2).toBeGreaterThan(0)
    expect(polygon.geometry.type).toBe('Polygon')
    expect(polygon.geometry.coordinates[0]).toHaveLength(4)
  })

  it('rejects invalid polygon vertices and rectangle bounds', () => {
    expect(() => createPolygonRegion('moon', [[0, 0], [1, 0]])).toThrow(
      'A polygon needs at least three coordinate pairs.',
    )
    expect(() => createRectangleRegion('moon', 1, -1, -1, 1)).toThrow(
      'South latitude must be less than north latitude.',
    )
  })
})
