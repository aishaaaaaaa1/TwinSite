import { describe, it, expect } from 'vitest'
import { computeStats, rankByMeasuredElevation, scoreSite, rankSites } from '../similarity'
import type { EarthSite, PlanetaryRegion, WeightSet } from '@/types'

function makeSite(id: string, overrides: Partial<Record<string, number>> = {}): EarthSite {
  const defaults = {
    elevation_mean: 1000,
    relief_std: 200,
    slope_mean: 5,
    slope_p90: 15,
    roughness: 0.3,
    temp_mean: 10,
    temp_min: -5,
    temp_max: 25,
    aridity: 0.4,
  }
  return {
    id,
    name: `Site ${id}`,
    country: 'Test',
    lat: 0,
    lon: 0,
    area_km2: 100,
    sources: [],
    features: {
      ...defaults,
      ...overrides,
      terrainClass: 'highland',
    } as EarthSite['features'],
  }
}

function makeTarget(overrides: Partial<Record<string, number>> = {}): PlanetaryRegion {
  const defaults = {
    elevation_mean: 1000,
    relief_std: 200,
    slope_mean: 5,
    slope_p90: 15,
    roughness: 0.3,
    temp_mean: 10,
    temp_min: -5,
    temp_max: 25,
    aridity: 0.4,
  }
  return {
    id: 'target_1',
    planet: 'moon',
    name: 'Test Region',
    lat: 0,
    lon: 0,
    area_km2: 500,
    sources: [],
    features: {
      ...defaults,
      ...overrides,
      terrainClass: 'highland',
    } as PlanetaryRegion['features'],
  }
}

const DEFAULT_WEIGHTS: WeightSet = {
  elevation_mean: 1,
  relief_std: 1,
  slope_mean: 1,
  slope_p90: 1,
  roughness: 1,
  temp_mean: 1,
  aridity: 1,
}

const scoreDemoSite = (
  target: PlanetaryRegion,
  site: EarthSite,
  weights: WeightSet,
  stats: ReturnType<typeof computeStats>,
) => scoreSite(target, site, weights, stats, 'demo')

const rankDemoSites = (
  target: PlanetaryRegion,
  sites: EarthSite[],
  weights: WeightSet,
) => rankSites(target, sites, weights, 'demo')

describe('computeStats', () => {
  it('computes correct mean for elevation_mean', () => {
    const sites = [makeSite('a', { elevation_mean: 100 }), makeSite('b', { elevation_mean: 300 })]
    const stats = computeStats(sites)
    expect(stats.elevation_mean.mean).toBeCloseTo(200)
  })

  it('computes correct std for uniform values (std=0 → clamped to 1)', () => {
    const sites = [makeSite('a', { elevation_mean: 500 }), makeSite('b', { elevation_mean: 500 })]
    const stats = computeStats(sites)
    expect(stats.elevation_mean.std).toBe(1)
  })

  it('computes correct std for spread values', () => {
    const sites = [makeSite('a', { elevation_mean: 0 }), makeSite('b', { elevation_mean: 2 })]
    const stats = computeStats(sites)
    expect(stats.elevation_mean.mean).toBeCloseTo(1)
    expect(stats.elevation_mean.std).toBeCloseTo(1)
  })

  it('handles all NUMERIC_FEATURES', () => {
    const sites = [makeSite('a'), makeSite('b')]
    const stats = computeStats(sites)
    const expected = ['elevation_mean','relief_std','slope_mean','slope_p90','roughness','temp_mean','aridity']
    for (const f of expected) {
      expect(stats[f as keyof typeof stats]).toBeDefined()
    }
  })
})

describe('scoreSite', () => {
  it('returns score in [0, 100]', () => {
    const sites = [makeSite('a'), makeSite('b', { elevation_mean: 5000 })]
    const stats = computeStats(sites)
    const target = makeTarget()
    const result = scoreDemoSite(target, sites[0], DEFAULT_WEIGHTS, stats)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('identical site-target features yields score close to 100', () => {
    const sites = [makeSite('a'), makeSite('b', { elevation_mean: 5000 })]
    const stats = computeStats(sites)
    // target matches site 'a' exactly
    const target = makeTarget() // same defaults as makeSite
    const result = scoreDemoSite(target, sites[0], DEFAULT_WEIGHTS, stats)
    // Both share the same features; z-score diff = 0 → score = 100
    expect(result.score).toBeCloseTo(100, 0)
  })

  it('very different site yields lower score', () => {
    const sites = [makeSite('a'), makeSite('b', { elevation_mean: 9999, relief_std: 9000, slope_mean: 80 })]
    const stats = computeStats(sites)
    const target = makeTarget()
    const scoreA = scoreDemoSite(target, sites[0], DEFAULT_WEIGHTS, stats)
    const scoreB = scoreDemoSite(target, sites[1], DEFAULT_WEIGHTS, stats)
    expect(scoreA.score).toBeGreaterThan(scoreB.score)
  })

  it('returns contributions for each feature', () => {
    const sites = [makeSite('a'), makeSite('b')]
    const stats = computeStats(sites)
    const target = makeTarget()
    const result = scoreDemoSite(target, sites[0], DEFAULT_WEIGHTS, stats)
    expect(Object.keys(result.contributions).length).toBeGreaterThan(0)
  })

  it('distance is non-negative', () => {
    const sites = [makeSite('a'), makeSite('b')]
    const stats = computeStats(sites)
    const target = makeTarget()
    const result = scoreDemoSite(target, sites[0], DEFAULT_WEIGHTS, stats)
    expect(result.distance).toBeGreaterThanOrEqual(0)
  })
})

describe('rankSites', () => {
  it('does not rank unverified catalog values in scientific mode', () => {
    expect(rankSites(makeTarget(), [makeSite('a')], DEFAULT_WEIGHTS)).toEqual([])
  })

  describe('rankByMeasuredElevation', () => {
    it('ranks measured sites by NASA elevation and ignores sites without a measurement', () => {
      const near = makeSite('near', { elevation_mean: 1000 })
      const far = makeSite('far', { elevation_mean: 3000 })
      const unavailable = makeSite('unavailable')
      unavailable.features.elevation_mean = null

      const ranked = rankByMeasuredElevation(1200, [far, unavailable, near])

      expect(ranked.map((item) => item.site.id)).toEqual(['near', 'far'])
      expect(ranked[0].rank).toBe(1)
      expect(ranked[0].contributions).toHaveProperty('elevation_mean')
    })

    it('returns no scores when the target or all candidate elevations are unavailable', () => {
      const site = makeSite('unavailable')
      site.features.elevation_mean = null

      expect(rankByMeasuredElevation(Number.NaN, [makeSite('measured')])).toEqual([])
      expect(rankByMeasuredElevation(1000, [site])).toEqual([])
    })
  })

  it('returns same number of results as sites', () => {
    const sites = [makeSite('a'), makeSite('b'), makeSite('c')]
    const target = makeTarget()
    const ranked = rankDemoSites(target, sites, DEFAULT_WEIGHTS)
    expect(ranked).toHaveLength(3)
  })

  it('assigns rank 1 to the highest scoring site', () => {
    const sites = [makeSite('a'), makeSite('b', { elevation_mean: 9000 })]
    const target = makeTarget() // close to site 'a'
    const ranked = rankDemoSites(target, sites, DEFAULT_WEIGHTS)
    expect(ranked[0].rank).toBe(1)
    expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score)
  })

  it('ranks are sequential starting from 1', () => {
    const sites = [makeSite('a'), makeSite('b'), makeSite('c')]
    const target = makeTarget()
    const ranked = rankDemoSites(target, sites, DEFAULT_WEIGHTS)
    const ranks = ranked.map(r => r.rank).sort((a, b) => a - b)
    expect(ranks).toEqual([1, 2, 3])
  })

  it('top ranked site features closest match target', () => {
    // Site 'close' has features matching target; site 'far' is very different
    const close = makeSite('close')
    const far = makeSite('far', { elevation_mean: 9999, slope_mean: 90, aridity: 0.99 })
    const target = makeTarget()
    const ranked = rankDemoSites(target, [far, close], DEFAULT_WEIGHTS)
    expect(ranked[0].site.id).toBe('close')
  })

  it('handles single site', () => {
    const sites = [makeSite('only')]
    const target = makeTarget()
    const ranked = rankDemoSites(target, sites, DEFAULT_WEIGHTS)
    expect(ranked).toHaveLength(1)
    expect(ranked[0].rank).toBe(1)
  })

  it('scores are sorted descending', () => {
    const sites = [makeSite('a'), makeSite('b', { elevation_mean: 5000 }), makeSite('c', { elevation_mean: 9000 })]
    const target = makeTarget()
    const ranked = rankDemoSites(target, sites, DEFAULT_WEIGHTS)
    for (let i = 0; i < ranked.length - 1; i++) {
      expect(ranked[i].score).toBeGreaterThanOrEqual(ranked[i+1].score)
    }
  })
})

describe('scientific score guard', () => {
  it('rejects direct scoring without explicitly selecting demo mode', () => {
    const sites = [makeSite('a'), makeSite('b')]
    expect(() => scoreSite(
      makeTarget(),
      sites[0],
      DEFAULT_WEIGHTS,
      computeStats(sites),
    )).toThrow('Scientific scoring is unavailable')
  })
})
