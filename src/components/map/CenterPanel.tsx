import { useState } from 'react'
import { Globe, Map, Eye, Layers } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { GlobeView } from '@/components/map/GlobeView'
import { MapView2D } from '@/components/map/MapView2D'
import { SurfaceView } from '@/components/map/SurfaceView'
import { LAYER_CONFIGS } from '@/lib/layerConfig'
import { createRegionAtCoordinates } from '@/lib/regionSelection'
import type { SitesData, PlanetaryRegion, RegionGeometry } from '@/types'

interface CenterPanelProps {
  data: SitesData | null
}

export function CenterPanel({ data }: CenterPanelProps) {
  const {
    planet,
    viewMode,
    geometryMode,
    selectedRegion,
    setViewMode,
    setSelectedRegion,
    setMapPicking,
  } = useAppStore()

  const [showLayers, setShowLayers] = useState(false)
  const [layers, setLayers] = useState(LAYER_CONFIGS)
  const [mapError, setMapError] = useState('')

  const regions: PlanetaryRegion[] =
    planet === 'moon' ? data?.moonRegions ?? [] : data?.marsRegions ?? []

  const earthSites = data?.earthSites ?? []

  const toggleLayer = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l))
    )
  }

  const handleMapPick = (
    lat: number,
    lon: number,
    areaKm2: number,
    geometry: RegionGeometry,
  ) => {
    try {
      setSelectedRegion(createRegionAtCoordinates(planet, lat, lon, regions, areaKm2, geometry))
      setMapPicking(false)
      setMapError('')
    } catch (error) {
      setMapError(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-[#020408] overflow-hidden">
      {/* Top View Switcher Toolbar */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-1 backdrop-blur-md shadow-2xl">
        <button
          onClick={() => setViewMode('globe')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
            viewMode === 'globe'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Globe size={14} />
          <span>3D Globe</span>
        </button>

        <button
          onClick={() => setViewMode('2d')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
            viewMode === '2d'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Map size={14} />
          <span>2D Map</span>
        </button>

        <button
          onClick={() => setViewMode('surface')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
            viewMode === 'surface'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Eye size={14} />
          <span>Surface</span>
        </button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        {/* Layer toggle button */}
        <button
          onClick={() => setShowLayers((v) => !v)}
          className={`p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            showLayers
              ? 'bg-slate-800 text-blue-400'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
          title="Toggle Layers"
        >
          <Layers size={14} />
        </button>
      </div>

      {/* Layer selector popover */}
      {showLayers && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 w-72 bg-slate-900/95 border border-slate-800 rounded-xl p-3 shadow-2xl backdrop-blur-md">
          <div className="text-xs font-bold text-white mb-2 flex items-center justify-between">
            <span>NASA GIBS / Trek Layers</span>
            <button
              onClick={() => setShowLayers(false)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto pr-1">
            {layers
              .filter((layer) => layer.body === planet || layer.body === 'earth')
              .map((l) => (
              <label
                key={l.id}
                className="flex items-center justify-between text-xs text-slate-300 hover:bg-slate-800/50 p-1.5 rounded cursor-pointer"
              >
                <span className="truncate pr-2">{l.attribution}</span>
                <input
                  type="checkbox"
                  checked={l.visible}
                  disabled={l.isBase}
                  onChange={() => toggleLayer(l.id)}
                  aria-label={`${l.attribution}${l.isBase ? ' (required base layer)' : ''}`}
                  className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>
              ))}
          </div>
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 w-full h-full relative">
        {viewMode === 'globe' && (
          <GlobeView
            planet={planet}
            regions={regions}
            earthSites={earthSites}
            selectedRegion={selectedRegion}
            onRegionSelect={setSelectedRegion}
          />
        )}

        {viewMode === '2d' && (
          <MapView2D
            planet={planet}
            regions={regions}
            earthSites={earthSites}
            layers={layers}
            selectedRegion={selectedRegion}
            geometryMode={geometryMode}
            onRegionSelect={setSelectedRegion}
            onMapPick={handleMapPick}
            onSelectionError={setMapError}
          />
        )}

        {viewMode === 'surface' && <SurfaceView earthSites={earthSites} />}
        {mapError && (
          <div
            role="alert"
            className="absolute bottom-3 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-rose-500/40 bg-slate-950/95 px-3 py-2 text-xs text-rose-200"
          >
            {mapError}
          </div>
        )}
      </div>
    </div>
  )
}
