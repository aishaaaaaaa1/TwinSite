import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type {
  Lang,
  Planet,
  AnalysisMode,
  MissionType,
  ViewMode,
  GeometryMode,
  WeightSet,
  PlanetaryRegion,
  SiteScore,
} from '@/types'

const DEFAULT_WEIGHTS: WeightSet = {
  elevation_mean: 0.14,
  relief_std: 0.14,
  slope_mean: 0.14,
  slope_p90: 0.14,
  roughness: 0.14,
  temp_mean: 0.14,
  aridity: 0.16,
}

const MISSION_PRESETS: Record<MissionType, WeightSet> = {
  rover: {
    elevation_mean: 0.08,
    relief_std: 0.10,
    slope_mean: 0.25,
    slope_p90: 0.20,
    roughness: 0.22,
    temp_mean: 0.08,
    aridity: 0.07,
  },
  base: {
    elevation_mean: 0.22,
    relief_std: 0.10,
    slope_mean: 0.10,
    slope_p90: 0.08,
    roughness: 0.08,
    temp_mean: 0.25,
    aridity: 0.17,
  },
  exploration: {
    elevation_mean: 0.14,
    relief_std: 0.14,
    slope_mean: 0.14,
    slope_p90: 0.14,
    roughness: 0.14,
    temp_mean: 0.14,
    aridity: 0.16,
  },
}

interface AppState {
  lang: Lang
  planet: Planet
  analysisMode: AnalysisMode
  missionType: MissionType
  viewMode: ViewMode
  geometryMode: GeometryMode
  weights: WeightSet
  lambda: number
  nSites: number
  selectedRegion: PlanetaryRegion | null
  rankedSites: SiteScore[]
  selectedSiteId: string | null
  isAnalysisReady: boolean
  activeTab: string
  mapPicking: boolean

  setLang: (lang: Lang) => void
  setPlanet: (planet: Planet) => void
  setAnalysisMode: (mode: AnalysisMode) => void
  setMissionType: (missionType: MissionType) => void
  setViewMode: (viewMode: ViewMode) => void
  setGeometryMode: (geometryMode: GeometryMode) => void
  setWeight: (key: keyof WeightSet, value: number) => void
  applyPreset: (missionType: MissionType) => void
  setLambda: (lambda: number) => void
  setNSites: (nSites: number) => void
  setSelectedRegion: (region: PlanetaryRegion | null) => void
  setRankedSites: (sites: SiteScore[]) => void
  setSelectedSiteId: (id: string | null) => void
  setActiveTab: (tab: string) => void
  setMapPicking: (mapPicking: boolean) => void
  resetWeights: () => void
}

export const useAppStore = create<AppState>()(
  immer((set) => ({
    lang: 'en',
    planet: 'moon',
    analysisMode: 'demo',
    missionType: 'exploration',
    viewMode: 'globe',
    geometryMode: 'point',
    weights: { ...DEFAULT_WEIGHTS },
    lambda: 0.5,
    nSites: 5,
    selectedRegion: null,
    rankedSites: [],
    selectedSiteId: null,
    isAnalysisReady: false,
    activeTab: 'matches',
    mapPicking: false,

    setLang: (lang) => set((s) => { s.lang = lang }),
    setPlanet: (planet) => set((s) => { s.planet = planet }),
    setAnalysisMode: (analysisMode) =>
      set((s) => {
        s.analysisMode = analysisMode
        s.rankedSites = []
        s.selectedSiteId = null
      }),
    setMissionType: (missionType) => set((s) => { s.missionType = missionType }),
    setViewMode: (viewMode) => set((s) => { s.viewMode = viewMode }),
    setGeometryMode: (geometryMode) => set((s) => { s.geometryMode = geometryMode }),
    setWeight: (key, value) => set((s) => { s.weights[key] = value }),
    applyPreset: (missionType) =>
      set((s) => {
        s.missionType = missionType
        s.weights = { ...MISSION_PRESETS[missionType] }
      }),
    setLambda: (lambda) => set((s) => { s.lambda = lambda }),
    setNSites: (nSites) => set((s) => { s.nSites = nSites }),
    setSelectedRegion: (region) =>
      set((s) => {
        const geometryChanged = JSON.stringify(s.selectedRegion?.geometry) !==
          JSON.stringify(region?.geometry)
        if (s.selectedRegion?.id !== region?.id || geometryChanged) {
          s.rankedSites = []
          s.selectedSiteId = null
        }
        s.selectedRegion = region
        s.isAnalysisReady = region !== null
      }),
    setRankedSites: (sites) => set((s) => { s.rankedSites = sites }),
    setSelectedSiteId: (id) => set((s) => { s.selectedSiteId = id }),
    setActiveTab: (tab) => set((s) => { s.activeTab = tab }),
    setMapPicking: (mapPicking) => set((s) => { s.mapPicking = mapPicking }),
    resetWeights: () => set((s) => { s.weights = { ...DEFAULT_WEIGHTS } }),
  }))
)
