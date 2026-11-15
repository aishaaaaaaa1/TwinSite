import { useState } from 'react'
import {
  Sparkles,
  BarChart3,
  Layers,
  ShieldCheck,
  BookOpen,
  Database,
  FileDown,
  Info,
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useI18n } from '@/hooks/useI18n'
import { Panel } from '@/components/ui/Panel'
import { ScoreGauge } from '@/components/ui/ScoreGauge'
import { exportPDF } from '@/lib/pdf'
import type { CsvExperimentResult } from '@/services/csv/atacamaCsvAnalysis'
import type { SitesData } from '@/types'

interface RightPanelProps {
  data: SitesData | null
  analysisError?: string
  csvExperiment: CsvExperimentResult | null
  csvExperimentError: string
  csvAnalyzing: boolean
}

export function RightPanel({
  data,
  analysisError,
  csvExperiment,
  csvExperimentError,
  csvAnalyzing,
}: RightPanelProps) {
  const { t, lang } = useI18n()
  const {
    analysisMode,
    rankedSites,
    selectedSiteId,
    selectedRegion,
    weights,
    setSelectedSiteId,
  } = useAppStore()

  const [exporting, setExporting] = useState(false)

  const selectedScore =
    rankedSites.find((r) => r.site.id === selectedSiteId) ?? rankedSites[0]

  const handleExportPDF = async () => {
    if (analysisMode !== 'demo' || !selectedRegion || rankedSites.length === 0) return
    setExporting(true)
    try {
      await exportPDF({
        target: selectedRegion,
        ranked: rankedSites,
        selected: selectedScore,
        weights,
        catalogStatus: data?.catalogStatus ?? 'unavailable',
        lang,
      })
    } catch (err) {
      console.error('Failed to export PDF:', err)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 pb-8 text-slate-200">
      <div className="flex items-center gap-2 border-b border-blue-500/25 px-1 pb-2">
        <BarChart3 size={17} className="text-blue-400" />
        <h2 className="text-xs font-bold uppercase tracking-wide text-slate-100">
          Analogue Discovery
        </h2>
      </div>
      {analysisMode === 'scientific' ? (
        <div
          role="status"
          className={`rounded-lg border bg-slate-900/80 p-3 text-[11px] leading-relaxed text-slate-200 ${
            analysisError ? 'border-rose-500/50' : rankedSites.length ? 'border-emerald-500/40' : 'border-slate-600'
          }`}
        >
          <strong className="mb-1 inline-flex rounded border border-slate-500 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-slate-200">
            {analysisError
              ? (lang === 'fr' ? 'ÉCHEC DE RÉCUPÉRATION NASA' : 'NASA RETRIEVAL FAILED')
              : rankedSites.length
                ? (lang === 'fr' ? 'MESURES NASA RÉELLES' : 'REAL NASA MEASUREMENTS')
                : (lang === 'fr' ? 'ANALYSE NON LANCÉE' : 'ANALYSIS NOT RUN')}
          </strong>
          <p>{analysisError ?? (rankedSites.length
            ? 'Rankings compare measured elevation only. They are exploratory and do not represent terrain or environmental similarity.'
            : 'Select a Moon or Mars region, connect a NASA Earthdata token, and run a NASA analysis.')}</p>
          {rankedSites.length > 0 && (
            <p className="mt-1 text-[10px] text-slate-400">
              Planetary PDS and Earth NASADEM source resolutions differ. No NASA imagery tiles are used as measurements.
            </p>
          )}
        </div>
      ) : (
        <div
          role="status"
          className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 text-[11px] leading-relaxed text-amber-100"
        >
          <strong className="mb-1 inline-flex rounded border border-amber-400/50 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-amber-200">
            DEMO · NOT NASA VERIFIED
          </strong>
          <p>These example scores are illustrative only and are not scientific results.</p>
        </div>
      )}
      {(csvAnalyzing || csvExperimentError || csvExperiment) && (
        <Panel
          title={lang === 'fr' ? 'Essai CSV Atacama' : 'Atacama CSV experiment'}
          icon={Database}
          defaultOpen
        >
          {csvAnalyzing ? (
            <p role="status" className="text-[10px] text-cyan-100">
              {lang === 'fr' ? 'Lecture des grilles CSV…' : 'Reading project CSV grids…'}
            </p>
          ) : csvExperimentError ? (
            <p role="alert" className="text-[10px] leading-relaxed text-rose-300">{csvExperimentError}</p>
          ) : csvExperiment ? (
            <div className="space-y-2">
              <p className="text-[9px] leading-relaxed text-cyan-100">
                {lang === 'fr'
                  ? `Cible : ${csvExperiment.targetSampleMethod}, ${csvExperiment.targetSampleCount.toLocaleString()} cellule(s). ${csvExperiment.candidateCount.toLocaleString()} cellules valides dans la grille terrestre Atacama.`
                  : `Target: ${csvExperiment.targetSampleMethod}, ${csvExperiment.targetSampleCount.toLocaleString()} cell(s). ${csvExperiment.candidateCount.toLocaleString()} valid cells in the Atacama Earth grid.`}
              </p>
              <div className="space-y-1">
                {csvExperiment.ranked.map((item) => (
                  <div key={item.site.id} className="flex items-start justify-between gap-2 rounded border border-slate-700 bg-slate-950/60 p-2">
                    <span className="min-w-0 text-[9px] leading-relaxed text-slate-300">
                      <strong className="mr-1 text-slate-100">#{item.rank}</strong>
                      {item.site.name}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] font-bold text-cyan-200">
                      {item.score.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[9px] leading-relaxed text-amber-200">
                {lang === 'fr'
                  ? `Score exploratoire limité à l’Atacama ; variables : ${csvExperiment.usedFeatures.join(', ')}. Les autres poids sont exclus puis les poids actifs sont renormalisés. Températures supposées en K puis affichées en °C.`
                  : `Exploratory score limited to Atacama; features: ${csvExperiment.usedFeatures.join(', ')}. Other weights are excluded and active weights are renormalized. Temperatures are assumed to be K and displayed in °C.`}
              </p>
              <p className="text-[9px] leading-relaxed text-slate-500">
                {lang === 'fr'
                  ? 'Les CSV du projet ne documentent pas la provenance détaillée ni les indicateurs de qualité ; ce score n’est pas une validation scientifique.'
                  : 'Project CSV files do not document detailed provenance or quality flags; this score is not a scientific validation.'}
              </p>
            </div>
          ) : null}
        </Panel>
      )}
      {/* SECTION 1: Best Matches List */}
      <Panel title={t('right.bestMatches')} icon={Sparkles} defaultOpen={true}>
        {rankedSites.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs px-2">
            <Info size={24} className="mx-auto mb-2 text-slate-500 opacity-60" />
            <p className="font-medium text-slate-300 mb-1">
              {lang === 'fr' ? 'Aucune analyse effectuée' : 'No Analysis Yet'}
            </p>
            <p className="text-[11px] text-slate-400">
              {lang === 'fr'
                ? 'Sélectionnez une région cible et cliquez sur "Confirmer la cible".'
                : 'Select a target region and click Confirm Target.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
            {rankedSites.map((item) => {
              const isSelected = item.site.id === selectedScore?.site.id
              const scoreVal = Math.round(item.score)
              const scoreColor =
                scoreVal >= 70
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : scoreVal >= 40
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/40'

              return (
                <button
                  key={item.site.id}
                  onClick={() => setSelectedSiteId(item.site.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-md transition-all cursor-pointer border text-left ${
                    isSelected
                      ? 'bg-blue-600/25 border-blue-500 text-white shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs font-bold text-slate-400 w-5">
                      #{item.rank}
                    </span>
                    <div className="truncate">
                      <div className="text-xs font-semibold truncate">
                        {item.site.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {item.site.country}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border shrink-0 ${scoreColor}`}
                  >
                    {scoreVal}%
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Panel>

      {/* Selected Site Score Overview */}
      {selectedScore && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 flex items-center justify-around">
          <ScoreGauge score={selectedScore.score} size={84} />
          <div className="text-left max-w-[150px]">
            <div className="text-xs font-bold text-white truncate">
              {selectedScore.site.name}
            </div>
            <div className="text-[10px] text-slate-400">
              {selectedScore.site.country}
            </div>
            <div className="mt-1 text-[10px] font-mono text-blue-400">
              Rank #{selectedScore.rank} of {rankedSites.length}
            </div>
          </div>
        </div>
      )}

      {/* 4 COLLAPSIBLE SECTIONS */}

      {/* 1. Terrain Comparison */}
      <Panel title={t('right.terrainComparison')} icon={BarChart3} defaultOpen={false}>
        {analysisMode === 'scientific' && selectedRegion && selectedScore ? (
          <div className="flex flex-col gap-2 pt-1 text-xs">
            <div className="grid grid-cols-3 text-[10px] font-mono text-slate-400 pb-1 border-b border-slate-800">
              <span>NASA metric</span>
              <span className="text-right">Target</span>
              <span className="text-right">Earth</span>
            </div>
            <div className="grid grid-cols-3 items-center text-[11px]">
              <span className="text-slate-300">Elevation (m)</span>
              <span className="text-right font-mono text-slate-200">
                {selectedRegion.features.elevation_mean?.toFixed(0) ?? '—'}
              </span>
              <span className="text-right font-mono text-blue-400">
                {selectedScore.site.features.elevation_mean?.toFixed(0) ?? '—'}
              </span>
            </div>
            <p className="text-[9px] leading-relaxed text-amber-200">
              Single-point elevation comparison only; terrain morphology is not measured by this score.
            </p>
          </div>
        ) : analysisMode === 'demo' && selectedRegion && selectedScore ? (
          <div className="flex flex-col gap-2 pt-1 text-xs">
            <div className="grid grid-cols-3 text-[10px] font-mono text-slate-400 pb-1 border-b border-slate-800">
              <span>Metric</span>
              <span className="text-right">Target</span>
              <span className="text-right">Earth</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300">Elevation</span>
              <span className="font-mono text-slate-400">
                {selectedRegion.features.elevation_mean?.toFixed(0) ?? '—'}m
              </span>
              <span className="font-mono text-blue-400">
                {selectedScore.site.features.elevation_mean?.toFixed(0) ?? '—'}m
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300">Slope Mean</span>
              <span className="font-mono text-slate-400">
                {selectedRegion.features.slope_mean?.toFixed(1) ?? '—'}°
              </span>
              <span className="font-mono text-blue-400">
                {selectedScore.site.features.slope_mean?.toFixed(1) ?? '—'}°
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300">Roughness</span>
              <span className="font-mono text-slate-400">
                {selectedRegion.features.roughness?.toFixed(2) ?? '—'}
              </span>
              <span className="font-mono text-blue-400">
                {selectedScore.site.features.roughness?.toFixed(2) ?? '—'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300">Mean Temp</span>
              <span className="font-mono text-slate-400">
                {selectedRegion.features.temp_mean?.toFixed(0) ?? '—'}°C
              </span>
              <span className="font-mono text-blue-400">
                {selectedScore.site.features.temp_mean?.toFixed(0) ?? '—'}°C
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300">Aridity</span>
              <span className="font-mono text-slate-400">
                {selectedRegion.features.aridity?.toFixed(2) ?? '—'}
              </span>
              <span className="font-mono text-blue-400">
                {selectedScore.site.features.aridity?.toFixed(2) ?? '—'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400 py-2 text-center">
            {lang === 'fr'
              ? 'Sélectionnez une région et un site pour comparer le terrain'
              : 'Select a region and site to view terrain comparison'}
          </div>
        )}
      </Panel>

      {/* 2. Terrain Coverage */}
      <Panel title={t('right.terrainCoverage')} icon={Layers} defaultOpen={false}>
        <div className="text-xs text-slate-300 py-1 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span>Morphological Diversity</span>
            <span className="font-mono text-slate-400 font-semibold">Not calculated</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-slate-600 h-1.5 rounded-full" style={{ width: '0%' }} />
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Coverage is unavailable until a documented measured-data catalog is provided.
          </p>
        </div>
      </Panel>

      {/* 3. Confidence & Validation */}
      <Panel title={t('right.confidence')} icon={ShieldCheck} defaultOpen={false}>
        <div className="text-xs text-slate-300 py-1 space-y-2">
          <p className="text-[10px] text-slate-400">
            {lang === 'fr'
              ? 'Aucune stabilité Monte-Carlo ni métrique de validation indépendante disponible. Aucun jeu de validation sourcé n’est fourni.'
              : 'No Monte Carlo stability or independent validation metric is available. No sourced validation dataset is provided.'}
          </p>
        </div>
      </Panel>

      {/* 4. Scientific Context */}
      <Panel title={t('right.scientificContext')} icon={BookOpen} defaultOpen={false}>
        <div className="text-xs text-slate-300 py-1 space-y-2">
          <div className="text-[11px] font-semibold text-orange-400">
            {lang === 'fr' ? 'Limites scientifiques' : 'Scientific Limits'}
          </div>
          <ul className="text-[10px] text-slate-400 space-y-1 list-disc list-inside">
            <li>Gravity: Earth 9.81 m/s² vs Moon 1.62 / Mars 3.71 m/s²</li>
            <li>Atmosphere: Lunar hard vacuum; Martian 0.6 kPa CO₂</li>
            <li>Cosmic radiation flux cannot be simulated at surface level</li>
            <li>Regolith electrostatic charging and abrasive sharp dust</li>
          </ul>
        </div>
      </Panel>

      {/* Export PDF Button */}
      <div className="pt-2">
        <button
          onClick={handleExportPDF}
          disabled={analysisMode !== 'demo' || !selectedRegion || rankedSites.length === 0 || exporting}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-bold tracking-wide transition-all cursor-pointer ${
            analysisMode !== 'demo' || !selectedRegion || rankedSites.length === 0 || exporting
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 active:scale-[0.99]'
          }`}
        >
          {exporting ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Generating PDF...</span>
            </>
          ) : (
            <>
              <FileDown size={14} />
              <span>{t('right.exportPdf')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
