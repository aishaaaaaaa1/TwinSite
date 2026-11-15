import type { PlanetaryRegion, EarthSite } from '@/types'
import { Globe, Wind, Zap, AlertTriangle, Info } from 'lucide-react'

interface ScientificContextPanelProps {
  target: PlanetaryRegion | null
  selectedSite: EarthSite | null
}

const FEATURE_NAMES: Record<
  string,
  { label: string; unit: string; scale: number; format: (v: number) => string }
> = {
  temp_mean: {
    label: 'Temperature',
    unit: '°C',
    scale: 80,
    format: (v) => `${v.toFixed(1)}°C`,
  },
  elevation_mean: {
    label: 'Elevation',
    unit: 'm',
    scale: 4000,
    format: (v) => `${Math.round(v).toLocaleString()} m`,
  },
  relief_std: {
    label: 'Relief Variation',
    unit: 'm',
    scale: 500,
    format: (v) => `${Math.round(v)} m`,
  },
  slope_mean: {
    label: 'Mean Slope',
    unit: '°',
    scale: 20,
    format: (v) => `${v.toFixed(1)}°`,
  },
  slope_p90: {
    label: 'Slope (P90)',
    unit: '°',
    scale: 30,
    format: (v) => `${v.toFixed(1)}°`,
  },
  roughness: {
    label: 'Surface Roughness',
    unit: '',
    scale: 0.5,
    format: (v) => v.toFixed(2),
  },
  aridity: {
    label: 'Aridity Index',
    unit: '',
    scale: 0.5,
    format: (v) => v.toFixed(2),
  },
}

export function ScientificContextPanel({
  target,
  selectedSite,
}: ScientificContextPanelProps) {
  const planet = target?.planet ?? 'moon'
  const isMars = planet === 'mars'

  // Generate top 3 feature breakdowns if both target and site exist
  const breakdownItems: Array<{
    feature: string
    sentence: string
    deltaFormatted: string
    severity: 'high' | 'medium'
  }> = []

  if (target && selectedSite) {
    const numericKeys = [
      'temp_mean',
      'elevation_mean',
      'relief_std',
      'slope_mean',
      'slope_p90',
      'roughness',
      'aridity',
    ] as const

    const scoredDeltas = numericKeys.map((key) => {
      const cfg = FEATURE_NAMES[key]
      const tVal = target.features[key] as number
      const eVal = selectedSite.features[key] as number
      const absDelta = Math.abs(tVal - eVal)
      const normalizedScore = absDelta / cfg.scale

      return {
        key,
        cfg,
        tVal,
        eVal,
        absDelta,
        normalizedScore,
      }
    })

    scoredDeltas.sort((a, b) => b.normalizedScore - a.normalizedScore)

    for (const item of scoredDeltas.slice(0, 3)) {
      const { cfg, tVal, eVal, absDelta } = item
      const deltaStr =
        item.key === 'elevation_mean' || item.key === 'relief_std'
          ? `${Math.round(absDelta).toLocaleString()} ${cfg.unit}`
          : item.key === 'temp_mean'
          ? `${absDelta.toFixed(1)}°C`
          : item.key === 'slope_mean' || item.key === 'slope_p90'
          ? `${absDelta.toFixed(1)}°`
          : absDelta.toFixed(2)

      const sentence = `${cfg.label}: target ${cfg.format(tVal)} vs ${cfg.format(eVal)} on Earth (Δ = ${deltaStr})`

      breakdownItems.push({
        feature: cfg.label,
        sentence,
        deltaFormatted: deltaStr,
        severity: item.normalizedScore > 1 ? 'high' : 'medium',
      })
    }
  }

  return (
    <div className="space-y-4">
      {/* Intro info box */}
      <div
        className="p-3 rounded-lg flex items-start gap-2.5"
        style={{
          background: 'rgba(59, 142, 255, 0.05)',
          border: '1px solid var(--color-border)',
        }}
      >
        <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-300 leading-relaxed">
          Terrestrial analogues replicate topographic morphology and geology, but physical
          environmental constraints impose fundamental limits on mission simulation fidelity.
        </div>
      </div>

      {/* 4 Environmental Limit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {/* Gravity */}
        <div
          className="p-3 rounded-lg border transition-all"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'rgba(59, 142, 255, 0.25)',
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded bg-blue-500/10 text-blue-400">
              <Globe size={15} />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">1. Gravity Field</div>
              <div className="text-[10px] font-mono text-blue-400">
                Earth 9.81 m/s² vs {isMars ? 'Mars 3.71 m/s²' : 'Moon 1.62 m/s²'}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Reduced gravity drastically reduces wheel sinkage, alters rover slope stability,
            and changes soil shear strength. Mass loads on structures and human gait mechanics
            diverge from Earth tests.
          </p>
        </div>

        {/* Atmosphere */}
        <div
          className="p-3 rounded-lg border transition-all"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'rgba(148, 163, 184, 0.25)',
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded bg-slate-500/10 text-slate-300">
              <Wind size={15} />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">2. Atmospheric Density</div>
              <div className="text-[10px] font-mono text-slate-300">
                {isMars ? 'Mars 0.6 kPa CO₂' : 'Moon Hard Vacuum (<10⁻¹² bar)'}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Earth has 101.3 kPa N₂/O₂ with strong convective cooling. On{' '}
            {isMars ? 'Mars (0.6% Earth pressure, CO₂)' : 'the Moon (vacuum)'}, heat dissipation
            relies on radiation/conduction, and aerodynamic drag is virtually absent.
          </p>
        </div>

        {/* Radiation */}
        <div
          className="p-3 rounded-lg border transition-all"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'rgba(234, 179, 8, 0.25)',
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded bg-amber-500/10 text-amber-400">
              <Zap size={15} />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">3. Radiation Environment</div>
              <div className="text-[10px] font-mono text-amber-400">
                No Magnetosphere Shielding
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Neither Moon nor Mars possesses a global dipolar magnetosphere. Unattenuated Galactic
            Cosmic Rays (GCR) and Solar Particle Events (SPE) deliver 200–300× the dose rate of Earth,
            affecting electronic components and bio-systems.
          </p>
        </div>

        {/* Dust & Regolith Chemistry */}
        <div
          className="p-3 rounded-lg border transition-all"
          style={{
            background: 'var(--color-panel)',
            borderColor: 'rgba(239, 68, 68, 0.25)',
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded bg-rose-500/10 text-rose-400">
              <AlertTriangle size={15} />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">4. Dust & Regolith Chemistry</div>
              <div className="text-[10px] font-mono text-rose-400">
                {isMars ? 'Perchlorates & Fine Aerosols' : 'Electrostatic Glass Shards'}
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {isMars
              ? 'Martian regolith contains toxic, oxidizing perchlorates (0.5–1 wt%) and fine sub-micron dust that penetrates seals during global dust storms.'
              : 'Lunar regolith consists of jagged, unweathered impact-melt glass shards with high electrostatic clinging and abrasive friction against rover joints.'}
          </p>
        </div>
      </div>

      {/* Where the Analogy Breaks Down for Selected Site */}
      {target && selectedSite && breakdownItems.length > 0 && (
        <div
          className="p-3.5 rounded-lg border"
          style={{
            background: 'linear-gradient(145deg, rgba(234, 179, 8, 0.05) 0%, rgba(7, 20, 40, 0.8) 100%)',
            borderColor: 'rgba(234, 179, 8, 0.3)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={15} className="text-amber-400 shrink-0" />
            <span className="text-xs font-semibold text-amber-200 uppercase tracking-wide">
              Where This Specific Analogy Breaks Down
            </span>
          </div>

          <p className="text-[11px] text-slate-400 mb-2.5">
            Primary quantitative parameters where {selectedSite.name} deviates most significantly from {target.name}:
          </p>

          <div className="space-y-2">
            {breakdownItems.map((item, idx) => (
              <div
                key={idx}
                className="p-2 rounded bg-space-950/70 border border-white/5 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="text-slate-200 font-medium">{item.sentence}</div>
                  <div className="text-[10px] text-slate-400">
                    Mission planners must compensate for this parameter in simulation protocols.
                  </div>
                </div>
                <span
                  className={`shrink-0 font-mono text-[10px] px-2 py-0.5 rounded font-semibold ${
                    item.severity === 'high'
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  Δ {item.deltaFormatted}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
