import type { SiteScore } from '@/types'
import type { EarthSite } from '@/types'

/** Cosine similarity between two feature vectors */
function featureSimilarity(a: EarthSite, b: EarthSite): number {
  const keys = ['elevation_mean','relief_std','slope_mean','slope_p90','roughness','temp_mean','aridity']
  let dot = 0, normA = 0, normB = 0
  for (const k of keys) {
    const va = a.features[k as keyof typeof a.features] as number
    const vb = b.features[k as keyof typeof b.features] as number
    dot += va * vb
    normA += va * va
    normB += vb * vb
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-9)
}

/** Greedy MMR selection: balance relevance vs diversity
 *  lambda=1 → pure relevance, lambda=0 → pure diversity */
export function selectMMR(
  ranked: SiteScore[],
  n: number,
  lambda: number
): SiteScore[] {
  if (ranked.length === 0) return []
  const selected: SiteScore[] = []
  const remaining = [...ranked]
  
  // Always pick the top-scoring first
  selected.push(remaining.shift()!)
  
  while (selected.length < n && remaining.length > 0) {
    let bestIdx = 0
    let bestScore = -Infinity
    
    for (let i = 0; i < remaining.length; i++) {
      const relevance = remaining[i].score / 100
      const maxSim = Math.max(...selected.map(s => featureSimilarity(s.site, remaining[i].site)))
      const mmrScore = lambda * relevance - (1 - lambda) * maxSim
      if (mmrScore > bestScore) {
        bestScore = mmrScore
        bestIdx = i
      }
    }
    
    selected.push(remaining.splice(bestIdx, 1)[0])
  }
  
  return selected
}
