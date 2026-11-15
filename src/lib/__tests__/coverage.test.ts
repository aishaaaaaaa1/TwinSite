import { describe, expect, it } from 'vitest'
import type { EarthSite, PlanetaryRegion } from '@/types'
import { computeTerrainCoverage } from '../coverage'

function makeRegion(id: string, offset: number): PlanetaryRegion {
  return {
    id,
    planet: 'mars',
    name: `Region ${id}`,
    lat: 0,
    lon: 0,
    area_km2: 100,
    sources: [],
    features: {
      elevation_mean: offset,
      relief_std: offset,
      slope_mean: offset,
      slope_p90: offset,
      roughness: offset,
      temp_mean: offset,
      temp_min: offset,
      temp_max: offset,
      aridity: offset,
      terrainClass: 'example',
    },
  }
}

function makeEarthSite(id: string, offset: number): EarthSite {
  return {
    id,
    name: `Site ${id}`,
    country: 'Example',
    lat: 0,
    lon: 0,
    area_km2: 100,
    sources: [],
    features: makeRegion(id, offset).features,
  }
}

describe('computeTerrainCoverage', () => {
  it('does not calculate coverage in scientific mode', () => {
    expect(computeTerrainCoverage([makeRegion('a', 1)], [makeEarthSite('site-a', 1)], ['site-a']))
      .toEqual([])
  })

  it('calculates reproducible example coverage only in DEMO mode', () => {
    const regions = [makeRegion('a', 1), makeRegion('b', 10)]
    const sites = [makeEarthSite('site-a', 1)]
    const first = computeTerrainCoverage(regions, sites, ['site-a'], 'demo')
    const second = computeTerrainCoverage(regions, sites, ['site-a'], 'demo')

    expect(first).toEqual(second)
    expect(first.flatMap((cluster) => cluster.members)).toEqual(['a', 'b'])
    expect(first.find((cluster) => cluster.coveredBy.includes('site-a'))?.missing).toBe(false)
  })
})
