import { useCallback, useEffect, useState } from 'react'
import { TopNav } from '@/components/layout/TopNav'
import { AppLayout } from '@/components/layout/AppLayout'
import { LeftPanel } from '@/components/panels/LeftPanel'
import { DiscoveryCenterPanel } from '@/components/map/DiscoveryCenterPanel'
import { RightPanel } from '@/components/panels/RightPanel'
import { useSitesData } from '@/hooks/useSitesData'
import { useAppStore } from '@/store/useAppStore'
import { rankByMeasuredElevation, rankSites } from '@/lib/similarity'
import { selectMMR } from '@/lib/selection'
import { resolveNasaTerrain } from '@/services/nasa/nasaDataResolver'
import { getEarthdataToken } from '@/services/nasa/earthdataAuth'
import { NasaDatasetError } from '@/services/nasa/nasaTypes'
import { runAtacamaCsvExperiment, type CsvExperimentResult } from '@/services/csv/atacamaCsvAnalysis'
import { EARTH_ANALOGUE_LOCATIONS } from '@/data/earthAnalogueLocations'
import type { EarthSite, FeatureSet, RegionGeometry } from '@/types'

export function MissionWorkspace() {
  const { data, loading, error } = useSitesData()
  const store = useAppStore()
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState('')
  const [csvAnalyzing, setCsvAnalyzing] = useState(false)
  const [csvExperiment, setCsvExperiment] = useState<CsvExperimentResult | null>(null)
  const [csvExperimentError, setCsvExperimentError] = useState('')

  useEffect(() => {
    setCsvExperiment(null)
    setCsvExperimentError('')
  }, [store.selectedRegion])

  const handleConfirm = useCallback(async () => {
    if (!store.selectedRegion || !data) return
    setAnalyzing(true)
    setAnalysisError('')
    try {
      if (store.analysisMode === 'demo') {
        await new Promise((resolve) => setTimeout(resolve, 20))
        const ranked = rankSites(store.selectedRegion, data.earthSites, store.weights, 'demo')
        const finalSelection = store.lambda < 1.0
          ? selectMMR(ranked, store.nSites, store.lambda)
          : ranked
        store.setRankedSites(finalSelection.length > 0 ? finalSelection : ranked)
        if (finalSelection.length > 0) store.setSelectedSiteId(finalSelection[0].site.id)
        return
      }

      if (store.selectedRegion.planet === 'earth') {
        throw new Error('Choose a Moon or Mars target. NASA POWER climatology is not comparable to planetary elevation.')
      }
      if (!getEarthdataToken()) {
        throw new Error('NASA scientific analysis requires an Earthdata user token, which is not configurable on this page.')
      }

      const target = store.selectedRegion
      const targetGeometry: RegionGeometry = target.geometry ?? {
        type: 'Point',
        coordinates: [target.lon, target.lat],
      }
      if (targetGeometry.type !== 'Point') {
        throw new Error('NASA analogue ranking currently compares point elevations only. Select the Point geometry.')
      }
      const targetTerrain = await resolveNasaTerrain(target.planet, targetGeometry)
      const earthSites = await Promise.all(EARTH_ANALOGUE_LOCATIONS.map(async (location): Promise<EarthSite> => {
        const terrain = await resolveNasaTerrain('earth', {
          type: 'Point',
          coordinates: [location.longitude, location.latitude],
        })
        const features: FeatureSet = {
          elevation_mean: terrain.statistics.elevationMean,
          relief_std: null,
          slope_mean: null,
          slope_p90: null,
          roughness: null,
          temp_mean: null,
          temp_min: null,
          temp_max: null,
          aridity: null,
          terrainClass: null,
        }
        return {
          id: location.id,
          name: location.name,
          country: location.country,
          lat: location.latitude,
          lon: location.longitude,
          area_km2: 0,
          features,
          sources: [{
            name: terrain.metadata.service,
            dataset: terrain.metadata.dataset,
            resolution: terrain.metadata.resolutionLabel,
            limits: 'NASA DEM elevation sampled at the analogue coordinates; no terrain morphology was inferred from a single point.',
          }],
        }
      }))
      const measuredTarget = {
        ...target,
        features: { ...target.features, elevation_mean: targetTerrain.statistics.elevationMean },
        sources: [...target.sources, {
          name: targetTerrain.metadata.service,
          dataset: targetTerrain.metadata.dataset,
          resolution: targetTerrain.metadata.resolutionLabel,
          limits: 'Elevation only; planetary and Earth DEM resolutions differ.',
        }],
      }
      store.setSelectedRegion(measuredTarget)
      const ranked = rankByMeasuredElevation(targetTerrain.statistics.elevationMean, earthSites)
      store.setRankedSites(ranked)
      store.setSelectedSiteId(ranked[0]?.site.id ?? null)
    } catch (error) {
      store.setRankedSites([])
      setAnalysisError(error instanceof NasaDatasetError
        ? `${error.message} ${error.context.retrievalError}`
        : error instanceof Error ? error.message : String(error))
    } finally {
      setAnalyzing(false)
    }
  }, [store, data])

  const handleCsvExperiment = useCallback(async () => {
    const target = store.selectedRegion
    if (!target || target.planet === 'earth') return
    setCsvAnalyzing(true)
    setCsvExperiment(null)
    setCsvExperimentError('')
    try {
      const result = await runAtacamaCsvExperiment(target, store.weights, store.nSites)
      setCsvExperiment(result)
    } catch (error) {
      setCsvExperimentError(error instanceof Error ? error.message : String(error))
    } finally {
      setCsvAnalyzing(false)
    }
  }, [store])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#020408' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: '#94a3b8' }}>Loading planetary data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div role="alert" className="min-h-screen flex items-center justify-center bg-[#020408] p-6 text-center text-sm text-rose-200">
        Could not load the demo catalogue: {error}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#020408' }}>
      <TopNav />
      <AppLayout
        leftPanel={
          <LeftPanel
            onConfirm={handleConfirm}
            onCsvExperiment={handleCsvExperiment}
            analyzing={analyzing}
            csvAnalyzing={csvAnalyzing}
            data={data}
          />
        }
        centerPanel={<DiscoveryCenterPanel data={data} />}
        rightPanel={
          <RightPanel
            data={data}
            analysisError={analysisError}
            csvExperiment={csvExperiment}
            csvExperimentError={csvExperimentError}
            csvAnalyzing={csvAnalyzing}
          />
        }
      />
    </div>
  )
}
