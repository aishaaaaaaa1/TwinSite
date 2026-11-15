import { useState, type FormEvent } from 'react'
import { Globe2, Layers, Sliders, MapPin, Check, RotateCcw, Database } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useI18n } from '@/hooks/useI18n'
import { Panel } from '@/components/ui/Panel'
import { WeightSlider } from '@/components/ui/WeightSlider'
import {
  createCircleRegion,
  createPolygonRegion,
  createRectangleRegion,
  createRegionAtCoordinates,
} from '@/lib/regionSelection'
import type { Planet, MissionType, GeometryMode, WeightSet, SitesData, PlanetaryRegion, RegionGeometry } from '@/types'

interface LeftPanelProps {
  onConfirm: () => void
  onCsvExperiment: () => void
  analyzing: boolean
  csvAnalyzing: boolean
  data: SitesData | null
}

const WEIGHT_KEYS: Array<{ key: keyof WeightSet; labelKey: string }> = [
  { key: 'elevation_mean', labelKey: 'features.elevation_mean' },
  { key: 'relief_std', labelKey: 'features.relief_std' },
  { key: 'slope_mean', labelKey: 'features.slope_mean' },
  { key: 'slope_p90', labelKey: 'features.slope_p90' },
  { key: 'roughness', labelKey: 'features.roughness' },
  { key: 'temp_mean', labelKey: 'features.temp_mean' },
  { key: 'aridity', labelKey: 'features.aridity' },
]

const GEOMETRY_MODES: Array<{ mode: GeometryMode; labelKey: string }> = [
  { mode: 'point', labelKey: 'left.point' },
  { mode: 'circle', labelKey: 'left.circle' },
  { mode: 'rectangle', labelKey: 'left.rectangle' },
  { mode: 'polygon', labelKey: 'left.polygon' },
]

export function LeftPanel({ onConfirm, onCsvExperiment, analyzing, csvAnalyzing, data }: LeftPanelProps) {
  const { t, lang } = useI18n()
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [circleRadiusKm, setCircleRadiusKm] = useState('10')
  const [southLatitude, setSouthLatitude] = useState('')
  const [westLongitude, setWestLongitude] = useState('')
  const [northLatitude, setNorthLatitude] = useState('')
  const [eastLongitude, setEastLongitude] = useState('')
  const [polygonCoordinates, setPolygonCoordinates] = useState('')
  const [coordinateError, setCoordinateError] = useState('')
  const {
    planet,
    analysisMode,
    missionType,
    geometryMode,
    weights,
    lambda,
    nSites,
    selectedRegion,
    mapPicking,
    setPlanet,
    setViewMode,
    setMapPicking,
    setGeometryMode,
    setWeight,
    applyPreset,
    setLambda,
    setNSites,
    setSelectedRegion,
    setRankedSites,
    setSelectedSiteId,
    resetWeights,
  } = useAppStore()

  const regions: PlanetaryRegion[] =
    planet === 'moon' ? data?.moonRegions ?? [] : data?.marsRegions ?? []
  const rectangleCoordinateFields = [
    { label: 'South latitude (°)', labelFr: 'Latitude sud (°)', value: southLatitude, onChange: setSouthLatitude, min: -90, max: 90 },
    { label: 'West longitude (°)', labelFr: 'Longitude ouest (°)', value: westLongitude, onChange: setWestLongitude, min: -180, max: 180 },
    { label: 'North latitude (°)', labelFr: 'Latitude nord (°)', value: northLatitude, onChange: setNorthLatitude, min: -90, max: 90 },
    { label: 'East longitude (°)', labelFr: 'Longitude est (°)', value: eastLongitude, onChange: setEastLongitude, min: -180, max: 180 },
  ]

  const handlePlanetChange = (newPlanet: Planet) => {
    if (newPlanet === planet) return
    setPlanet(newPlanet)
    setSelectedRegion(null)
    setRankedSites([])
    setSelectedSiteId(null)
    setMapPicking(false)
  }

  const handleGeometryChange = (mode: GeometryMode) => {
    setGeometryMode(mode)
    setViewMode('globe')
    setMapPicking(true)
  }

  const handleCoordinateSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      let lat = Number(latitude)
      let lon = Number(longitude)
      let areaKm2 = 25
      let geometry: RegionGeometry = { type: 'Point', coordinates: [lon, lat] }

      if (geometryMode === 'circle') {
        const circle = createCircleRegion(planet, lat, lon, Number(circleRadiusKm))
        geometry = circle.geometry
        areaKm2 = circle.areaKm2
      } else if (geometryMode === 'rectangle') {
        const south = Number(southLatitude)
        const west = Number(westLongitude)
        const north = Number(northLatitude)
        const east = Number(eastLongitude)
        const rectangle = createRectangleRegion(planet, south, west, north, east)
        geometry = rectangle.geometry
        areaKm2 = rectangle.areaKm2
        lat = (south + north) / 2
        lon = (west + east) / 2
      } else if (geometryMode === 'polygon') {
        const vertices: Array<[number, number]> = polygonCoordinates
          .split(/[;\n]+/)
          .map((pair) => pair.trim())
          .filter(Boolean)
          .map((pair) => {
            const values = pair.split(',').map((value) => value.trim())
            if (values.length !== 2 || values.some((value) => value === '')) {
              throw new Error('Enter each polygon vertex as latitude, longitude.')
            }
            return [Number(values[1]), Number(values[0])]
          })
        const polygon = createPolygonRegion(planet, vertices)
        geometry = polygon.geometry
        areaKm2 = polygon.areaKm2
        lat = vertices.reduce((sum, [, vertexLatitude]) => sum + vertexLatitude, 0) / vertices.length
        const firstLongitude = vertices[0][0]
        const longitudes = vertices.map(([vertexLongitude]) =>
          firstLongitude + (((vertexLongitude - firstLongitude + 540) % 360) - 180),
        )
        lon = ((longitudes.reduce((sum, vertexLongitude) => sum + vertexLongitude, 0) /
          longitudes.length + 540) % 360) - 180
      }

      const region = createRegionAtCoordinates(
        planet,
        lat,
        lon,
        regions,
        areaKm2,
        geometry,
      )
      setSelectedRegion(region)
      setCoordinateError('')
      setMapPicking(false)
    } catch (error) {
      setCoordinateError(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <div className="flex flex-col gap-3 pb-6 text-slate-200">
      {/* SECTION A: Planet Selector */}
      <Panel title={t('left.targetPlanet')} icon={Globe2} defaultOpen={true}>
        <div className="flex items-center gap-2 mt-1">
          {(['moon', 'mars'] as Planet[]).map((p) => {
            const active = planet === p
            return (
              <button
                key={p}
                onClick={() => handlePlanetChange(p)}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                  active
                    ? p === 'mars'
                      ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                      : 'bg-slate-300 text-slate-900 shadow-md shadow-slate-400/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {t(`planet.${p}`)}
              </button>
            )
          })}
        </div>
      </Panel>

      {/* SECTION B: Region List */}
      <Panel title={t('left.regionSelection')} icon={MapPin} defaultOpen={true}>
        <button
          type="button"
          onClick={() => {
            setViewMode('globe')
            setMapPicking(!mapPicking)
          }}
          className={`mb-2 w-full rounded-md border px-2.5 py-2 text-xs font-semibold transition-colors ${
            mapPicking
              ? 'border-orange-400 bg-orange-500/15 text-orange-200'
              : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-blue-500'
          }`}
        >
          {mapPicking
            ? lang === 'fr'
              ? 'Cliquez sur la carte pour choisir...'
              : 'Click the map to select a region...'
            : lang === 'fr'
              ? 'Choisir une zone sur la carte'
              : 'Select a region on the map'}
        </button>
        <form onSubmit={handleCoordinateSubmit} className="mb-3 grid grid-cols-2 gap-1.5">
          {geometryMode === 'polygon' ? (
            <label className="col-span-2 text-[10px] text-slate-400">
              {lang === 'fr' ? 'Sommets (latitude, longitude)' : 'Vertices (latitude, longitude)'}
              <textarea
                aria-label="Polygon vertices"
                required
                value={polygonCoordinates}
                onChange={(event) => setPolygonCoordinates(event.target.value)}
                placeholder={'-5.4, 137.8; -5.2, 138.1; -5.6, 138.2'}
                rows={3}
                className="mt-1 w-full resize-y rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white"
              />
            </label>
          ) : geometryMode === 'rectangle' ? (
            rectangleCoordinateFields.map(({ label, labelFr, value, onChange, min, max }) => (
              <label key={label} className="text-[10px] text-slate-400">
                {lang === 'fr' ? labelFr : label}
                <input
                  aria-label={label}
                  type="number"
                  min={min}
                  max={max}
                  step="any"
                  required
                  value={value}
                  onChange={(event) => onChange(event.target.value)}
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white"
                />
              </label>
            ))
          ) : (
            <>
              <label className="text-[10px] text-slate-400">
                Latitude (°)
                <input
                  aria-label="Latitude"
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                  required
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                  placeholder="-90 à 90"
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white"
                />
              </label>
              <label className="text-[10px] text-slate-400">
                Longitude (°)
                <input
                  aria-label="Longitude"
                  type="number"
                  min="-180"
                  max="180"
                  step="any"
                  required
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                  placeholder="-180 à 180"
                  className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white"
                />
              </label>
              {geometryMode === 'circle' && (
                <label className="col-span-2 text-[10px] text-slate-400">
                  {lang === 'fr' ? 'Rayon (km)' : 'Radius (km)'}
                  <input
                    aria-label="Circle radius in kilometers"
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    value={circleRadiusKm}
                    onChange={(event) => setCircleRadiusKm(event.target.value)}
                    className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white"
                  />
                </label>
              )}
            </>
          )}
          <button
            type="submit"
            className="col-span-2 rounded-md border border-blue-500/50 bg-blue-600/20 py-1.5 text-xs font-semibold text-blue-200 hover:bg-blue-600/35"
          >
            {lang === 'fr' ? 'Utiliser ces coordonnées' : 'Use these coordinates'}
          </button>
          {coordinateError && (
            <p role="alert" className="col-span-2 text-[10px] text-rose-300">
              {coordinateError}
            </p>
          )}
        </form>
        <div className="mt-1 flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
          {regions.length === 0 ? (
            <div className="text-xs text-slate-500 py-2 text-center">
              No regions available
            </div>
          ) : (
            regions.map((r) => {
              const isSelected = selectedRegion?.id === r.id
              const displayName = lang === 'fr' && r.nameFr ? r.nameFr : r.name
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRegion(r)}
                  className={`w-full text-left p-2 rounded-md transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500/60 text-white shadow-sm'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold truncate">{displayName}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {r.lat.toFixed(1)}°, {r.lon.toFixed(1)}°
                    </span>
                  </div>
                  {analysisMode === 'demo' && (
                    <div className="mt-1 flex items-center justify-between text-[10px] text-amber-300">
                      <span>{lang === 'fr' ? 'DEMO' : 'DEMO'} · {r.features.terrainClass}</span>
                      <span>{r.area_km2.toLocaleString()} km²</span>
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>
        {selectedRegion?.metricsEstimated && analysisMode === 'demo' && (
          <p className="mt-2 text-[10px] leading-relaxed text-amber-300/90">
            {lang === 'fr'
              ? 'Métriques estimées depuis le terrain de référence le plus proche. La sélection ponctuelle utilise une surface par défaut de 25 km².'
              : 'Metrics estimated from the nearest catalog reference. Point selections use a default 25 km² footprint.'}
          </p>
        )}
      </Panel>

      {/* SECTION C: Geometry Mode */}
      <Panel title={t('left.geometry')} icon={Layers} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-1.5 mt-1">
          {GEOMETRY_MODES.map(({ mode, labelKey }) => {
            const active = geometryMode === mode
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={active}
                onClick={() => handleGeometryChange(mode)}
                className={`py-1.5 px-2 rounded text-xs font-medium transition-all cursor-pointer border ${
                  active
                    ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {t(labelKey)}
              </button>
            )
          })}
        </div>
      </Panel>

      {/* SECTION D: Mission Parameters & Weights */}
      <Panel title={t('left.missionParams')} icon={Sliders} defaultOpen={true}>
        {/* Preset Mission Types */}
        <div className="mb-3">
          <label className="text-[10px] font-mono uppercase text-slate-400 block mb-1.5">
            {t('left.missionType')}
          </label>
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-md border border-slate-800">
            {(['rover', 'base', 'exploration'] as MissionType[]).map((m) => {
              const active = missionType === m
              return (
                <button
                  key={m}
                  onClick={() => applyPreset(m)}
                  className={`flex-1 py-1 rounded text-[11px] font-semibold capitalize transition-all cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t(`left.${m}`)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Feature Weights */}
        <div className="flex flex-col gap-1 mt-2">
          {WEIGHT_KEYS.map(({ key, labelKey }) => (
            <WeightSlider
              key={key}
              label={t(labelKey)}
              value={weights[key]}
              onChange={(val) => setWeight(key, val)}
              min={0}
              max={1}
              step={0.01}
            />
          ))}
        </div>

        {/* Diversity Lambda Slider */}
        <div className="mt-3 pt-3 border-t border-slate-800/80">
          <WeightSlider
            label={t('left.lambda')}
            value={lambda}
            onChange={(val) => setLambda(val)}
            min={0}
            max={1}
            step={0.05}
          />
        </div>

        {/* N Sites Selector */}
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-slate-400">{t('left.nSites')}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNSites(Math.max(1, nSites - 1))}
              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white font-bold cursor-pointer"
            >
              -
            </button>
            <span className="text-xs font-mono font-bold text-white w-4 text-center">
              {nSites}
            </span>
            <button
              onClick={() => setNSites(Math.min(20, nSites + 1))}
              className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-xs text-white font-bold cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
      </Panel>

      {/* Bottom Action Buttons: Reset & Confirm */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={resetWeights}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all cursor-pointer border border-slate-700"
          title={t('left.reset')}
        >
          <RotateCcw size={13} />
          <span>{t('left.reset')}</span>
        </button>

        <button
          onClick={onConfirm}
          disabled={!selectedRegion || analyzing || (analysisMode === 'scientific' && planet === 'earth')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
            !selectedRegion || analyzing || (analysisMode === 'scientific' && planet === 'earth')
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md shadow-orange-500/25 active:scale-[0.99]'
          }`}
        >
          {analyzing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              {analysisMode === 'demo' ? <Check size={14} /> : <Database size={14} />}
              <span>
                {analysisMode === 'demo'
                  ? lang === 'fr' ? 'Lancer DEMO' : 'Run DEMO'
                  : planet === 'earth'
                    ? lang === 'fr' ? 'Choisir la Lune ou Mars' : 'Choose Moon or Mars'
                    : lang === 'fr' ? 'Lancer analyse NASA' : 'Run NASA analysis'}
              </span>
            </>
          )}
        </button>
      </div>
      <button
        type="button"
        onClick={onCsvExperiment}
        disabled={!selectedRegion || planet === 'earth' || analyzing || csvAnalyzing}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-950/30 px-3 py-2 text-[11px] font-semibold text-cyan-100 transition hover:bg-cyan-900/40 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {csvAnalyzing ? (
          <>
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-cyan-100 border-t-transparent" />
            <span>{lang === 'fr' ? 'Analyse CSV…' : 'Analyzing CSV…'}</span>
          </>
        ) : (
          <>
            <Database size={13} />
            <span>{lang === 'fr' ? 'Essai expérimental CSV Atacama' : 'Run Atacama CSV experiment'}</span>
          </>
        )}
      </button>
      <p className="text-[9px] leading-relaxed text-slate-500">
        {lang === 'fr'
          ? 'Grille terrestre limitée à l’Atacama ; score exploratoire sur 4 variables CSV communes.'
          : 'Earth grid is limited to Atacama; exploratory score uses 4 shared CSV features.'}
      </p>
    </div>
  )
}
