import type { AnalysisMode, ConfidenceResult, ValidationResult, EarthSite } from '@/types'
import { CheckCircle2, XCircle, ShieldCheck, Activity } from 'lucide-react'

interface ConfidencePanelProps {
  confidence?: ConfidenceResult[]
  validation?: ValidationResult | null
  earthSites?: EarthSite[]
  analysisMode?: AnalysisMode
}

function formatIdentifier(id: string): string {
  return id
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function ConfidencePanel({
  confidence = [],
  validation = null,
  earthSites = [],
  analysisMode = 'scientific',
}: ConfidencePanelProps) {
  if (analysisMode !== 'demo') {
    return (
      <div role="status" className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-xs leading-relaxed text-slate-300">
        Data unavailable — confidence and validation metrics require verified measurements and documented ground truth.
      </div>
    )
  }

  const topConfidence = confidence.slice(0, 5)

  const earthNameMap = new Map<string, string>()
  for (const s of earthSites) {
    earthNameMap.set(s.id, s.name)
  }

  return (
    <div className="space-y-5">
      {/* Monte Carlo Section */}
      <div
        className="p-3.5 rounded-lg"
        style={{
          background: 'linear-gradient(145deg, rgba(26, 108, 246, 0.08) 0%, rgba(7, 20, 40, 0.8) 100%)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-blue-400" />
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
              DEMO Monte Carlo Analysis (500 runs)
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            ±20% Weight & Feature Jitter
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mb-3">
          Illustrative sensitivity analysis over bundled examples; it is not empirical uncertainty.
        </p>

        {topConfidence.length === 0 ? (
          <div className="p-3 text-center text-xs text-slate-400 bg-space-900/50 rounded border border-white/5">
            Run analysis to view Monte Carlo confidence metrics.
          </div>
        ) : (
          <div className="space-y-3">
            {topConfidence.map((res, idx) => {
              const siteName = earthNameMap.get(res.siteId) ?? formatIdentifier(res.siteId)
              const stabilityPct = Math.round(res.rankStability * 100)
              const [low, high] = res.scoreInterval

              const barColor =
                stabilityPct >= 80
                  ? 'from-emerald-500 to-teal-400'
                  : stabilityPct >= 60
                  ? 'from-amber-500 to-yellow-400'
                  : 'from-rose-500 to-red-400'

              const textColor =
                stabilityPct >= 80
                  ? 'text-emerald-400'
                  : stabilityPct >= 60
                  ? 'text-amber-400'
                  : 'text-rose-400'

              return (
                <div key={res.siteId ?? idx} className="text-[11px] space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 truncate max-w-[65%]">
                      <span className="text-slate-400 font-mono text-[10px]">#{idx + 1}</span>
                      <span className="text-slate-200 font-semibold truncate" title={siteName}>
                        {siteName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-[10px] text-slate-400">
                        [{low.toFixed(1)}% – {high.toFixed(1)}%]
                      </span>
                      <span className={`font-mono text-[10px] font-bold ${textColor}`}>
                        {stabilityPct}% stable
                      </span>
                    </div>
                  </div>

                  {/* Rank Stability Bar */}
                  <div className="w-full bg-slate-900/90 rounded-full h-1.5 overflow-hidden border border-white/5">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-300`}
                      style={{ width: `${stabilityPct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Scientific Validation Section */}
      <div
        className="p-3.5 rounded-lg"
        style={{
          background: 'linear-gradient(145deg, rgba(34, 197, 94, 0.05) 0%, rgba(7, 20, 40, 0.8) 100%)',
          border: '1px solid rgba(34, 197, 94, 0.25)',
        }}
      >
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
              DEMO validation vs bundled examples
            </span>
          </div>
          <span className="text-[10px] font-mono text-amber-400">Not scientific validation</span>
        </div>

        {validation ? (
          <div className="space-y-3.5">
            {/* 4 Metric Cards */}
            <div className="grid grid-cols-4 gap-2">
              <div className="p-2 rounded bg-space-950/60 border border-white/5 text-center">
                <div className="text-[10px] uppercase font-mono text-slate-400">Recall@1</div>
                <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                  {(validation.recallAt1 * 100).toFixed(0)}%
                </div>
              </div>
              <div className="p-2 rounded bg-space-950/60 border border-white/5 text-center">
                <div className="text-[10px] uppercase font-mono text-slate-400">Recall@3</div>
                <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                  {(validation.recallAt3 * 100).toFixed(0)}%
                </div>
              </div>
              <div className="p-2 rounded bg-space-950/60 border border-white/5 text-center">
                <div className="text-[10px] uppercase font-mono text-slate-400">Recall@5</div>
                <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                  {(validation.recallAt5 * 100).toFixed(0)}%
                </div>
              </div>
              <div className="p-2 rounded bg-space-950/60 border border-white/5 text-center">
                <div className="text-[10px] uppercase font-mono text-slate-400">Mean Rank</div>
                <div className="text-sm font-bold font-mono text-blue-400 mt-0.5">
                  #{validation.meanRank.toFixed(1)}
                </div>
              </div>
            </div>

            {/* Hits/Misses Table */}
            {validation.hits && validation.hits.length > 0 && (
              <div className="rounded border border-white/10 overflow-hidden">
                <div className="px-2.5 py-1.5 bg-white/[0.03] border-b border-white/10 flex items-center justify-between text-[10px] uppercase font-mono text-slate-400">
                  <span>Target Region</span>
                  <span className="flex items-center gap-4">
                    <span>Rank</span>
                    <span>Status</span>
                  </span>
                </div>
                <div className="divide-y divide-white/5 max-h-48 overflow-y-auto">
                  {validation.hits.map((hit, idx) => {
                    const earthName = earthNameMap.get(hit.earthSiteId) ?? formatIdentifier(hit.earthSiteId)
                    const targetName = formatIdentifier(hit.targetId)

                    return (
                      <div
                        key={idx}
                        className="px-2.5 py-1.5 flex items-center justify-between text-[11px] hover:bg-white/[0.02]"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-slate-200 font-medium truncate">{targetName}</div>
                          <div className="text-[10px] text-slate-400 truncate">→ {earthName}</div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono text-[10px] text-slate-300">
                            #{hit.rank}
                          </span>
                          {hit.hit ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              <CheckCircle2 size={10} />
                              Hit
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                              <XCircle size={10} />
                              Miss
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 text-center text-xs text-slate-400 bg-space-900/50 rounded border border-white/5">
            Validation data not yet calculated.
          </div>
        )}
      </div>
    </div>
  )
}
