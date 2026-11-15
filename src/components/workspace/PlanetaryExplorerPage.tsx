import { useCallback, useMemo, useState, type FormEvent } from 'react'
import {
  Activity,
  ArrowRight,
  Check,
  Circle,
  Crosshair,
  FileDown,
  Globe2,
  Layers3,
  Map,
  MapPin,
  Mountain,
  MoveUpRight,
  RotateCcw,
  ScanLine,
  Square,
  Thermometer,
} from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { PowerClimatologyPanel } from '@/components/panels/PowerClimatologyPanel'
import { CesiumGlobe } from '@/components/map/CesiumGlobe'
import { Panel } from '@/components/ui/Panel'
import { useSitesData } from '@/hooks/useSitesData'
import { useI18n } from '@/hooks/useI18n'
import { useAppStore } from '@/store/useAppStore'
import { createRegionAtCoordinates } from '@/lib/regionSelection'
import { LAYER_CONFIGS } from '@/lib/layerConfig'
import type { GeometryMode, Planet, PlanetaryRegion, RegionGeometry, WeightSet } from '@/types'

const PLANETS: Planet[] = ['earth', 'moon', 'mars']
const GEOMETRIES: Array<{ id: GeometryMode; label: string }> = [
  { id: 'point', label: 'Point' },
  { id: 'circle', label: 'Circle' },
  { id: 'rectangle', label: 'Rectangle' },
  { id: 'polygon', label: 'Polygon' },
]

function asEarthRegion(site: NonNullable<ReturnType<typeof useSitesData>['data']>['earthSites'][number]): PlanetaryRegion {
  return {
    id: site.id,
    planet: 'earth',
    name: site.name,
    lat: site.lat,
    lon: site.lon,
    area_km2: site.area_km2,
    features: site.features,
    sources: site.sources,
    description: site.description,
    metricsEstimated: true,
  }
}

function ExplorerSidebar({
  body,
  regions,
  selectedRegion,
  weights,
  onBodyChange,
  onWeightChange,
  onRegionSelect,
  onContinue,
}: {
  body: Planet
  regions: PlanetaryRegion[]
  selectedRegion: PlanetaryRegion | null
  weights: WeightSet
  onBodyChange: (planet: Planet) => void
  onWeightChange: (key: keyof WeightSet, value: number) => void
  onRegionSelect: (region: PlanetaryRegion) => void
  onContinue: () => void
}) {
  const { analysisMode } = useAppStore()
  const groupWeights = [
    { label: 'Elevation', icon: MoveUpRight, keys: ['elevation_mean'] as const },
    { label: 'Slope', icon: Mountain, keys: ['slope_mean', 'slope_p90'] as const },
    { label: 'Terrain morphology', icon: Activity, keys: ['relief_std', 'roughness'] as const },
    { label: 'Environment', icon: Thermometer, keys: ['temp_mean', 'aridity'] as const },
  ]

  return (
    <div className="flex flex-col gap-2 pb-5 text-slate-200">
      <Panel title="Target body" icon={Globe2} defaultOpen>
        <div className="grid grid-cols-3 gap-1.5">
          {PLANETS.map((planet) => (
            <button
              key={planet}
              type="button"
              onClick={() => onBodyChange(planet)}
              aria-pressed={body === planet}
              className={`rounded-lg border px-2 py-2.5 text-[10px] font-bold uppercase transition-colors ${
                body === planet
                  ? planet === 'mars'
                    ? 'border-orange-400 bg-orange-600/20 text-orange-200 shadow-[0_0_16px_rgba(249,115,22,0.12)]'
                    : planet === 'moon'
                      ? 'border-slate-300 bg-slate-200/10 text-slate-100 shadow-[0_0_16px_rgba(203,213,225,0.12)]'
                      : 'border-blue-400 bg-blue-600/25 text-blue-200 shadow-[0_0_16px_rgba(59,130,246,0.18)]'
                  : 'border-slate-700 bg-slate-950/70 text-slate-400 hover:border-slate-500 hover:text-white'
              }`}
            >
              <span className="mb-1 block text-base leading-none" aria-hidden="true">
                {planet === 'earth' ? '🌍' : planet === 'moon' ? '🌕' : '🔴'}
              </span>
              {planet}
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Mission parameters" icon={Activity} defaultOpen>
        <p className="mb-3 text-[10px] leading-relaxed text-slate-500">
          Weight controls apply to DEMO ranking only; scientific ranking is unavailable until verified measurements are loaded.
        </p>
        <div className="space-y-3">
          {groupWeights.map(({ label, icon: Icon, keys }) => {
            const value = keys.reduce((sum, key) => sum + weights[key], 0)
            return (
              <label key={label} className="block">
                <span className="mb-1 flex items-center justify-between gap-2 text-[10px] text-slate-300">
                  <span className="flex items-center gap-1.5"><Icon size={12} className="text-blue-400" />{label}</span>
                  <span className="font-mono text-slate-400">{Math.round(value * 100)}%</span>
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(value * 100)}
                  disabled={analysisMode !== 'demo'}
                  aria-label={`${label} weight`}
                  onChange={(event) => {
                    const groupValue = Number(event.target.value) / 100
                    keys.forEach((key) => onWeightChange(key, groupValue / keys.length))
                  }}
                  className="w-full accent-blue-500 disabled:opacity-40"
                />
              </label>
            )
          })}
        </div>
      </Panel>

      <Panel title="Region catalog" icon={MapPin} defaultOpen>
        <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
          {regions.map((region) => (
            <button
              type="button"
              key={region.id}
              onClick={() => onRegionSelect(region)}
              className={`w-full rounded border p-2 text-left ${
                selectedRegion?.id === region.id
                  ? 'border-blue-500 bg-blue-600/15 text-white'
                  : 'border-slate-800 bg-slate-900/50 text-slate-300 hover:border-slate-600'
              }`}
            >
              <span className="block truncate text-xs font-semibold">{region.name}</span>
              <span className="mt-1 block font-mono text-[10px] text-slate-400">
                {region.lat.toFixed(2)}°, {region.lon.toFixed(2)}°
              </span>
            </button>
          ))}
          {regions.length === 0 && (
            <p className="py-2 text-[10px] text-slate-500">No catalog regions available.</p>
          )}
        </div>
      </Panel>

      <button
        type="button"
        disabled={!selectedRegion}
        onClick={onContinue}
        className="flex items-center justify-center gap-2 rounded-lg border border-blue-400/40 bg-blue-600 px-3 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        Analyze selected region <ArrowRight size={14} />
      </button>
      {body === 'earth' && (
        <p className="px-1 text-[10px] leading-relaxed text-slate-500">
          Earth selections can be inspected here; analogue discovery targets the Moon or Mars.
        </p>
      )}
    </div>
  )
}

function RegionDetails({
  region,
  analysisMode,
}: {
  region: PlanetaryRegion | null
  analysisMode: 'scientific' | 'demo'
}) {
  if (!region) {
    return (
      <Panel title="Selected region" icon={ScanLine} defaultOpen>
        <p className="py-4 text-center text-xs text-slate-500">
          Select a catalog region or choose a point on the globe.
        </p>
      </Panel>
    )
  }

  const features: Array<[string, number | null, string]> = [
    ['Mean elevation', region.features.elevation_mean, 'm'],
    ['Relief (std. dev.)', region.features.relief_std, 'm'],
    ['Mean slope', region.features.slope_mean, '°'],
    ['Slope P90', region.features.slope_p90, '°'],
    ['Roughness', region.features.roughness, 'index'],
    ['Mean temperature', region.features.temp_mean, '°C'],
    ['Aridity index', region.features.aridity, 'index'],
  ]

  return (
    <div className="space-y-3">
      <Panel title="Selected region" icon={ScanLine} defaultOpen>
        <h2 className="text-sm font-bold text-white">{region.name}</h2>
        <p className="mt-1 font-mono text-[11px] text-slate-400">
          {region.planet.toUpperCase()} · {region.lat.toFixed(4)}°, {region.lon.toFixed(4)}°
        </p>
        {analysisMode === 'demo' ? (
          <div className="mt-3 space-y-1.5">
            {features.map(([label, value, unit]) => (
              <div key={label} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="text-slate-400">{label}</span>
                <span className="font-mono text-slate-200">{value?.toFixed(1) ?? '—'} {unit}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded border border-slate-700 bg-slate-900 p-2 text-[10px] leading-relaxed text-slate-300">
            Data unavailable — no verified NASA measurement found for this region.
          </p>
        )}
        {analysisMode === 'demo' && region.metricsEstimated && (
          <p className="mt-3 rounded border border-amber-500/30 bg-amber-950/25 p-2 text-[10px] leading-relaxed text-amber-200">
            DEMO values estimated from a nearby example region. They are not NASA measurements sampled from these coordinates.
          </p>
        )}
      </Panel>
      <Panel title="Data provenance" icon={Layers3} defaultOpen={false}>
        {analysisMode === 'demo' ? (
          <p className="text-[10px] leading-relaxed text-amber-200">
            DEMO source: bundled example catalogue; no verified measurement provenance is attached.
            NASA Trek and GIBS layers are visualizations only.
          </p>
        ) : (
          <p className="text-[10px] leading-relaxed text-slate-300">
            Data unavailable — no verified NASA measurement found. NASA imagery layers are not used
            as numerical terrain data.
          </p>
        )}
      </Panel>
      {region.planet === 'earth' && <PowerClimatologyPanel region={region} />}
    </div>
  )
}

export function PlanetaryExplorerPage() {
  const { t } = useI18n()
  const { data, loading, error } = useSitesData()
  const {
    analysisMode,
    planet,
    geometryMode,
    mapPicking,
    weights,
    selectedRegion,
    setPlanet,
    setGeometryMode,
    setWeight,
    setSelectedRegion,
    setMapPicking,
  } = useAppStore()
  const [body, setBody] = useState<Planet>(planet)
  const [earthSelection, setEarthSelection] = useState<PlanetaryRegion | null>(null)
  const [cursor, setCursor] = useState<{ lat: number; lon: number } | null>(null)
  const [cameraResetKey, setCameraResetKey] = useState(0)
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [coordinateError, setCoordinateError] = useState('')
  const [selectedShape, setSelectedShape] = useState<GeometryMode | null>(null)
  const [analysisRequested, setAnalysisRequested] = useState(false)

  const regions = useMemo(() => {
    if (!data) return []
    if (body === 'earth') return data.earthSites.map(asEarthRegion)
    return body === 'moon' ? data.moonRegions : data.marsRegions
  }, [body, data])
  const activeRegion = body === 'earth' ? earthSelection : selectedRegion

  const availableLayers = LAYER_CONFIGS.filter((layer) => layer.body === body)
  const [layerId, setLayerId] = useState('earth_blue_marble')
  const layer = availableLayers.find((item) => item.id === layerId) ?? availableLayers[0]

  const handleBodyChange = (nextBody: Planet) => {
    setBody(nextBody)
    setPlanet(nextBody)
    setSelectedRegion(null)
    setEarthSelection(null)
    setSelectedShape(null)
    setAnalysisRequested(false)
    setMapPicking(false)
    setLayerId(
      LAYER_CONFIGS.find((item) => item.body === nextBody && item.isBase)?.id ?? '',
    )
  }

  const handleRegionPick = useCallback(
    (lat: number, lon: number, areaKm2: number, geometry: RegionGeometry) => {
      const region = createRegionAtCoordinates(body, lat, lon, regions, areaKm2, geometry)
      if (body === 'earth') setEarthSelection(region)
      else setSelectedRegion(region)
      setSelectedShape(geometryMode)
      setAnalysisRequested(false)
      setMapPicking(false)
    },
    [body, geometryMode, regions, setMapPicking, setSelectedRegion],
  )
  const handleCursorMove = useCallback(
    (coordinates: { lat: number; lon: number } | null) => setCursor(coordinates),
    [],
  )
  const submitCoordinates = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const region = createRegionAtCoordinates(
        body,
        Number(latitude),
        Number(longitude),
        regions,
        0,
      )
      if (body === 'earth') setEarthSelection(region)
      else setSelectedRegion(region)
      setSelectedShape('point')
      setAnalysisRequested(false)
      setCoordinateError('')
      setMapPicking(false)
    } catch (caught) {
      setCoordinateError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  const leftPanel = data ? (
    <ExplorerSidebar
      body={body}
      regions={regions}
      selectedRegion={activeRegion}
      weights={weights}
      onBodyChange={handleBodyChange}
      onWeightChange={setWeight}
      onRegionSelect={(region) => {
        setSelectedShape(null)
        setAnalysisRequested(false)
        if (region.planet === 'earth') setEarthSelection(region)
        else {
          setSelectedRegion(region)
          setPlanet(region.planet)
        }
      }}
      onContinue={() => setAnalysisRequested(true)}
    />
  ) : (
    <div role={error ? 'alert' : 'status'} className={`p-3 text-xs ${error ? 'text-rose-300' : 'text-slate-400'}`}>
      {error ? `Could not load the demo catalogue: ${error}` : 'Loading region catalog…'}
    </div>
  )

  const centerPanel = (
    <section className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-blue-500/25 bg-[linear-gradient(145deg,rgba(7,20,40,0.96),rgba(2,4,8,0.98))] shadow-[0_0_30px_rgba(26,108,246,0.08)]">
      <header className="border-b border-blue-500/20 px-4 pb-3 pt-4">
        <div className="mb-3 flex items-center gap-3">
          <Globe2 size={26} className="text-blue-400" />
          <div>
            <h1 className="text-lg font-bold leading-tight text-white">Select Your Region</h1>
            <p className="text-[11px] text-slate-400">Choose a planetary body and define the area to explore.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PLANETS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => handleBodyChange(item)}
              aria-pressed={body === item}
              className={`flex items-center justify-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold capitalize transition ${
                body === item
                  ? item === 'mars'
                    ? 'border-orange-400 bg-orange-600/25 text-orange-100 shadow-[0_0_18px_rgba(249,115,22,0.18)]'
                    : item === 'moon'
                      ? 'border-slate-300 bg-slate-200/10 text-slate-100 shadow-[0_0_18px_rgba(203,213,225,0.16)]'
                      : 'border-blue-400 bg-blue-600 text-white shadow-[0_0_18px_rgba(26,108,246,0.22)]'
                  : 'border-slate-700 bg-slate-950/60 text-slate-400 hover:border-slate-500 hover:text-white'
              }`}
            >
              <span aria-hidden="true">{item === 'earth' ? '🌍' : item === 'moon' ? '🌕' : '🔴'}</span>
              {item}
            </button>
          ))}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[minmax(0,1.08fr)_minmax(220px,0.92fr)]">
        <div className="flex min-h-[420px] min-w-0 flex-col overflow-hidden rounded-xl border border-slate-700/80 bg-[#020408]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/90 px-3 py-2">
            <h2 className="text-xs font-semibold text-slate-100">{body.toUpperCase()} Interactive Map</h2>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-[10px] text-slate-400">
                <Layers3 size={13} />
                <select
                  aria-label="Map imagery layer"
                  value={layer?.id ?? ''}
                  onChange={(event) => setLayerId(event.target.value)}
                  className="max-w-40 rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-[10px] text-slate-200"
                >
                  {availableLayers.map((item) => (
                    <option key={item.id} value={item.id}>{t(item.nameKey)}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                aria-label="Reset camera"
                onClick={() => {
                  setSelectedRegion(null)
                  setEarthSelection(null)
                  setSelectedShape(null)
                  setAnalysisRequested(false)
                  setCameraResetKey((key) => key + 1)
                }}
                className="rounded border border-slate-700 bg-slate-900 p-1.5 text-slate-300 hover:text-white"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </div>
          <div className="relative min-h-0 flex-1">
            {!loading && layer && (
              <CesiumGlobe
                planet={body}
                layer={layer}
                selectedRegion={activeRegion}
                geometryMode={geometryMode}
                onRegionPick={handleRegionPick}
                onCursorMove={handleCursorMove}
                cameraResetKey={cameraResetKey}
              />
            )}
            {loading && (
              <div className="absolute inset-0 grid place-items-center text-sm text-slate-400">
                Loading NASA imagery catalog…
              </div>
            )}
            {layer?.legendUrl && (
              <a
                href={layer.legendUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Open NASA GIBS MERRA-2 temperature legend"
                className="absolute bottom-3 right-3 z-10 rounded border border-slate-700 bg-slate-950/90 p-2 text-[9px] text-slate-300 shadow-lg"
              >
                <span className="mb-1 block">NASA GIBS · MERRA-2 legend</span>
                <img
                  src={layer.legendUrl}
                  alt="MERRA-2 monthly 2 m air temperature color legend"
                  className="h-auto w-40"
                />
              </a>
            )}
            <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded border border-slate-700 bg-slate-950/85 px-2 py-1 font-mono text-[10px] text-slate-300">
              {cursor ? `${cursor.lat.toFixed(4)}°, ${cursor.lon.toFixed(4)}°` : 'Move cursor for coordinates'}
            </div>
          </div>
          <div className="border-t border-slate-800 bg-slate-950/90 px-3 py-2 text-[10px] text-slate-300">
            <MapPin size={12} className="mr-1 inline text-blue-400" />
            {activeRegion ? `${activeRegion.name} · ${activeRegion.lat.toFixed(3)}°, ${activeRegion.lon.toFixed(3)}°` : 'Select a region on the globe'}
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
          <div>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-100">1. Choose selection method</h2>
            <button
              type="button"
              onClick={() => setMapPicking(!mapPicking)}
              aria-pressed={mapPicking}
              className={`mb-2 flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                mapPicking
                  ? 'border-blue-400 bg-blue-600/20 shadow-[0_0_16px_rgba(26,108,246,0.15)]'
                  : 'border-slate-700 bg-slate-950/70 hover:border-blue-500/60'
              }`}
            >
              <Map size={19} className="mt-0.5 shrink-0 text-blue-300" />
              <span>
                <span className="block text-xs font-semibold text-white">{mapPicking ? 'Cancel map selection' : 'Select on map'}</span>
                <span className="mt-1 block text-[10px] leading-relaxed text-slate-400">Choose a shape below, then click or draw it on the globe.</span>
              </span>
            </button>
            <div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
              <div className="mb-2 flex items-center gap-3">
                <Crosshair size={19} className="shrink-0 text-slate-300" />
                <div>
                  <p className="text-xs font-semibold text-white">Enter coordinates</p>
                  <p className="text-[10px] text-slate-400">Set a center point on {body}.</p>
                </div>
              </div>
              <form onSubmit={submitCoordinates} className="grid grid-cols-2 gap-2">
                <label className="text-[10px] text-slate-400">
                  Latitude (°)
                  <input aria-label="Latitude" type="number" min="-90" max="90" step="any" required value={latitude}
                    onChange={(event) => setLatitude(event.target.value)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white" />
                </label>
                <label className="text-[10px] text-slate-400">
                  Longitude (°)
                  <input aria-label="Longitude" type="number" min="-180" max="180" step="any" required value={longitude}
                    onChange={(event) => setLongitude(event.target.value)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white" />
                </label>
                <button type="submit" className="col-span-2 rounded-lg border border-blue-500/50 bg-blue-600/20 py-2 text-[11px] font-semibold text-blue-200 hover:bg-blue-600/35">
                  Use coordinates
                </button>
                {coordinateError && <p role="alert" className="col-span-2 text-[10px] text-rose-300">{coordinateError}</p>}
              </form>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-100">2. Selection shape</h2>
            <div className="grid grid-cols-2 gap-1.5">
              {GEOMETRIES.map(({ id, label }) => {
                const ShapeIcon = id === 'point' ? Crosshair : id === 'circle' ? Circle : id === 'rectangle' ? Square : Map
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={geometryMode === id}
                    onClick={() => {
                      setGeometryMode(id)
                      setMapPicking(true)
                      setAnalysisRequested(false)
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-2 py-2 text-[11px] transition ${
                      geometryMode === id
                        ? 'border-blue-400 bg-blue-600 text-white shadow-[0_0_14px_rgba(26,108,246,0.16)]'
                        : 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <ShapeIcon size={14} />{label}
                  </button>
                )
              })}
            </div>
            <p className="mt-2 rounded-lg border border-blue-500/20 bg-blue-950/20 p-2.5 text-[10px] leading-relaxed text-slate-400">
              <Crosshair size={13} className="mr-1 inline text-blue-400" />
              {geometryMode === 'polygon'
                ? 'Click vertices on the globe, then right-click to finish the polygon.'
                : geometryMode === 'circle'
                  ? 'Click the center and edge of the circle on the globe.'
                  : geometryMode === 'rectangle'
                    ? 'Click two opposite corners to define a rectangle.'
                    : 'Click the globe to place a point.'}
            </p>
          </div>

          <div className="rounded-lg border border-amber-500/25 bg-amber-950/20 p-2.5 text-[9px] leading-relaxed text-amber-100/80">
            NASA surface layers are imagery only. No numerical elevation model is loaded for this view.
          </div>
        </div>
      </div>
    </section>
  )

  const rightPanel = (
    <div className="space-y-2 pb-5">
      <Panel title="Analysis results" icon={Activity} defaultOpen>
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/70 p-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-4 border-slate-600 text-[9px] font-bold text-slate-300">
            N/A
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-100">Similarity score</p>
            <p className="mt-1 text-[11px] font-bold text-slate-300">Data unavailable</p>
          </div>
        </div>
        {analysisRequested && activeRegion ? (
          <div className="mb-3 rounded-lg border border-blue-500/30 bg-blue-950/25 p-2.5">
            <p className="text-[11px] font-semibold text-white">{activeRegion.name}</p>
            <p className="mt-1 font-mono text-[10px] text-slate-300">
              {activeRegion.planet.toUpperCase()} · {activeRegion.lat.toFixed(4)}°, {activeRegion.lon.toFixed(4)}°
            </p>
            {selectedShape && selectedShape !== 'point' && (
              <p className="mt-1 text-[10px] text-slate-300">
                Approx. selected area: {activeRegion.area_km2.toLocaleString(undefined, { maximumFractionDigits: 2 })} km²
              </p>
            )}
            <p role="status" className="mt-2 border-t border-blue-500/20 pt-2 text-[10px] leading-relaxed text-slate-300">
              {analysisMode === 'demo'
                ? 'DEMO result: example terrain attributes are shown below and are not measurements sampled from this selection.'
                : 'Selection confirmed. Verified numerical terrain measurements are unavailable; no scientific score is calculated.'}
            </p>
          </div>
        ) : (
          <p role="status" className="mb-3 rounded-lg border border-slate-700 bg-slate-900/80 p-2.5 text-[10px] leading-relaxed text-slate-300">
            Select Earth, Moon, or Mars, choose a shape, then analyze the selected region to see results here.
          </p>
        )}
        <div className="space-y-2 border-t border-slate-800 pt-3">
          {[
            ['Temperature', Thermometer],
            ['Elevation', MoveUpRight],
            ['Slope', Mountain],
            ['Terrain type', Layers3],
          ].map(([label, Icon]) => {
            const RowIcon = Icon as typeof Thermometer
            return (
              <div key={label as string} className="flex items-center justify-between gap-2 text-[10px]">
                <span className="flex items-center gap-2 text-slate-400"><RowIcon size={13} />{label as string}</span>
                <span className="font-mono text-slate-300">Unavailable</span>
              </div>
            )
          })}
        </div>
      </Panel>
      <RegionDetails
        region={analysisRequested && activeRegion?.planet === body ? activeRegion : null}
        analysisMode={analysisMode}
      />
      <Panel title="Terrain comparison" icon={Mountain} defaultOpen={false}>
        <p className="text-[10px] leading-relaxed text-slate-400">
          Comparison unavailable — comparable verified terrain measurements are not loaded for {body}.
        </p>
      </Panel>
      <Panel title="Terrain coverage" icon={Map} defaultOpen={false}>
        <p className="text-[10px] leading-relaxed text-slate-400">
          Coverage cannot be measured until numerical NASA terrain data is processed.
        </p>
      </Panel>
      <Panel title="Confidence & validation" icon={Check} defaultOpen={false}>
        <p className="text-[10px] leading-relaxed text-slate-400">
          No confidence or validation metrics are reported without verified measurements and documented ground truth.
        </p>
      </Panel>
      <Panel title="Scientific context" icon={Globe2} defaultOpen={false}>
        <ul className="space-y-1.5 text-[10px] leading-relaxed text-slate-400">
          <li>Earth gravity: 9.81 m/s²; Moon: 1.62 m/s²; Mars: 3.71 m/s².</li>
          <li>A textured ellipsoid is not elevation-driven terrain.</li>
          <li>Catalog feature values are illustrative until numerical source rasters are processed.</li>
        </ul>
      </Panel>
      <button type="button" disabled className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-xs font-semibold text-slate-500" title="Scientific report unavailable without verified measurements">
        <FileDown size={14} /> Export scientific report
      </button>
    </div>
  )

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#020408]">
      <TopNav />
      {data?.catalogStatus === 'illustrative-fallback' && (
        <div
          role="status"
          className={`border-b px-4 py-2 text-center text-[11px] ${
            analysisMode === 'demo'
              ? 'border-amber-500/30 bg-amber-950/50 text-amber-100'
              : 'border-slate-700 bg-slate-900 text-slate-300'
          }`}
        >
          {analysisMode === 'demo'
            ? 'DEMO MODE — example data only; no NASA measurements are used for scoring.'
            : 'Scientific measurements unavailable — NASA DEM products have not been processed.'}
        </div>
      )}
      <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 xl:grid-cols-[260px_minmax(0,1fr)_290px] xl:overflow-hidden">
        <aside className="min-h-0 overflow-y-auto rounded-xl border border-blue-500/20 bg-[rgba(7,20,40,0.85)] p-2.5 backdrop-blur-xl">
          {leftPanel}
        </aside>
        <div className="min-h-0 min-w-0">{centerPanel}</div>
        <aside className="min-h-0 overflow-y-auto rounded-xl border border-blue-500/20 bg-[rgba(7,20,40,0.85)] p-2.5 backdrop-blur-xl">
          {rightPanel}
        </aside>
      </main>
    </div>
  )
}
