import { useEffect, useState } from 'react'
import L from 'leaflet'
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { LayerConfig } from '@/lib/layerConfig'
import { createCircleRegion, createPolygonRegion } from '@/lib/regionSelection'
import type { GeometryMode, Planet, PlanetaryRegion, EarthSite, RegionGeometry } from '@/types'
import { useAppStore } from '@/store/useAppStore'

export interface MapView2DProps {
  planet: Planet
  regions: PlanetaryRegion[]
  earthSites: EarthSite[]
  layers: LayerConfig[]
  selectedRegion: PlanetaryRegion | null
  geometryMode: GeometryMode
  onRegionSelect: (region: PlanetaryRegion) => void
  onMapPick: (lat: number, lon: number, areaKm2: number, geometry: RegionGeometry) => void
  onSelectionError: (message: string) => void
}

const PLANETARY_CRS = L.CRS.EPSG4326
const PLANETARY_BOUNDS = L.latLngBounds([
  [-90, -180],
  [90, 180],
])

function MapCamera({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, zoom)
  }, [center, map, zoom])

  return null
}

function MapPicker({
  enabled,
  planet,
  geometryMode,
  onPick,
  onError,
}: {
  enabled: boolean
  planet: Planet
  geometryMode: GeometryMode
  onPick: (lat: number, lon: number, areaKm2: number, geometry: RegionGeometry) => void
  onError: (message: string) => void
}) {
  const [points, setPoints] = useState<Array<{ lat: number; lon: number }>>([])
  const normalizeLongitude = (longitude: number) => ((longitude + 540) % 360) - 180
  const completeSelection = (
    lat: number,
    lon: number,
    areaKm2: number,
    geometry: RegionGeometry,
  ) => {
    onPick(lat, lon, areaKm2, geometry)
    setPoints([])
  }

  useEffect(() => {
    setPoints([])
  }, [enabled, geometryMode, planet])

  useMapEvents({
    click(event) {
      if (!enabled) return
      const current = { lat: event.latlng.lat, lon: event.latlng.lng }
      if (geometryMode === 'point') {
        completeSelection(current.lat, current.lon, 25, {
          type: 'Point',
          coordinates: [current.lon, current.lat],
        })
        return
      }

      if (geometryMode === 'polygon') {
        setPoints((previous) => [...previous, current])
        onError('')
        return
      }

      if (points.length === 0) {
        setPoints([current])
        onError('')
        return
      }

      const first = points[0]
      if (!first) return
      try {
        if (geometryMode === 'circle') {
          const radius = (planet === 'earth' ? 6371 : planet === 'moon' ? 1737.4 : 3389.5) *
            Math.acos(Math.min(1, Math.max(-1,
              Math.sin(first.lat * Math.PI / 180) * Math.sin(current.lat * Math.PI / 180) +
              Math.cos(first.lat * Math.PI / 180) * Math.cos(current.lat * Math.PI / 180) *
              Math.cos((current.lon - first.lon) * Math.PI / 180),
            )))
          const circle = createCircleRegion(planet, first.lat, first.lon, radius)
          completeSelection(first.lat, first.lon, circle.areaKm2, circle.geometry)
          return
        }

        const secondLongitude = first.lon + (((current.lon - first.lon + 540) % 360) - 180)
        const west = Math.min(first.lon, secondLongitude)
        const east = Math.max(first.lon, secondLongitude)
        const south = Math.min(first.lat, current.lat)
        const north = Math.max(first.lat, current.lat)
        if (west === east || south === north) {
          throw new Error('Choose two different corners to create a rectangle.')
        }
        const rectangle = createPolygonRegion(planet, [
          [normalizeLongitude(west), south],
          [normalizeLongitude(east), south],
          [normalizeLongitude(east), north],
          [normalizeLongitude(west), north],
        ])
        completeSelection(
          (south + north) / 2,
          normalizeLongitude((west + east) / 2),
          rectangle.areaKm2,
          rectangle.geometry,
        )
      } catch (error) {
        onError(error instanceof Error ? error.message : String(error))
        setPoints([])
      }
    },
    contextmenu(event) {
      if (!enabled || geometryMode !== 'polygon') return
      event.originalEvent.preventDefault()
      if (points.length < 3) {
        onError('A polygon needs at least three map clicks.')
        return
      }
      try {
        const vertices: Array<[number, number]> = points.map(({ lon, lat }) => [lon, lat])
        const polygon = createPolygonRegion(planet, vertices)
        const firstLongitude = points[0]?.lon ?? 0
        const unwrappedLongitudes = points.map(({ lon }) =>
          firstLongitude + (((lon - firstLongitude + 540) % 360) - 180),
        )
        const centerLongitude = normalizeLongitude(
          unwrappedLongitudes.reduce((sum, longitude) => sum + longitude, 0) / points.length,
        )
        const centerLatitude = points.reduce((sum, point) => sum + point.lat, 0) / points.length
        completeSelection(centerLatitude, centerLongitude, polygon.areaKm2, polygon.geometry)
      } catch (error) {
        onError(error instanceof Error ? error.message : String(error))
        setPoints([])
      }
    },
  })

  const previewPositions = points.map(({ lat, lon }) => [lat, lon] as [number, number])
  return (
    <>
      {points.length === 1 && <CircleMarker center={previewPositions[0]} radius={6} pathOptions={{ color: '#fff', fillColor: '#f97316', fillOpacity: 1 }} />}
      {geometryMode === 'polygon' && points.length > 1 && (
        <Polygon positions={previewPositions} pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.15, dashArray: '4 4' }} />
      )}
    </>
  )
}

export function MapView2D({
  planet,
  regions,
  earthSites,
  layers,
  selectedRegion,
  geometryMode,
  onRegionSelect,
  onMapPick,
  onSelectionError,
}: MapView2DProps) {
  const {
    rankedSites,
    selectedSiteId,
    mapPicking,
    setSelectedSiteId,
  } = useAppStore()
  const earthSite = earthSites.find((site) => site.id === selectedSiteId)
  const targetLayers = layers.filter((layer) => layer.body === planet)
  const baseLayer = targetLayers.find((layer) => layer.isBase && layer.visible)
  const overlayLayers = targetLayers.filter((layer) => !layer.isBase && layer.visible)
  const earthLayers = layers.filter((layer) => layer.body === 'earth' && layer.visible)
  const earthLayer = earthLayers.find((layer) => layer.isBase)
  const earthOverlays = earthLayers.filter((layer) => !layer.isBase)
  const earthCenter: [number, number] = earthSite ? [earthSite.lat, earthSite.lon] : [20, 0]
  const earthZoom = earthSite ? 5 : 2
  const knownSelectedRegion = regions.some((region) => region.id === selectedRegion?.id)
  const mapRegions =
    selectedRegion && !knownSelectedRegion ? [...regions, selectedRegion] : regions

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#020408] text-white">
      <div className="absolute left-1/2 top-16 z-[1000] flex max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/95 p-1 shadow-xl backdrop-blur">
        <span className="max-w-[35%] truncate rounded px-2 py-1.5 text-xs font-semibold uppercase text-white">
          {planet} surface
        </span>
        <span className="h-4 w-px bg-slate-700" />
        <span className="max-w-[60%] truncate rounded px-2 py-1.5 text-xs font-semibold text-slate-300">
          {earthSite ? `Earth · ${earthSite.name}` : 'Earth analogue appears after selection'}
        </span>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col divide-y divide-slate-800 md:flex-row md:divide-x md:divide-y-0">
        <section
          className="relative min-h-[280px] min-w-0 flex-1 bg-[#020408]"
          aria-label={`NASA ${planet} surface map`}
        >
          <div className="absolute left-3 top-20 z-[500] rounded border border-slate-700 bg-slate-950/85 px-2.5 py-1 text-[11px] font-mono font-bold uppercase text-orange-300">
            NASA {planet} Trek · {baseLayer?.attribution ?? 'No base layer selected'}
          </div>
          {mapPicking && (
            <div className="absolute bottom-3 left-1/2 z-[500] -translate-x-1/2 rounded-full border border-orange-400/50 bg-slate-950/90 px-3 py-1.5 text-xs text-orange-200">
              {geometryMode === 'point'
                ? 'Click the map to select a point'
                : geometryMode === 'rectangle'
                  ? 'Click two opposite corners to select a rectangle'
                  : geometryMode === 'circle'
                    ? 'Click the center and edge of the circle'
                    : 'Click polygon vertices, then right-click to finish'}
            </div>
          )}
          <MapContainer
            crs={PLANETARY_CRS}
            center={selectedRegion ? [selectedRegion.lat, selectedRegion.lon] : [0, 0]}
            zoom={selectedRegion ? 3 : 0}
            minZoom={0}
            maxZoom={9}
            maxBounds={PLANETARY_BOUNDS}
            maxBoundsViscosity={0.8}
            worldCopyJump={false}
            scrollWheelZoom
            style={{ height: '100%', width: '100%', background: '#05080c' }}
          >
            <MapCamera
              center={selectedRegion ? [selectedRegion.lat, selectedRegion.lon] : [0, 0]}
              zoom={selectedRegion ? 3 : 0}
            />
            <MapPicker
              enabled={mapPicking}
              planet={planet}
              geometryMode={geometryMode}
              onPick={onMapPick}
              onError={onSelectionError}
            />
            {selectedRegion?.planet === planet && selectedRegion.geometry?.type === 'Polygon' && (
              <Polygon
                positions={selectedRegion.geometry.coordinates[0]?.map(
                  ([longitude, latitude]) => [latitude, longitude] as [number, number],
                ) ?? []}
                pathOptions={{ color: '#22d3ee', fillColor: '#22d3ee', fillOpacity: 0.18, weight: 2 }}
              />
            )}
            {baseLayer && (
              <TileLayer
                key={`${planet}-${baseLayer.id}`}
                url={baseLayer.url}
                attribution={baseLayer.attribution}
                opacity={baseLayer.opacity}
                minZoom={0}
                maxNativeZoom={baseLayer.maxNativeZoom ?? 8}
                maxZoom={9}
                bounds={PLANETARY_BOUNDS}
                noWrap
                zIndex={1}
              />
            )}
            {overlayLayers.map((layer) => (
              <TileLayer
                key={`${planet}-${layer.id}`}
                url={layer.url}
                attribution={layer.attribution}
                opacity={layer.opacity}
                minZoom={0}
                maxNativeZoom={layer.maxNativeZoom ?? 8}
                maxZoom={9}
                bounds={PLANETARY_BOUNDS}
                noWrap
                zIndex={2}
              />
            ))}
            {mapRegions.map((region) => (
              <CircleMarker
                key={region.id}
                center={[region.lat, region.lon]}
                radius={selectedRegion?.id === region.id ? 8 : 5}
                pathOptions={{
                  color: '#ffffff',
                  fillColor: selectedRegion?.id === region.id ? '#3b82f6' : '#f97316',
                  fillOpacity: 0.9,
                  weight: 2,
                }}
                eventHandlers={{ click: () => onRegionSelect(region) }}
              >
                <Popup>
                  <strong>{region.name}</strong>
                  <br />
                  {region.lat.toFixed(3)}°, {region.lon.toFixed(3)}°
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </section>

        {earthSite && earthLayer && (
          <section
            className="relative min-h-[280px] min-w-0 flex-1 bg-[#020408]"
            aria-label={`NASA Earth imagery for ${earthSite.name}`}
          >
            <div className="absolute left-3 top-16 z-[500] max-w-[85%] rounded border border-slate-700 bg-slate-950/85 px-2.5 py-1 text-[11px]">
              <span className="font-semibold text-blue-300">
                NASA Earth · {earthSite.name}, {earthSite.country}
              </span>
              <span className="ml-2 text-emerald-300">
                {Math.round(rankedSites.find((item) => item.site.id === earthSite.id)?.score ?? 0)}%
              </span>
            </div>
            <MapContainer
              key={`earth-${earthSite.id}`}
              center={earthCenter}
              zoom={earthZoom}
              minZoom={2}
              maxZoom={8}
              scrollWheelZoom
              style={{ height: '100%', width: '100%', background: '#05080c' }}
            >
              <TileLayer
                url={earthLayer.url}
                attribution={earthLayer.attribution}
                opacity={earthLayer.opacity}
                minZoom={0}
                maxNativeZoom={earthLayer.maxNativeZoom ?? 8}
                maxZoom={8}
              />
              {earthOverlays.map((layer) => (
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
                  radius={item.site.id === selectedSiteId ? 9 : 5}
                  pathOptions={{
                    color: '#ffffff',
                    fillColor: item.site.id === selectedSiteId ? '#3b82f6' : '#10b981',
                    fillOpacity: 0.9,
                    weight: 2,
                  }}
                  eventHandlers={{ click: () => setSelectedSiteId(item.site.id) }}
                >
                  <Popup>
                    <strong>{item.site.name}</strong> · {Math.round(item.score)}%
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </section>
        )}

        {earthSite && !earthLayer && (
          <section className="flex min-h-[280px] flex-1 items-center justify-center bg-slate-950 p-6 text-center text-sm text-amber-200">
            Enable the NASA Earth base layer to view this candidate.
          </section>
        )}

      </div>
      <div className="absolute bottom-1 right-2 z-[500] rounded bg-slate-950/75 px-1.5 py-0.5 text-[9px] text-slate-300">
        Imagery: NASA Moon Trek, Mars Trek &amp; Earth GIBS · Scroll to zoom
      </div>
    </div>
  )
}
