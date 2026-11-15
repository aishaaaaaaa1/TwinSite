import type { EarthSite, PlanetaryRegion, DataSource } from '@/types'
import { Database, ExternalLink, ShieldAlert } from 'lucide-react'

interface SourcesPanelProps {
  site: EarthSite | null
  target: PlanetaryRegion | null
}

interface TableSourceRow extends DataSource {
  origin: 'planetary' | 'earth' | 'global'
  targetName?: string
}

export function SourcesPanel({ site, target }: SourcesPanelProps) {
  const rows: TableSourceRow[] = []

  // Add target sources
  if (target?.sources && target.sources.length > 0) {
    for (const src of target.sources) {
      rows.push({
        ...src,
        origin: 'planetary',
        targetName: target.name,
      })
    }
  }

  // Add site sources
  if (site?.sources && site.sources.length > 0) {
    for (const src of site.sources) {
      rows.push({
        ...src,
        origin: 'earth',
        targetName: site.name,
      })
    }
  }

  const displayRows = rows

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <div
        className="p-3.5 rounded-lg"
        style={{
          background: 'linear-gradient(145deg, rgba(26, 108, 246, 0.08) 0%, rgba(7, 20, 40, 0.8) 100%)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-blue-400" />
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
              Scientific Data Provenance
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">Verified sources only</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Only provenance attached to a retrieved or processed dataset is listed here. Map imagery is not
          numerical measurement data.
        </p>
      </div>

      {displayRows.length === 0 && (
        <div role="status" className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-xs leading-relaxed text-slate-300">
          Data unavailable — no verified NASA measurement provenance is attached to this comparison.
        </div>
      )}

      {/* Styled Dark Table with Blue Header */}
      <div
        className="rounded-lg overflow-hidden border"
        style={{
          background: 'var(--color-panel)',
          borderColor: 'var(--color-border)',
        }}
      >
        <div
          className="px-3.5 py-2.5 flex items-center justify-between border-b"
          style={{
            background: 'linear-gradient(90deg, rgba(26, 108, 246, 0.25) 0%, rgba(13, 31, 60, 0.6) 100%)',
            borderColor: 'rgba(59, 142, 255, 0.3)',
          }}
        >
          <div className="text-xs font-bold uppercase tracking-wider text-blue-200 flex items-center gap-2">
            <span>Datasets & Provenance Registry</span>
            <span className="text-[10px] font-normal text-blue-300 font-mono">
              ({displayRows.length} {displayRows.length === 1 ? 'source' : 'sources'})
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr
                className="border-b text-[10px] uppercase font-mono text-slate-300 tracking-wider"
                style={{
                  background: 'rgba(4, 13, 26, 0.75)',
                  borderColor: 'rgba(59, 142, 255, 0.2)',
                }}
              >
                <th className="py-2.5 px-3 font-semibold">Source</th>
                <th className="py-2.5 px-3 font-semibold">Dataset</th>
                <th className="py-2.5 px-2.5 font-semibold">Resolution</th>
                <th className="py-2.5 px-3 font-semibold">Scientific Limitations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayRows.map((row, idx) => {
                const isPlanetary = row.origin === 'planetary'
                const isEarth = row.origin === 'earth'

                return (
                  <tr
                    key={idx}
                    className="hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-2.5 px-3 align-top">
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                        <span>{row.name}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        {isPlanetary ? (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-orange-500/15 text-orange-400 border border-orange-500/30">
                            Target Planet
                          </span>
                        ) : isEarth ? (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            Earth Analogue
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-mono font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30">
                            Global Reference
                          </span>
                        )}
                        {row.targetName && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                            {row.targetName}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 align-top font-medium text-slate-300">
                      {row.dataset}
                    </td>

                    <td className="py-2.5 px-2.5 align-top font-mono text-[10px] text-blue-300 whitespace-nowrap">
                      {row.resolution}
                    </td>

                    <td className="py-2.5 px-3 align-top text-slate-400 leading-relaxed">
                      <div className="flex items-start gap-1">
                        <ShieldAlert size={12} className="text-amber-400 shrink-0 mt-0.5" />
                        <span>{row.limits}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* External Citation Footnote */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
        <span>Reference catalogs — not evidence that a dataset is loaded</span>
        <div className="flex items-center gap-3">
          <a
            href="https://pds.nasa.gov/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-slate-300"
          >
            <ExternalLink size={10} /> NASA Planetary Data System (PDS)
          </a>
          <a
            href="https://astrogeology.usgs.gov/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-slate-300"
          >
            <ExternalLink size={10} /> USGS Astrogeology Science Center
          </a>
        </div>
      </div>
    </div>
  )
}
