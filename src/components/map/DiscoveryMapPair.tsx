import { useState } from 'react'
import { Layers3, MapPin } from 'lucide-react'
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
} from 'react-leaflet'
import { CesiumGlobe } from '@/components/map/CesiumGlobe'
import { GlobeView } from '@/components/map/GlobeView'
import { useAppStore } from '@/store/useAppStore'
import type { LayerConfig } from '@/lib/layerConfig'
import type { EarthSite, GeometryMode, Planet, PlanetaryRegion, RegionGeometry, SiteScore } from '@/types'

interface LayerMenuProps {
  layers: LayerConfig[]
  activeLayerId?: string
  onSelectLayer?: (layerId: string) => void
  onToggleLayer?: (layerId: string) => void
}

function LayerMenu({ layers, activeLayerId, onSelectLayer, onToggleLayer }: LayerMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="absolute right-2 top-2 z-[600]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-950/90 px-2.5 py-1.5 text-[10px] font-semibold text-slate-100 shadow-lg backdrop-blur hover:border-blue-400"
      >
        <Layers3 size={13} /> Layers
      </button>
      {open && (
        <div className="absolute right-0 top-9 w-64 rounded-lg border border-slate-700 bg-slate-950/95 p-2 shadow-2xl backdrop-blur">
          <p className="mb-1.5 px-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
            NASA imagery layers
          </p>
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {layers.map((layer) => {
              const selected = activeLayerId === layer.id
              const checked = layer.isBase || layer.visible
              return (
                <label
                  key={layer.id}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 text-[10px] text-slate-200 hover:bg-white/5"
                >
                  <span className="min-w-0 truncate">{layer.attribution}</span>
                  {onSelectLayer ? (
                    <input
                      type="radio"
                      name="planetary-map-layer"
                      checked={selected}
                      onChange={() => onSelectLayer(layer.id)}
                      aria-label={layer.attribution}
                      className="accent-blue-500"
                    />
                  ) : (
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={layer.isBase}
                      onChange={() => onToggleLayer?.(layer.id)}
                      aria-label={`${layer.attribution}${layer.isBase ? ' (base layer)' : ''}`}
                      className="accent-blue-500 disabled:opacity-50"
                    />
                  )}
                </label>
              )
            })}
          </div>
          <p className="mt-1.5 border-t border-slate-800 px-1 pt-1.5 text-[9px] leading-relaxed text-amber-200/80">
            Imagery for visualization only; not numerical elevation data.
          </p>
        </div>
      )}
    </div>
  )
}

function EarthCandidateMap({
  layers,
  rankedSites,
  selectedScore,
  onSelectSite,
}: {
  layers: LayerConfig[]
  rankedSites: SiteScore[]
  selectedScore?: SiteScore
  onSelectSite: (siteId: string) => void
}) {
  const baseLayer = layers.find((layer) => layer.isBase)
  const overlays = layers.filter((layer) => !layer.isBase && layer.visible)
  const center: [number, number] = selectedScore
    ? [selectedScore.site.lat, selectedScore.site.lon]
    : [20, 0]

  if (!baseLayer) {
    return (
      <div className="grid h-full min-h-[260px] place-items-center bg-slate-950 p-4 text-center text-xs text-slate-400">
        Earth imagery layer unavailable.
      </div>
    )
  }

  return (
    <MapContainer
      key={selectedScore?.site.id ?? 'no-earth-analogue'}
      center={center}
      zoom={selectedScore ? 5 : 2}
      minZoom={2}
      maxZoom={8}
      scrollWheelZoom
      style={{ height: '100%', minHeight: 260, width: '100%', background: '#05080c' }}
    >
      <TileLayer
        url={baseLayer.url}
        attribution={baseLayer.attribution}
        opacity={baseLayer.opacity}
        minZoom={0}
        maxNativeZoom={8}
        maxZoom={8}
      />
      {overlays.map((layer) => (
        <TileLayer
          key={layer.id}
          url={layer.url}
          attribution={layer.attribution}
          opacity={layer.opacity}
          minZoom={0}
          maxNativeZoom={layer.maxNativeZoom ?? 12}
          maxZoom={8}
          zIndex={2}
        />
      ))}
      {rankedSites.map((item) => (
        <CircleMarker
          key={item.site.id}
          center={[item.site.lat, item.site.lon]}
          radius={item.site.id === selectedScore?.site.id ? 9 : 5}
          pathOptions={{
            color: '#ffffff',
            fillColor: item.site.id === selectedScore?.site.id ? '#3b82f6' : '#10b981',
            fillOpacity: 0.9,
            weight: 2,
          }}
          eventHandlers={{ click: () => onSelectSite(item.site.id) }}
        >
          <Popup>
            <strong>{item.site.name}</strong>
            <br />
            {item.site.country}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}

export interface DiscoveryMapPairProps {
  planet: Planet
  targetRegions: PlanetaryRegion[]
  earthSites: EarthSite[]
  selectedRegion: PlanetaryRegion | null
  geometryMode: GeometryMode
  viewMode: 'globe' | '2d' | 'surface'
  targetLayers: LayerConfig[]
  targetLayer: LayerConfig
  earthLayers: LayerConfig[]
  rankedSites: SiteScore[]
  selectedScore?: SiteScore
  onTargetPick: (lat: number, lon: number, areaKm2: number, geometry: RegionGeometry) => void
  onSelectSite: (siteId: string) => void
  onSelectTargetLayer: (layerId: string) => void
  onToggleEarthLayer: (layerId: string) => void
}

export function DiscoveryMapPair({
  planet,
  targetRegions,
  earthSites,
  selectedRegion,
  geometryMode,
  viewMode,
  targetLayers,
  targetLayer,
  earthLayers,
  rankedSites,
  selectedScore,
  onTargetPick,
  onSelectSite,
  onSelectTargetLayer,
  onToggleEarthLayer,
}: DiscoveryMapPairProps) {
  const { analysisMode, mapPicking, setSelectedRegion } = useAppStore()
  const [cursor, setCursor] = useState<{ lat: number; lon: number } | null>(null)

  return (
    <div className="grid min-h-[360px] min-w-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-2">
      <section className="relative flex min-h-[300px] min-w-0 flex-col overflow-hidden rounded-lg border border-slate-700 bg-[#020408]">
        <header className="flex h-9 shrink-0 items-center gap-2 border-b border-slate-800 bg-slate-950/90 px-3 text-[11px] font-semibold uppercase text-slate-100">
          <span className="text-orange-400">{planet === 'mars' ? '🔴' : '🌕'}</span>
          {planet} target
          <span className="ml-auto max-w-[55%] truncate text-[9px] font-normal text-slate-500">
            {targetLayer.attribution}
          </span>
        </header>
        <div className="relative min-h-0 flex-1">
          {viewMode === '2d' ? (
            <div className="grid h-full min-h-[260px] place-items-center bg-slate-950 p-4 text-center text-xs text-slate-400">
              Choose “3D Globe” to select an area, or use the map below in the full-screen detailed map view.
            </div>
          ) : viewMode === 'surface' ? (
            <GlobeView
              planet={planet}
              regions={targetRegions}
              earthSites={earthSites}
              selectedRegion={selectedRegion}
              onRegionSelect={setSelectedRegion}
            />
          ) : (
            <CesiumGlobe
              planet={planet}
              layer={targetLayer}
              selectedRegion={selectedRegion}
              geometryMode={geometryMode}
              onRegionPick={onTargetPick}
              onCursorMove={setCursor}
            />
          )}
          <LayerMenu
            layers={targetLayers}
            activeLayerId={targetLayer.id}
            onSelectLayer={onSelectTargetLayer}
          />
          {selectedRegion && (
            <div className="pointer-events-none absolute bottom-2 left-2 z-20 max-w-[90%] rounded-lg border border-orange-400/40 bg-slate-950/90 p-2 text-[10px] leading-relaxed text-slate-100 shadow-lg">
              <p className="font-semibold text-orange-300">Selected region</p>
              <p>Lat: {selectedRegion.lat.toFixed(2)}° · Lon: {selectedRegion.lon.toFixed(2)}°</p>
              <p>Area: ~{selectedRegion.area_km2.toLocaleString(undefined, { maximumFractionDigits: 1 })} km²</p>
              {analysisMode === 'demo' && selectedRegion.metricsEstimated && (
                <p className="mt-1 text-amber-200">DEMO attributes estimated from a nearby catalogue region.</p>
              )}
            </div>
          )}
          {mapPicking && (
            <div className="absolute bottom-2 left-1/2 z-30 -translate-x-1/2 rounded-full border border-blue-400/50 bg-slate-950/90 px-3 py-1.5 text-[10px] text-blue-100">
              {geometryMode === 'polygon'
                ? 'Click vertices, then right-click to finish'
                : geometryMode === 'circle'
                  ? 'Click center, then radius'
                  : geometryMode === 'rectangle'
                    ? 'Click opposite corners'
                    : 'Click to place a point'}
            </div>
          )}
          {cursor && (
            <div className="pointer-events-none absolute bottom-2 right-2 z-20 rounded bg-slate-950/80 px-2 py-1 font-mono text-[9px] text-slate-300">
              {cursor.lat.toFixed(3)}°, {cursor.lon.toFixed(3)}°
            </div>
          )}
        </div>
      </section>

      <section className="relative flex min-h-[300px] min-w-0 flex-col overflow-hidden rounded-lg border border-slate-700 bg-[#020408]">
        <header className="flex h-9 shrink-0 items-center gap-2 border-b border-slate-800 bg-slate-950/90 px-3 text-[11px] font-semibold uppercase text-slate-100">
          <span className="text-emerald-400">🌎</span>
          Earth analogue
          <span className="ml-1 min-w-0 truncate text-[10px] font-normal normal-case text-blue-200">
            {selectedScore ? `— ${selectedScore.site.name}` : '— candidate map'}
          </span>
          <LayerMenu layers={earthLayers} onToggleLayer={onToggleEarthLayer} />
        </header>
        <div className="relative min-h-0 flex-1">
          <EarthCandidateMap
            layers={earthLayers}
            rankedSites={rankedSites}
            selectedScore={selectedScore}
            onSelectSite={onSelectSite}
          />
          {selectedScore && (
            <div className="pointer-events-none absolute bottom-2 left-2 z-[500] rounded-lg border border-emerald-400/30 bg-slate-950/90 p-2 text-[10px] text-slate-100 shadow-lg">
              <p className="font-semibold text-emerald-300">{selectedScore.site.name}, {selectedScore.site.country}</p>
              {analysisMode === 'demo' ? (
                <p>DEMO similarity: <strong>{Math.round(selectedScore.score)}%</strong></p>
              ) : (
                <p>NASA elevation-only score: <strong>{Math.round(selectedScore.score)}%</strong></p>
              )}
            </div>
          )}
          {!selectedScore && (
            <div className="pointer-events-none absolute inset-0 z-[500] grid place-items-center bg-slate-950/35 p-4 text-center text-[11px] text-slate-100">
              <span className="rounded-lg border border-slate-700 bg-slate-950/85 px-3 py-2">
                <MapPin size={14} className="mr-1 inline text-blue-300" />
                Earth analogue candidates appear here after analysis.
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
