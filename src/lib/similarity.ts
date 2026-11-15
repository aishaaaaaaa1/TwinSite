import type { AnalysisMode, EarthSite, PlanetaryRegion, SiteScore, WeightSet } from '@/types'

const NUMERIC_FEATURES = ['elevation_mean','relief_std','slope_mean','slope_p90','roughness','temp_mean','aridity'] as const
type NumericFeature = typeof NUMERIC_FEATURES[number]

/** Compute mean and std of each feature across all earth sites */
export function computeStats(sites: EarthSite[]): Record<NumericFeature, {mean: number; std: number}> {
  const stats = {} as Record<NumericFeature, {mean: number; std: number}>
  for (const feat of NUMERIC_FEATURES) {
    const vals = sites.map(s => s.features[feat] as number)
    const mean = vals.reduce((a,b) => a+b, 0) / vals.length
    const std = Math.sqrt(vals.map(v => (v-mean)**2).reduce((a,b) => a+b, 0) / vals.length) || 1
    stats[feat] = { mean, std }
  }
  return stats
}

/** z-score normalize a value */
function zScore(val: number, mean: number, std: number): number {
  return (val - mean) / std
}

/** Score = exp(-d²/2σ²)*100 from weighted z-scored Euclidean distance
 *  Returns score 0–100 and per-feature contributions */
export function scoreSite(
  target: PlanetaryRegion,
  site: EarthSite,
  weights: WeightSet,
  stats: Record<NumericFeature, {mean: number; std: number}>,
  mode: AnalysisMode = 'scientific',
): { score: number; distance: number; contributions: Record<string, number> } {
  if (mode !== 'demo') {
    throw new Error('Scientific scoring is unavailable without verified, comparable NASA measurements.')
  }

  const totalWeight = Object.values(weights).reduce((a,b) => a+b, 0) || 1
  let weightedSumSq = 0
  const contributions: Record<string, number> = {}
  
  for (const feat of NUMERIC_FEATURES) {
    const w = (weights[feat] ?? 0) / totalWeight
    const targetZ = zScore(target.features[feat] as number, stats[feat].mean, stats[feat].std)
    const siteZ = zScore(site.features[feat] as number, stats[feat].mean, stats[feat].std)
    const diff = targetZ - siteZ
    const contrib = w * diff * diff
    weightedSumSq += contrib
    contributions[feat] = contrib
  }
  
  const sigma = 1.5 // tunable
  const score = Math.exp(-weightedSumSq / (2 * sigma * sigma)) * 100
  return { score, distance: Math.sqrt(weightedSumSq), contributions }
}

/** Rank all earth sites against a target region */
export function rankSites(
  target: PlanetaryRegion,
  sites: EarthSite[],
  weights: WeightSet,
  mode: AnalysisMode = 'scientific',
): SiteScore[] {
  if (mode !== 'demo') return []
  const stats = computeStats(sites)
  const scored = sites.map(site => {
    const { score, distance, contributions } = scoreSite(target, site, weights, stats, mode)
    return { site, score, distance, contributions, rank: 0 }
  })
  scored.sort((a, b) => b.score - a.score)
  scored.forEach((s, i) => { s.rank = i + 1 })
  return scored
}

export function rankByMeasuredElevation(
  targetElevation: number,
  sites: EarthSite[],
): SiteScore[] {
  const measuredSites = sites.filter(
    (site): site is EarthSite & { features: EarthSite['features'] & { elevation_mean: number } } =>
      typeof site.features.elevation_mean === 'number' && Number.isFinite(site.features.elevation_mean),
  )
  if (!Number.isFinite(targetElevation) || measuredSites.length === 0) return []

  const mean = measuredSites.reduce((sum, site) => sum + site.features.elevation_mean, 0) / measuredSites.length
  const std = Math.sqrt(
    measuredSites.reduce((sum, site) => sum + (site.features.elevation_mean - mean) ** 2, 0) /
      measuredSites.length,
  ) || 1
  const targetZ = zScore(targetElevation, mean, std)
  const scored = measuredSites.map((site) => {
    const diff = targetZ - zScore(site.features.elevation_mean, mean, std)
    const contribution = diff * diff
    return {
      site,
      score: Math.exp(-contribution / (2 * 1.5 ** 2)) * 100,
      distance: Math.abs(diff),
      contributions: { elevation_mean: contribution },
      rank: 0,
    }
  })

  scored.sort((a, b) => b.score - a.score)
  scored.forEach((item, index) => { item.rank = index + 1 })
  return scored
}
