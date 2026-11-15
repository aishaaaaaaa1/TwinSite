import { useAppStore } from '@/store/useAppStore'
import { useI18n } from '@/hooks/useI18n'
import type { EarthSite } from '@/types'
import { MapPin, Thermometer, Mountain, Compass, Wind } from 'lucide-react'

interface SurfaceViewProps {
  earthSites: EarthSite[]
}

const TERRAIN_IMAGES: Record<string, string> = {
  desert:
    'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1600&q=80',
  volcanic:
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80',
  lava_field:
    'https://images.unsplash.com/photo-1508873696983-2df57046475a?auto=format&fit=crop&w=1600&q=80',
  periglacial:
    'https://images.unsplash.com/photo-1483921020237-2ff51e8e4b22?auto=format&fit=crop&w=1600&q=80',
  impact_crater:
    'https://images.unsplash.com/photo-1518457607834-6e8d80c183c5?auto=format&fit=crop&w=1600&q=80',
  highland:
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80',
  playa:
    'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1600&q=80',
  default:
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80',
}

export function SurfaceView({ earthSites }: SurfaceViewProps) {
  const { lang } = useI18n()
  const { selectedSiteId, rankedSites } = useAppStore()

  // Find currently selected site or fallback to first ranked or first earthSite
  const currentSite =
    earthSites.find((s) => s.id === selectedSiteId) ??
    rankedSites[0]?.site ??
    earthSites[0]

  if (!currentSite) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#020408] text-slate-400">
        No analogue site selected
      </div>
    )
  }

  const terrainClass = currentSite.features.terrainClass
  const bgUrl =
    currentSite.imageUrl ||
    (terrainClass ? TERRAIN_IMAGES[terrainClass] : undefined) ||
    TERRAIN_IMAGES.default

  const rankedItem = rankedSites.find((r) => r.site.id === currentSite.id)

  const description =
    lang === 'fr' && currentSite.descriptionFr
      ? currentSite.descriptionFr
      : currentSite.description

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#020408] flex flex-col justify-end">
      {/* Background Hero Image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 filter brightness-75 contrast-110"
        style={{ backgroundImage: `url('${bgUrl}')` }}
      />

      {/* Subtle Dark Vignette & Gradient Overlays */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(2,4,8,0.95) 0%, rgba(2,4,8,0.4) 50%, rgba(2,4,8,0.7) 100%)',
        }}
      />

      {/* Top Header Tag */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-black/60 border border-slate-700 text-blue-400 backdrop-blur">
          Surface Visualizer
        </span>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize bg-slate-900/80 border border-slate-700 text-slate-300 backdrop-blur">
          {terrainClass ?? 'terrain unavailable'}
        </span>
      </div>

      {/* Bottom Overlay Stats Panel */}
      <div className="relative z-10 p-6 max-w-4xl mx-auto w-full">
        <div className="bg-slate-950/85 border border-slate-800 rounded-xl p-5 backdrop-blur-md shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <MapPin size={18} className="text-orange-500 shrink-0" />
                <h2 className="text-xl font-black text-white tracking-wide">
                  {currentSite.name}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                  {currentSite.country}
                </span>
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1 pl-6">
                Lat: {currentSite.lat.toFixed(2)}° | Lon: {currentSite.lon.toFixed(2)}° | Area: {currentSite.area_km2.toLocaleString()} km²
              </div>
            </div>

            {rankedItem && (
              <div className="flex items-center gap-3 self-start md:self-auto bg-slate-900/90 border border-slate-800 px-3.5 py-2 rounded-lg">
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block leading-tight">
                    Match Rank
                  </span>
                  <span className="text-xs font-bold text-white">#{rankedItem.rank}</span>
                </div>
                <div className="h-6 w-px bg-slate-800" />
                <div className="text-right">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block leading-tight">
                    Similarity
                  </span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {Math.round(rankedItem.score)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="text-xs text-slate-300 leading-relaxed my-3 font-light">
              {description}
            </p>
          )}

          {/* Environmental Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2.5">
              <Mountain size={16} className="text-blue-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">
                  Elevation
                </span>
                <span className="text-xs font-mono font-bold text-white">
                  {currentSite.features.elevation_mean?.toFixed(0) ?? '—'} m
                </span>
              </div>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2.5">
              <Compass size={16} className="text-orange-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">
                  Mean Slope
                </span>
                <span className="text-xs font-mono font-bold text-white">
                  {currentSite.features.slope_mean?.toFixed(1) ?? '—'}°
                </span>
              </div>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2.5">
              <Thermometer size={16} className="text-rose-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">
                  Temp Range
                </span>
                <span className="text-xs font-mono font-bold text-white">
                  {currentSite.features.temp_min ?? '—'}° to {currentSite.features.temp_max ?? '—'}°C
                </span>
              </div>
            </div>

            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 flex items-center gap-2.5">
              <Wind size={16} className="text-emerald-400 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">
                  Aridity Index
                </span>
                <span className="text-xs font-mono font-bold text-white">
                  {currentSite.features.aridity?.toFixed(2) ?? '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
