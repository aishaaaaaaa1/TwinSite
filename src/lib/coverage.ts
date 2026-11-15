import type { AnalysisMode, PlanetaryRegion, EarthSite, TerrainCluster } from '@/types'

const K = 6
const FEAT_KEYS = ['elevation_mean','relief_std','slope_mean','slope_p90','roughness','temp_mean','aridity']

function extractVector(r: PlanetaryRegion | EarthSite): number[] {
  return FEAT_KEYS.map(k => (r.features as unknown as Record<string, unknown>)[k] as number)
}

function euclidean(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i])**2, 0))
}

function kmeans(vectors: number[][], k: number, maxIter = 50): {
  centroids: number[][]; assignments: number[]
} {
  const centroids: number[][] = [[...vectors[0]]]
  const chosenIndices = new Set([0])
  while (centroids.length < k) {
    const dists = vectors.map(v => Math.min(...centroids.map(c => euclidean(v, c))))
    let bestIndex = -1
    let bestDistance = -1
    for (let i = 0; i < vectors.length; i += 1) {
      if (!chosenIndices.has(i) && dists[i] > bestDistance) {
        bestIndex = i
        bestDistance = dists[i]
      }
    }
    if (bestIndex < 0) break
    chosenIndices.add(bestIndex)
    centroids.push([...vectors[bestIndex]])
  }
  
  let assignments = new Array(vectors.length).fill(0)
  for (let iter = 0; iter < maxIter; iter++) {
    // Assign
    const newAssignments = vectors.map(v => {
      let best = 0, bestD = Infinity
      centroids.forEach((c, ci) => { const d = euclidean(v, c); if (d < bestD) { bestD = d; best = ci } })
      return best
    })
    // Check convergence
    if (newAssignments.every((a, i) => a === assignments[i])) break
    assignments = newAssignments
    // Update centroids
    for (let ki = 0; ki < k; ki++) {
      const members = vectors.filter((_, i) => assignments[i] === ki)
      if (members.length === 0) continue
      centroids[ki] = FEAT_KEYS.map((_, fi) => members.reduce((s, v) => s + v[fi], 0) / members.length)
    }
  }
  return { centroids, assignments }
}

export function computeTerrainCoverage(
  regions: PlanetaryRegion[],
  earthSites: EarthSite[],
  selectedSiteIds: string[],
  mode: AnalysisMode = 'scientific',
): TerrainCluster[] {
  if (mode !== 'demo' || regions.length === 0) return []
  const vectors = regions.map(extractVector)
  const k = Math.min(K, regions.length)
  const { centroids, assignments } = kmeans(vectors, k)
  
  const clusters: TerrainCluster[] = centroids.map((c, i) => ({
    id: i,
    centroid: c,
    members: regions.filter((_, ri) => assignments[ri] === i).map(r => r.id),
    coveredBy: [],
    missing: true,
  }))
  
  // For each selected earth site, find nearest cluster centroid
  const selectedSites = earthSites.filter(s => selectedSiteIds.includes(s.id))
  for (const site of selectedSites) {
    const sv = extractVector(site)
    let best = 0, bestD = Infinity
    clusters.forEach((cl, ci) => {
      const d = euclidean(sv, cl.centroid)
      if (d < bestD) { bestD = d; best = ci }
    })
    clusters[best].coveredBy.push(site.id)
    clusters[best].missing = false
  }
  
  return clusters
}
