import type { AnalysisMode, KnownAnalog, EarthSite, PlanetaryRegion, WeightSet, ValidationResult } from '@/types'
import { rankSites } from './similarity'

export function validateAgainstKnown(
  analogs: KnownAnalog[],
  earthSites: EarthSite[],
  moonRegions: PlanetaryRegion[],
  marsRegions: PlanetaryRegion[],
  weights: WeightSet,
  mode: AnalysisMode = 'scientific',
): ValidationResult | null {
  if (mode !== 'demo' || analogs.length === 0) return null

  const allRegions = [...moonRegions, ...marsRegions]
  const hits: ValidationResult['hits'] = []
  
  for (const analog of analogs) {
    const target = allRegions.find(r => r.id === analog.targetId)
    if (!target) continue
    
    const ranked = rankSites(target, earthSites, weights, mode)
    const found = ranked.find(r => r.site.id === analog.earthSiteId)
    const rank = found?.rank ?? earthSites.length + 1
    hits.push({ targetId: analog.targetId, earthSiteId: analog.earthSiteId, rank, hit: rank <= 5 })
  }
  
  const n = hits.length
  if (n === 0) return null
  return {
    recallAt1: hits.filter(h => h.rank <= 1).length / n,
    recallAt3: hits.filter(h => h.rank <= 3).length / n,
    recallAt5: hits.filter(h => h.rank <= 5).length / n,
    meanRank: hits.reduce((a, h) => a + h.rank, 0) / n,
    hits,
  }
}
