import type { AnalysisMode, TerrainCluster, EarthSite } from '@/types'
import { computeTerrainCoverage } from '@/lib/coverage'
import { Layers, CheckCircle2, AlertCircle } from 'lucide-react'

// Re-export computeTerrainCoverage for convenience
export { computeTerrainCoverage }

interface TerrainCoveragePanelProps {
  clusters?: TerrainCluster[]
  earthSites?: EarthSite[]
  analysisMode?: AnalysisMode
}

const CLUSTER_COLORS = [
  '#3b82f6', // blue
  '#f97316', // orange
  '#22c55e', // green
  '#a855f7', // purple
  '#eab308', // yellow
  '#06b6d4', // cyan
]

function inferTerrainClass(centroid?: number[]): string {
  if (!centroid || centroid.length < 5) return 'Planetary Terrain'
  const [, relief, slopeMean, , roughness, temp, aridity] = centroid
  if (slopeMean > 15 || relief > 400) return 'Steep Highland / Slopes'
  if (temp !== undefined && temp < -30) return 'Cryogenic / Polar Terrain'
  if (aridity !== undefined && aridity > 0.85) return 'Hyper-Arid Basin'
  if (roughness > 0.45) return 'Blocky Regolith / Crater Rim'
  if (slopeMean < 4 && relief < 120) return 'Smooth Mare / Basalt Plains'
  return 'Eroded Plateau / Rolling Regolith'
}

export function TerrainCoveragePanel({
  clusters = [],
  earthSites = [],
  analysisMode = 'scientific',
}: TerrainCoveragePanelProps) {
  if (analysisMode !== 'demo') {
    return (
      <div role="status" className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-xs leading-relaxed text-slate-300">
        Data unavailable — verified, comparable NASA terrain measurements are required for coverage analysis.
      </div>
    )
  }

  // Up to 6 clusters
  const displayClusters = clusters.slice(0, 6)
  const totalClusters = displayClusters.length || 6
  const coveredClusters = displayClusters.filter((c) => c.coveredBy && c.coveredBy.length > 0)
  const coveredCount = coveredClusters.length
  const coveragePct = Math.round((coveredCount / totalClusters) * 100)

  const earthSiteMap = new Map<string, EarthSite>()
  for (const s of earthSites) {
    earthSiteMap.set(s.id, s)
  }

  return (
    <div className="space-y-4">
      {/* Coverage Summary Card */}
      <div
        className="p-3.5 rounded-lg"
        style={{
          background: 'linear-gradient(145deg, rgba(59, 142, 255, 0.08) 0%, rgba(7, 20, 40, 0.8) 100%)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-blue-400" />
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
              K-Means Terrain Coverage
            </span>
          </div>
          <span
            className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
              coveragePct >= 66
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : coveragePct >= 33
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-red-500/20 text-red-400 border border-red-500/30'
            }`}
          >
            {coveredCount}/{totalClusters} Covered ({coveragePct}%)
          </span>
        </div>

        <p className="text-[11px] text-slate-400 mb-2.5">
          Quantifies whether the selected Earth analogue suite spans all primary morphological regimes
          of the planetary body.
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-slate-900/90 rounded-full h-2 overflow-hidden border border-white/5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              coveragePct >= 66
                ? 'bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400'
                : coveragePct >= 33
                ? 'bg-gradient-to-r from-blue-500 to-amber-400'
                : 'bg-gradient-to-r from-red-500 to-amber-500'
            }`}
            style={{ width: `${Math.max(5, coveragePct)}%` }}
          />
        </div>
      </div>

      {/* Cluster List */}
      <div className="space-y-2">
        {displayClusters.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 bg-space-900/40 rounded-lg border border-white/5">
            No clusters computed. Confirm a planetary target to analyze terrain coverage.
          </div>
        ) : (
          displayClusters.map((cluster, idx) => {
            const isCovered = cluster.coveredBy && cluster.coveredBy.length > 0
            const dotColor = CLUSTER_COLORS[idx % CLUSTER_COLORS.length]
            const terrainLabel = inferTerrainClass(cluster.centroid)
            const coveredSiteNames = (cluster.coveredBy || [])
              .map((id) => earthSiteMap.get(id)?.name || id)
              .join(', ')

            return (
              <div
                key={cluster.id ?? idx}
                className="p-3 rounded-lg transition-colors border"
                style={{
                  background: isCovered
                    ? 'rgba(7, 20, 40, 0.7)'
                    : 'rgba(15, 23, 42, 0.5)',
                  borderColor: isCovered
                    ? 'rgba(34, 197, 94, 0.25)'
                    : 'rgba(234, 179, 8, 0.25)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Colored dot */}
                    <span
                      className="shrink-0 w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: dotColor,
                        boxShadow: `0 0 8px ${dotColor}66`,
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-200">
                          Cluster {idx + 1}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          ({cluster.members?.length ?? 0} regions)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 truncate">
                        {terrainLabel}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {isCovered ? (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 size={11} />
                      Covered
                    </span>
                  ) : (
                    <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      <AlertCircle size={11} />
                      Missing
                    </span>
                  )}
                </div>

                {/* Covered by or Missing message */}
                <div className="mt-2 pt-1.5 border-t border-white/5 text-[11px]">
                  {isCovered ? (
                    <div className="flex items-start gap-1 text-slate-300">
                      <span className="text-slate-500 shrink-0">Covered by:</span>
                      <span className="text-emerald-300 font-medium truncate">
                        {coveredSiteNames}
                      </span>
                    </div>
                  ) : (
                    <div className="text-amber-400/80 text-[10px]">
                      No analogue in the active selection covers this terrain regime.
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
