import type { AnalysisMode, FeatureSet, PlanetaryRegion, EarthSite, WeightSet, ConfidenceResult } from '@/types'
import { rankSites } from './similarity'

const MC_RUNS = 500
const NUMERIC_FEATURES = [
  'elevation_mean',
  'relief_std',
  'slope_mean',
  'slope_p90',
  'roughness',
  'temp_mean',
  'aridity',
] as const satisfies readonly (keyof WeightSet)[]

function requireFeatureValue(
  value: number | null,
  feature: keyof WeightSet,
  subject: string,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Confidence analysis requires a finite ${feature} value for ${subject}.`)
  }
  return value
}

function getCompleteFeatures(
  features: FeatureSet,
  subject: string,
): Record<keyof WeightSet, number> {
  return {
    elevation_mean: requireFeatureValue(features.elevation_mean, 'elevation_mean', subject),
    relief_std: requireFeatureValue(features.relief_std, 'relief_std', subject),
    slope_mean: requireFeatureValue(features.slope_mean, 'slope_mean', subject),
    slope_p90: requireFeatureValue(features.slope_p90, 'slope_p90', subject),
    roughness: requireFeatureValue(features.roughness, 'roughness', subject),
    temp_mean: requireFeatureValue(features.temp_mean, 'temp_mean', subject),
    aridity: requireFeatureValue(features.aridity, 'aridity', subject),
  }
}

/** Perturb weights ±20% and add feature noise, run MC_RUNS times */
export function runMonteCarloConfidence(
  target: PlanetaryRegion,
  sites: EarthSite[],
  baseWeights: WeightSet,
  featureNoiseSd = 0.05,
  mode: AnalysisMode = 'scientific',
): ConfidenceResult[] {
  if (mode !== 'demo') return []

  const measuredTarget = {
    ...target,
    features: { ...target.features, ...getCompleteFeatures(target.features, target.name) },
  }
  const measuredSites = sites.map((site) => ({
    ...site,
    features: { ...site.features, ...getCompleteFeatures(site.features, site.name) },
  }))
  const scoreHistory: Record<string, number[]> = {}
  const rankHistory: Record<string, number[]> = {}
  for (const s of measuredSites) { scoreHistory[s.id] = []; rankHistory[s.id] = [] }
  
  for (let run = 0; run < MC_RUNS; run++) {
    // Perturb weights ±20%
    const perturbedWeights = { ...baseWeights }
    for (const k of NUMERIC_FEATURES) {
      const perturb = 1 + (Math.random() * 0.4 - 0.2)
      perturbedWeights[k] = Math.max(0, baseWeights[k] * perturb)
    }
    
    // Add feature noise to sites
    const noisySites = measuredSites.map((site) => {
      const features = getCompleteFeatures(site.features, site.name)
      return {
        ...site,
        features: {
          ...site.features,
          elevation_mean: features.elevation_mean * (1 + (Math.random() - 0.5) * featureNoiseSd * 2),
          relief_std: features.relief_std * (1 + (Math.random() - 0.5) * featureNoiseSd * 2),
          slope_mean: features.slope_mean * (1 + (Math.random() - 0.5) * featureNoiseSd * 2),
          slope_p90: features.slope_p90,
          roughness: features.roughness,
          temp_mean: features.temp_mean + (Math.random() - 0.5) * 2,
          aridity: Math.min(1, Math.max(0, features.aridity + (Math.random() - 0.5) * featureNoiseSd)),
        },
      }
    })
    
    const ranked = rankSites(measuredTarget, noisySites, perturbedWeights, mode)
    ranked.forEach(r => {
      scoreHistory[r.site.id].push(r.score)
      rankHistory[r.site.id].push(r.rank)
    })
  }
  
  return measuredSites.map(site => {
    const scores = scoreHistory[site.id]
    const ranks = rankHistory[site.id]
    const meanScore = scores.reduce((a,b) => a+b, 0) / scores.length
    const stdScore = Math.sqrt(scores.map(s => (s-meanScore)**2).reduce((a,b) => a+b, 0) / scores.length)
    const baseRank = ranks[0]
    const stable = ranks.filter(r => Math.abs(r - baseRank) <= 2).length
    const rankStability = stable / ranks.length
    const sorted = [...scores].sort((a,b) => a-b)
    return {
      siteId: site.id,
      meanScore,
      stdScore,
      rankStability,
      scoreInterval: [sorted[Math.floor(sorted.length * 0.1)], sorted[Math.floor(sorted.length * 0.9)]] as [number, number],
    }
  })
}
