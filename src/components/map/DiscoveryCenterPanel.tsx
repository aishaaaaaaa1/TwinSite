import { useMemo, useState } from 'react'
import { Eye, FileSearch, Globe, Map } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { MapView2D } from '@/components/map/MapView2D'
import { DiscoveryMapPair } from '@/components/map/DiscoveryMapPair'
import { LAYER_CONFIGS } from '@/lib/layerConfig'
import { createRegionAtCoordinates } from '@/lib/regionSelection'
import type { Planet, PlanetaryRegion, RegionGeometry, SitesData, WeightSet } from '@/types'

interface DiscoveryCenterPanelProps {
  data: SitesData | null
}

const GRAVITY: Record<Planet, number> = {
  earth: 9.81,
  moon: 1.62,
  mars: 3.71,
}

const WEIGHTED_FEATURES: Array<[keyof WeightSet, string, string]> = [
  ['elevation_mean', 'Elevation', 'm'],
  ['slope_mean', 'Mean slope', '°'],
  ['roughness', 'Roughness', 'index'],
  ['temp_mean', 'Mean temperature', '°C'],
]

export function DiscoveryCenterPanel({ data }: DiscoveryCenterPanelProps) {
  const {
    planet,
    viewMode,
    geometryMode,
    analysisMode,
    selectedRegion,
    rankedSites,
    selectedSiteId,
    weights,
    lambda,
    nSites,
    setViewMode,
    setSelectedRegion,
    setMapPicking,
    setSelectedSiteId,
    setWeight,
    setLambda,
    setNSites,
  } = useAppStore()
  const [layers, setLayers] = useState(LAYER_CONFIGS)
  const [targetLayerId, setTargetLayerId] = useState('')
  const [mapError, setMapError] = useState('')

  const regions: PlanetaryRegion[] = planet === 'moon'
    ? data?.moonRegions ?? []
    : data?.marsRegions ?? []
  const earthSites = data?.earthSites ?? []
  const targetLayers = layers.filter((layer) => layer.body === planet)
  const selectedTargetLayer = targetLayers.find((layer) => layer.id === targetLayerId)
    ?? targetLayers.find((layer) => layer.isBase)
    ?? targetLayers[0]
  const earthLayers = layers.filter((layer) => layer.body === 'earth')
  const selectedScore = rankedSites.find((item) => item.site.id === selectedSiteId) ?? rankedSites[0]

  const handleTargetPick = (
    lat: number,
    lon: number,
    areaKm2: number,
    geometry?: RegionGeometry,
  ) => {
    try {
      const region = createRegionAtCoordinates(planet, lat, lon, regions, areaKm2, geometry)
      setSelectedRegion(region)
      setMapPicking(false)
      setMapError('')
    } catch (error) {
      setMapError(error instanceof Error ? error.message : String(error))
    }
  }

  const toggleEarthLayer = (layerId: string) => {
    setLayers((current) =>
      current.map((layer) => layer.id === layerId
        ? { ...layer, visible: !layer.visible }
        : layer),
    )
  }

  const comparisonRows = useMemo(() => {
    if (!selectedRegion || !selectedScore) return []
    if (analysisMode === 'scientific') {
      const targetElevation = selectedRegion.features.elevation_mean
      const earthElevation = selectedScore.site.features.elevation_mean
      if (targetElevation === null || earthElevation === null) return []
      return [{
        label: 'NASA DEM elevation',
        target: `${targetElevation.toFixed(0)} m`,
        earth: `${earthElevation.toFixed(0)} m`,
      }]
    }
    return WEIGHTED_FEATURES.map(([key, label, unit]) => ({
      label,
      target: `${selectedRegion.features[key]?.toFixed(key === 'roughness' ? 2 : 1) ?? '—'} ${unit}`,
      earth: `${selectedScore.site.features[key]?.toFixed(key === 'roughness' ? 2 : 1) ?? '—'} ${unit}`,
    }))
  }, [analysisMode, selectedRegion, selectedScore])

  return (
    <div className="relative flex h-full min-w-0 flex-col overflow-hidden bg-[#020408]">
      <header className="z-30 flex min-h-12 flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/85 px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-100">
          <Globe size={15} className="text-blue-400" />
          Planetary Explorer
          <span className="rounded border border-orange-500/30 bg-orange-950/30 px-1.5 py-0.5 text-[9px] text-orange-200">
            {planet} target
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1">
          {([
            ['globe', Globe, '3D Globe'],
            ['surface', Eye, 'Surface Exploration'],
            ['2d', Map, '2D Detailed Map'],
          ] as const).map(([mode, Icon, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setViewMode(mode)
                if (mode === 'globe') setMapPicking(false)
              }}
              aria-pressed={viewMode === mode}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition ${
                viewMode === mode
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        {viewMode === '2d' ? (
          <div className="relative h-[min(60vh,520px)] min-h-[360px] overflow-hidden rounded-lg border border-slate-700">
            <MapView2D
              planet={planet}
              regions={regions}
              earthSites={earthSites}
              layers={layers}
              selectedRegion={selectedRegion}
              geometryMode={geometryMode}
              onRegionSelect={setSelectedRegion}
              onMapPick={handleTargetPick}
              onSelectionError={setMapError}
            />
          </div>
        ) : selectedTargetLayer ? (
          <DiscoveryMapPair
            planet={planet}
            targetRegions={regions}
            earthSites={earthSites}
            selectedRegion={selectedRegion}
            geometryMode={geometryMode}
            viewMode={viewMode}
            targetLayers={targetLayers}
            targetLayer={selectedTargetLayer}
            earthLayers={earthLayers}
            rankedSites={rankedSites}
            selectedScore={selectedScore}
            onTargetPick={handleTargetPick}
            onSelectSite={setSelectedSiteId}
            onSelectTargetLayer={setTargetLayerId}
            onToggleEarthLayer={toggleEarthLayer}
          />
        ) : (
          <div role="status" className="grid min-h-[360px] place-items-center rounded-lg border border-slate-700 bg-slate-950 p-4 text-center text-xs text-slate-300">
            No NASA imagery layer is configured for {planet}.
          </div>
        )}

        {mapError && (
          <p role="alert" className="mt-2 rounded border border-rose-500/40 bg-rose-950/40 p-2 text-[10px] text-rose-200">
            {mapError}
          </p>
        )}

        <section className="mt-2 rounded-lg border border-blue-500/30 bg-[linear-gradient(145deg,rgba(7,20,40,0.96),rgba(4,13,26,0.98))]">
          <header className="flex items-center justify-between gap-2 border-b border-slate-800 px-3 py-2">
            <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-100">
              <FileSearch size={15} className="text-blue-400" /> Terrain comparison
            </h2>
            <span className={`rounded border px-2 py-1 text-[9px] font-bold ${
              analysisMode === 'demo'
                ? 'border-amber-500/40 bg-amber-950/30 text-amber-200'
                : rankedSites.length
                  ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200'
                  : 'border-slate-600 bg-slate-900 text-slate-300'
            }`}>
              {analysisMode === 'demo'
                ? 'DEMO · ILLUSTRATIVE'
                : rankedSites.length ? 'NASA · ELEVATION ONLY' : 'NASA MEASUREMENTS NOT LOADED'}
            </span>
          </header>
          {selectedRegion ? (
            <div className="grid gap-3 p-3 md:grid-cols-[1fr_1fr_150px]">
              <div className="flex items-center gap-2 border-r border-slate-800 pr-2">
                <span className="text-xl">{planet === 'mars' ? '🔴' : '🌕'}</span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-slate-100">{planet} · target region</p>
                  <p className="text-[9px] text-slate-400">
                    {selectedRegion.lat.toFixed(2)}°, {selectedRegion.lon.toFixed(2)}° · ~{selectedRegion.area_km2.toLocaleString()} km²
                  </p>
                  <p className="mt-1 text-[9px] text-slate-500">Gravity: {GRAVITY[planet]} m/s²</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🌎</span>
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-semibold text-slate-100">
                    {selectedScore ? `${selectedScore.site.name} · Earth analogue` : 'Earth candidate'}
                  </p>
                  <p className="text-[9px] text-slate-400">
                    {selectedScore ? `${selectedScore.site.country} · Gravity: ${GRAVITY.earth} m/s²` : 'Select a candidate after analysis'}
                  </p>
                  {analysisMode === 'demo' && selectedScore && (
                    <p className="mt-1 text-[9px] text-amber-200">
                      DEMO terrain class: {selectedScore.site.features.terrainClass}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid place-items-center border-l border-slate-800">
                <div className="text-center">
                  <p className="text-[9px] uppercase text-slate-400">Similarity score</p>
                  <p className={`text-2xl font-black ${selectedScore ? 'text-emerald-400' : 'text-slate-400'}`}>
                    {selectedScore
                      ? `${Math.round(selectedScore.score)}%`
                      : 'N/A'}
                  </p>
                  <p className="text-[9px] text-slate-500">
                    {analysisMode === 'demo'
                      ? 'DEMO score · not scientific'
                      : selectedScore
                        ? 'Elevation-only proxy · differing reference datums'
                        : 'Verified data unavailable'}
                  </p>
                </div>
              </div>
              {comparisonRows.length > 0 && (
                <div className="grid gap-2 border-t border-slate-800 pt-2 md:col-span-3 md:grid-cols-4">
                  {comparisonRows.map((row) => (
                    <div key={row.label} className="rounded border border-slate-800 bg-slate-950/70 p-2">
                      <p className="text-[9px] text-slate-500">{row.label}</p>
                      <p className="mt-1 text-[10px] text-slate-300">{row.target} <span className="text-slate-600">→</span> {row.earth}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="p-3 text-[10px] text-slate-400">
              Select a Moon or Mars region, connect a NASA Earthdata token, and run a NASA analysis. Map imagery is not used as numerical data.
            </p>
          )}
        </section>

        {analysisMode === 'demo' && (
          <div className="mt-2 grid grid-cols-2 gap-3 rounded-lg border border-slate-800 bg-slate-950/70 p-3 lg:grid-cols-4">
            <label className="text-[9px] text-slate-400">
              Elevation weight · {Math.round(weights.elevation_mean * 100)}%
              <input aria-label="Elevation weight" type="range" min="0" max="1" step="0.01" value={weights.elevation_mean}
                onChange={(event) => setWeight('elevation_mean', Number(event.target.value))} className="mt-1 w-full accent-blue-500" />
            </label>
            <label className="text-[9px] text-slate-400">
              Slope weight · {Math.round(weights.slope_mean * 100)}%
              <input aria-label="Slope weight" type="range" min="0" max="1" step="0.01" value={weights.slope_mean}
                onChange={(event) => setWeight('slope_mean', Number(event.target.value))} className="mt-1 w-full accent-blue-500" />
            </label>
            <label className="text-[9px] text-slate-400">
              Diversity · {Math.round(lambda * 100)}%
              <input aria-label="Diversity weight" type="range" min="0" max="1" step="0.05" value={lambda}
                onChange={(event) => setLambda(Number(event.target.value))} className="mt-1 w-full accent-blue-500" />
            </label>
            <label className="text-[9px] text-slate-400">
              Candidate count · {nSites}
              <input aria-label="Candidate count" type="range" min="1" max="20" step="1" value={nSites}
                onChange={(event) => setNSites(Number(event.target.value))} className="mt-1 w-full accent-blue-500" />
            </label>
          </div>
        )}

      </div>
    </div>
  )
}
