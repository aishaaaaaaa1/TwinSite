import { useEffect, useState } from 'react'
import { fetchPowerClimatology, type PowerClimatology } from '@/services/nasa/powerService'
import type { PlanetaryRegion } from '@/types'
import { Panel } from '@/components/ui/Panel'
import { Layers3 } from 'lucide-react'

export function PowerClimatologyPanel({ region }: { region: PlanetaryRegion }) {
  const [data, setData] = useState<PowerClimatology | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetchPowerClimatology(region.lat, region.lon)
      .then((result) => {
        if (active) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : String(cause))
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [region.lat, region.lon])

  return (
    <Panel title="NASA POWER climatology" icon={Layers3} defaultOpen={false}>
      {loading ? (
        <p role="status" className="text-[10px] text-slate-400">Requesting verified NASA POWER data…</p>
      ) : error ? (
        <p role="alert" className="text-[10px] leading-relaxed text-rose-300">{error}</p>
      ) : data ? (
        <>
          {data.measurements.some((measurement) => measurement.status === 'verified') ? (
            <div className="mb-2 inline-flex rounded border border-emerald-500/40 bg-emerald-950/30 px-1.5 py-0.5 text-[9px] font-bold text-emerald-200">
              NASA VERIFIED DATA · CLIMATOLOGY
            </div>
          ) : (
            <div className="mb-2 inline-flex rounded border border-slate-600 px-1.5 py-0.5 text-[9px] font-bold text-slate-300">
              DATA UNAVAILABLE
            </div>
          )}
          <p className="mb-2 text-[10px] leading-relaxed text-slate-400">
            {data.dataset} · {data.period}. Values are annual climatology summaries, not current weather.
          </p>
          <div className="space-y-1.5">
            {data.measurements.map((measurement) => (
              <div key={measurement.code} className="flex items-start justify-between gap-2 text-[10px]">
                <span className="text-slate-400">{measurement.name}</span>
                <span className="shrink-0 font-mono text-slate-200">
                  {measurement.status === 'verified' && measurement.annualValue !== null
                    ? `${measurement.annualValue.toFixed(2)} ${measurement.unit}`
                    : 'Data unavailable — no verified NASA measurement found.'}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[9px] leading-relaxed text-slate-500">
            Source: NASA POWER ({data.sources.join(', ')}). Resolution is source-native; no grid resolution is declared by this response.
            Retrieved {new Date(data.retrievedAt).toLocaleDateString()}.
          </p>
          <p className="mt-2 text-[9px] text-slate-500">
            These Earth climate variables are displayed for provenance and are not used in Moon/Mars similarity scores.
          </p>
          <a
            href="https://power.larc.nasa.gov/"
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-[10px] text-blue-300 underline"
          >
            NASA POWER API
          </a>
        </>
      ) : (
        <p className="text-[10px] text-slate-400">Data unavailable — no verified NASA measurement found.</p>
      )}
    </Panel>
  )
}
