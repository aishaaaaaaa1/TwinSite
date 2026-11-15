import type { PlanetaryRegion, SiteScore } from '@/types'
import { PlanetBadge } from '@/components/ui/PlanetBadge'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'
import { AlertTriangle, Compass, CheckCircle2 } from 'lucide-react'

interface TerrainComparisonPanelProps {
  target: PlanetaryRegion
  siteScore: SiteScore
}

const GRAVITY_MAP: Record<string, number> = {
  earth: 9.81,
  moon: 1.62,
  mars: 3.71,
}

const FEATURE_META: Record<
  string,
  { label: string; unit: string; format: (v: number) => string; normMin: number; normMax: number }
> = {
  elevation_mean: {
    label: 'Mean Elevation',
    unit: 'm',
    format: (v) => `${Math.round(v).toLocaleString()} m`,
    normMin: -4000,
    normMax: 10000,
  },
  relief_std: {
    label: 'Relief Std Dev',
    unit: 'm',
    format: (v) => `${Math.round(v)} m`,
    normMin: 0,
    normMax: 1200,
  },
  slope_mean: {
    label: 'Mean Slope',
    unit: '°',
    format: (v) => `${v.toFixed(1)}°`,
    normMin: 0,
    normMax: 35,
  },
  slope_p90: {
    label: 'Slope (P90)',
    unit: '°',
    format: (v) => `${v.toFixed(1)}°`,
    normMin: 0,
    normMax: 50,
  },
  roughness: {
    label: 'Roughness',
    unit: '',
    format: (v) => v.toFixed(2),
    normMin: 0,
    normMax: 1.0,
  },
  temp_mean: {
    label: 'Mean Temperature',
    unit: '°C',
    format: (v) => `${v.toFixed(1)}°C`,
    normMin: -100,
    normMax: 40,
  },
  aridity: {
    label: 'Aridity Index',
    unit: '',
    format: (v) => v.toFixed(2),
    normMin: 0,
    normMax: 1.0,
  },
}

function normalize(val: number, min: number, max: number): number {
  if (max === min) return 0.5
  const clamped = Math.max(min, Math.min(max, val))
  return Number(((clamped - min) / (max - min)).toFixed(3))
}

export function TerrainComparisonPanel({ target, siteScore }: TerrainComparisonPanelProps) {
  if (!target || !siteScore || !siteScore.site) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 bg-space-900/60 rounded-lg border border-blue-500/10">
        Select a planetary region and an Earth analogue to view terrain comparison.
      </div>
    )
  }

  const earthSite = siteScore.site
  const targetGrav = GRAVITY_MAP[target.planet] ?? 1.62
  const earthGrav = GRAVITY_MAP.earth

  // 6 features for Radar Chart
  const radarFeatureKeys = [
    'elevation_mean',
    'relief_std',
    'slope_mean',
    'roughness',
    'temp_mean',
    'aridity',
  ] as const

  const radarData = radarFeatureKeys.map((key) => {
    const meta = FEATURE_META[key]
    const targetVal = target.features[key] as number
    const earthVal = earthSite.features[key] as number
    return {
      feature: meta.label.replace('Mean ', '').replace(' Index', ''),
      target: normalize(targetVal, meta.normMin, meta.normMax),
      earth: normalize(earthVal, meta.normMin, meta.normMax),
      rawTarget: meta.format(targetVal),
      rawEarth: meta.format(earthVal),
    }
  })

  // Feature contributions for horizontal bars
  const contributions = siteScore.contributions || {}
  const contribEntries = Object.entries(contributions)
  const maxContrib = Math.max(...contribEntries.map(([, v]) => v), 0.0001)

  // Sort contributions descending to find where analogy breaks down
  const sortedContribs = [...contribEntries].sort((a, b) => b[1] - a[1])
  const breakdownSentences: string[] = []

  // Top dissimilar features
  for (const [key] of sortedContribs.slice(0, 3)) {
    const meta = FEATURE_META[key]
    if (!meta) continue
    const tVal = target.features[key as keyof typeof target.features] as number
    const eVal = earthSite.features[key as keyof typeof earthSite.features] as number
    const diff = Math.abs(tVal - eVal)

    if (key === 'temp_mean') {
      breakdownSentences.push(
        `Temperature differs by ${diff.toFixed(1)}°C (target: ${tVal.toFixed(1)}°C vs Earth: ${eVal.toFixed(1)}°C).`
      )
    } else if (key === 'elevation_mean') {
      breakdownSentences.push(
        `Mean elevation differs by ${Math.round(diff).toLocaleString()} m (target: ${meta.format(tVal)} vs Earth: ${meta.format(eVal)}).`
      )
    } else if (key === 'slope_mean' || key === 'slope_p90') {
      breakdownSentences.push(
        `${meta.label} diverges by ${diff.toFixed(1)}° (target: ${tVal.toFixed(1)}° vs Earth: ${eVal.toFixed(1)}°).`
      )
    } else if (key === 'relief_std') {
      breakdownSentences.push(
        `Relief standard deviation differs by ${Math.round(diff)} m.`
      )
    } else if (key === 'aridity') {
      breakdownSentences.push(
        `Aridity index differs by ${diff.toFixed(2)} (${meta.format(tVal)} vs ${meta.format(eVal)}).`
      )
    } else {
      breakdownSentences.push(
        `${meta.label} diverges by ${diff.toFixed(2)}.`
      )
    }
  }

  // Find closely matched feature
  const closestKey = sortedContribs[sortedContribs.length - 1]?.[0]
  if (closestKey && FEATURE_META[closestKey]) {
    const meta = FEATURE_META[closestKey]
    const tVal = target.features[closestKey as keyof typeof target.features] as number
    const eVal = earthSite.features[closestKey as keyof typeof earthSite.features] as number
    const diff = Math.abs(tVal - eVal)
    const formattedDiff = closestKey === 'elevation_mean' ? `${Math.round(diff)} m` : diff < 1 ? diff.toFixed(2) : `${diff.toFixed(1)}${meta.unit}`
    breakdownSentences.push(`${meta.label} is closely matched within ${formattedDiff}.`)
  }

  // Table rows for all 7 numeric features
  const tableKeys = [
    'elevation_mean',
    'relief_std',
    'slope_mean',
    'slope_p90',
    'roughness',
    'temp_mean',
    'aridity',
  ] as const

  return (
    <div className="space-y-4">
      {/* Two-column Header */}
      <div className="grid grid-cols-2 gap-3">
        {/* Planet Side (Left / Orange) */}
        <div
          className="p-3 rounded-lg flex flex-col justify-between"
          style={{
            background: 'linear-gradient(145deg, rgba(249, 115, 22, 0.08) 0%, rgba(7, 20, 40, 0.8) 100%)',
            border: '1px solid rgba(249, 115, 22, 0.3)',
          }}
        >
          <div>
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <PlanetBadge planet={target.planet} size="sm" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-orange-400 font-semibold">
                Target Region
              </span>
            </div>
            <div className="text-sm font-bold text-slate-100 truncate" title={target.name}>
              {target.name}
            </div>
            <div className="text-[11px] text-slate-400 capitalize mt-0.5">
              {target.features.terrainClass?.replace('_', ' ') || 'Planetary Terrain'}
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-orange-500/20 grid grid-cols-2 gap-1 text-[10px]">
            <div>
              <span className="text-slate-400">Temp:</span>{' '}
              <span className="text-slate-200 font-mono font-medium">
                {target.features.temp_mean?.toFixed(1) ?? '—'}°C
              </span>
            </div>
            <div>
              <span className="text-slate-400">Gravity:</span>{' '}
              <span className="text-orange-300 font-mono font-medium">{targetGrav} m/s²</span>
            </div>
          </div>
        </div>

        {/* Earth Side (Right / Green) */}
        <div
          className="p-3 rounded-lg flex flex-col justify-between"
          style={{
            background: 'linear-gradient(145deg, rgba(34, 197, 94, 0.08) 0%, rgba(7, 20, 40, 0.8) 100%)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
          }}
        >
          <div>
            <div className="flex items-center justify-between gap-1 mb-1.5">
              <PlanetBadge planet="earth" size="sm" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-green-400 font-semibold">
                Rank #{siteScore.rank} • {siteScore.score.toFixed(1)}%
              </span>
            </div>
            <div className="text-sm font-bold text-slate-100 truncate" title={earthSite.name}>
              {earthSite.name}
            </div>
            <div className="text-[11px] text-slate-400 truncate mt-0.5">
              {earthSite.country} • {earthSite.features.terrainClass?.replace('_', ' ')}
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-green-500/20 grid grid-cols-2 gap-1 text-[10px]">
            <div>
              <span className="text-slate-400">Temp:</span>{' '}
              <span className="text-slate-200 font-mono font-medium">
                {earthSite.features.temp_mean?.toFixed(1) ?? '—'}°C
              </span>
            </div>
            <div>
              <span className="text-slate-400">Gravity:</span>{' '}
              <span className="text-green-300 font-mono font-medium">{earthGrav} m/s²</span>
            </div>
          </div>
        </div>
      </div>

      {/* Radar Chart */}
      <div
        className="p-3 rounded-lg"
        style={{ background: 'var(--color-panel)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200 uppercase tracking-wide">
            <Compass size={13} className="text-blue-400" />
            <span>Multi-Feature Terrain Radar</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Normalized [0–1]</span>
        </div>

        <div className="w-full h-56">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
              <PolarGrid stroke="rgba(59, 142, 255, 0.15)" />
              <PolarAngleAxis
                dataKey="feature"
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const item = payload[0].payload as typeof radarData[number]
                  return (
                    <div
                      className="px-2.5 py-1.5 rounded shadow-lg text-[11px]"
                      style={{
                        background: 'rgba(4, 13, 26, 0.95)',
                        border: '1px solid rgba(59, 142, 255, 0.3)',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <div className="font-semibold text-slate-200 mb-1">{item.feature}</div>
                      <div className="text-blue-400">
                        {target.name}: <span className="font-mono text-slate-100">{item.rawTarget}</span>
                      </div>
                      <div className="text-orange-400">
                        {earthSite.name}: <span className="font-mono text-slate-100">{item.rawEarth}</span>
                      </div>
                    </div>
                  )
                }}
              />
              <Radar
                name={target.name}
                dataKey="target"
                stroke="#3b8eff"
                fill="#3b8eff"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Radar
                name={earthSite.name}
                dataKey="earth"
                stroke="#f97316"
                fill="#f97316"
                fillOpacity={0.25}
                strokeWidth={2}
              />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: '10px', paddingTop: '6px' }}
                iconType="circle"
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Feature Contribution Bars */}
      <div
        className="p-3 rounded-lg"
        style={{ background: 'var(--color-panel)', border: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
            Feature Dissimilarity Contributions
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Higher = Greater Disparity</span>
        </div>
        <p className="text-[11px] text-slate-400 mb-3">
          Weighted contribution to distance metric. Longer bar indicates a primary source of analogy breakdown.
        </p>

        <div className="space-y-2">
          {sortedContribs.map(([featKey, contribVal]) => {
            const meta = FEATURE_META[featKey]
            const pct = Math.min(100, Math.max(3, (contribVal / maxContrib) * 100))
            const isHigh = pct > 60

            return (
              <div key={featKey} className="text-[11px]">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-slate-300 font-medium">
                    {meta?.label ?? featKey}
                  </span>
                  <span className="font-mono text-slate-400 text-[10px]">
                    {contribVal.toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isHigh
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                        : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Delta Table */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ background: 'var(--color-panel)', border: '1px solid var(--color-border)' }}
      >
        <div className="px-3 py-2 border-b border-blue-500/20 bg-blue-950/30 flex justify-between items-center">
          <span className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
            Quantitative Delta Table
          </span>
          <span className="text-[10px] text-slate-400">Δ = Earth - Target</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-white/5 text-[10px] uppercase font-mono text-slate-400 bg-white/[0.02]">
                <th className="py-2 px-3">Feature</th>
                <th className="py-2 px-2 text-right">Target</th>
                <th className="py-2 px-2 text-right">Earth</th>
                <th className="py-2 px-3 text-right">Delta (Δ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {tableKeys.map((key) => {
                const meta = FEATURE_META[key]
                const tVal = target.features[key] as number
                const eVal = earthSite.features[key] as number
                const delta = eVal - tVal
                const deltaSign = delta > 0 ? '+' : ''
                const formattedDelta =
                  key === 'elevation_mean' || key === 'relief_std'
                    ? `${deltaSign}${Math.round(delta)} m`
                    : key === 'slope_mean' || key === 'slope_p90'
                    ? `${deltaSign}${delta.toFixed(1)}°`
                    : key === 'temp_mean'
                    ? `${deltaSign}${delta.toFixed(1)}°C`
                    : `${deltaSign}${delta.toFixed(2)}`

                const absDeltaNorm = Math.abs(delta) / (meta.normMax - meta.normMin)
                const isSignificant = absDeltaNorm > 0.35

                return (
                  <tr key={key} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-1.5 px-3 font-sans text-slate-300">{meta.label}</td>
                    <td className="py-1.5 px-2 text-right text-slate-400">{meta.format(tVal)}</td>
                    <td className="py-1.5 px-2 text-right text-slate-300">{meta.format(eVal)}</td>
                    <td
                      className={`py-1.5 px-3 text-right font-semibold ${
                        isSignificant ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {formattedDelta}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Where the Analogy Breaks Down */}
      <div
        className="p-3 rounded-lg border"
        style={{
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(249, 115, 22, 0.05) 100%)',
          borderColor: 'rgba(239, 68, 68, 0.25)',
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={14} className="text-amber-400 shrink-0" />
          <span className="text-xs font-semibold text-amber-200 uppercase tracking-wide">
            Where the Analogy Breaks Down
          </span>
        </div>
        <div className="space-y-1.5 text-xs text-slate-300">
          {breakdownSentences.map((sentence, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-amber-400 text-xs leading-relaxed shrink-0">
                {idx === breakdownSentences.length - 1 ? (
                  <CheckCircle2 size={12} className="text-emerald-400 mt-0.5" />
                ) : (
                  '•'
                )}
              </span>
              <span className="leading-relaxed">{sentence}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
