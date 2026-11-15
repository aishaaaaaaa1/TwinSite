import type { CatalogStatus, SiteScore, PlanetaryRegion, WeightSet, ConfidenceResult, ValidationResult } from '@/types'

function formatMetric(value: number | null, decimals: number): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(decimals) : 'N/A'
}

export async function exportPDF(opts: {
  target: PlanetaryRegion
  ranked: SiteScore[]
  selected?: SiteScore
  weights: WeightSet
  confidence?: ConfidenceResult[]
  validation?: ValidationResult
  catalogStatus: CatalogStatus
  lang: string
}) {
  const { jsPDF } = await import('jspdf')
  
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, margin = 15
  let y = margin
  
  // Header
  doc.setFillColor(255, 255, 255)
  doc.rect(0, 0, W, 30, 'F')
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('TWINSITE — Planetary Analogue Report', margin, 18)
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text(`Generated: ${new Date().toISOString().slice(0,10)} | Target: ${opts.target.name}`, margin, 26)
  y = 40
  
  // Target info
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Target Region', margin, y); y += 7
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Planet: ${opts.target.planet.toUpperCase()}  |  Region: ${opts.target.name}`, margin, y); y += 5
  doc.text(`Lat: ${opts.target.lat}°  Lon: ${opts.target.lon}°  Area: ${opts.target.area_km2} km²`, margin, y); y += 10
  if (opts.catalogStatus === 'illustrative-fallback') {
    doc.setTextColor(0, 0, 0)
    doc.text(
      'ILLUSTRATIVE FALLBACK DATA: These calculated scores use unverified example values, not NASA measurements. They are not scientific findings.',
      margin,
      y,
      { maxWidth: W - margin * 2 },
    )
    y += 12
    doc.setTextColor(0, 0, 0)
  }
  if (opts.target.metricsEstimated) {
    doc.setTextColor(0, 0, 0)
    doc.text(
      'Target terrain metrics are estimated from the nearest catalog reference. The point selection uses a default 25 km² footprint; its area was not measured.',
      margin,
      y,
      { maxWidth: W - margin * 2 },
    )
    y += 10
    doc.setTextColor(0, 0, 0)
  }

  if (opts.selected) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Selected Earth Analogue Comparison', margin, y); y += 7
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(
      `${opts.selected.site.name}, ${opts.selected.site.country} — ${opts.catalogStatus === 'illustrative-fallback' ? 'Illustrative similarity' : 'Similarity'}: ${opts.selected.score.toFixed(1)}%`,
      margin,
      y,
    )
    y += 7
    const comparisons: Array<[string, string, string]> = [
      ['Mean elevation (m)', formatMetric(opts.target.features.elevation_mean, 0), formatMetric(opts.selected.site.features.elevation_mean, 0)],
      ['Mean slope (°)', formatMetric(opts.target.features.slope_mean, 1), formatMetric(opts.selected.site.features.slope_mean, 1)],
      ['Roughness', formatMetric(opts.target.features.roughness, 2), formatMetric(opts.selected.site.features.roughness, 2)],
      ['Mean temperature (°C)', formatMetric(opts.target.features.temp_mean, 1), formatMetric(opts.selected.site.features.temp_mean, 1)],
      ['Aridity index', formatMetric(opts.target.features.aridity, 2), formatMetric(opts.selected.site.features.aridity, 2)],
    ]
    doc.setFont('helvetica', 'bold')
    doc.text('Metric', margin, y)
    doc.text(opts.target.planet.toUpperCase(), 100, y)
    doc.text('EARTH', 150, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    for (const [label, targetValue, earthValue] of comparisons) {
      doc.text(label, margin, y)
      doc.text(targetValue, 100, y)
      doc.text(earthValue, 150, y)
      y += 5
    }
    y += 6
  }
  
  // Top matches
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Top Earth Analogues', margin, y); y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  for (const r of opts.ranked.slice(0, 10)) {
    doc.text(`${r.rank}. ${r.site.name} (${r.site.country}) — Score: ${r.score.toFixed(1)}%`, margin, y); y += 5
    if (y > 270) { doc.addPage(); y = margin }
  }
  y += 5
  
  // Weights
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Mission Parameters / Weights', margin, y); y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  for (const [k, v] of Object.entries(opts.weights)) {
    doc.text(`${k}: ${(v * 100).toFixed(0)}%`, margin, y); y += 5
  }
  y += 5
  
  // Validation
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Scientific Validation', margin, y); y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  if (opts.validation) {
    doc.text(`Recall@1: ${(opts.validation.recallAt1*100).toFixed(0)}%  Recall@3: ${(opts.validation.recallAt3*100).toFixed(0)}%  Recall@5: ${(opts.validation.recallAt5*100).toFixed(0)}%`, margin, y); y += 5
    doc.text(`Mean Rank: ${opts.validation.meanRank.toFixed(1)}`, margin, y); y += 10
  } else {
    doc.text('Not available: no independent, documented validation dataset is configured.', margin, y); y += 10
  }
  
  // Scientific limits
  if (doc.getNumberOfPages() === 1 && y > 240) doc.addPage()
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Scientific Limits of Analogues', margin, y); y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const limits = [
    'Gravity: Earth 9.81 vs Moon 1.62 / Mars 3.71 m/s² — structural loads differ fundamentally.',
    'Atmosphere: Moon=vacuum, Mars=0.6kPa CO₂ — no weathering replication possible.',
    'Radiation: No magnetic field protection; cosmic-ray doses cannot be simulated.',
    'Dust: Martian/lunar regolith has unique mineralogy and electrostatic properties.',
  ]
  for (const lim of limits) {
    const lines = doc.splitTextToSize(lim, W - margin * 2)
    doc.text(lines, margin, y); y += lines.length * 4 + 2
    if (y > 270) { doc.addPage(); y = margin }
  }
  
  // Sources
  doc.addPage()
  y = margin
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Data Sources & Provenance', margin, y); y += 7
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  const imagerySources = [
    'Planet image: NASA Image and Video Library API (images-api.nasa.gov).',
    'Mars and Moon surface layers: NASA Mars Trek (MOLA/CTX) and Moon Trek (LRO WAC/LOLA).',
    'Earth analogue map: NASA Earthdata GIBS Blue Marble WMTS.',
  ]
  for (const source of imagerySources) {
    doc.text(source, margin, y)
    y += 5
  }
  y += 3
  const sources =
    opts.catalogStatus === 'measured-data'
      ? opts.ranked.slice(0, 5).flatMap(r => r.site.sources)
      : []
  if (opts.catalogStatus === 'illustrative-fallback') {
    doc.text(
      'Candidate data source lists are illustrative and are not linked to verified measurements. NASA map layers are visualizations only.',
      margin,
      y,
      { maxWidth: W - margin * 2 },
    )
    y += 10
  }
  const unique = [...new Map(sources.map(s => [s.dataset, s])).values()]
  for (const src of unique) {
    doc.text(`• ${src.name} — ${src.dataset} (${src.resolution})`, margin, y); y += 4
    const lims = doc.splitTextToSize(`  Limits: ${src.limits}`, W - margin * 2 - 5)
    doc.setTextColor(0, 0, 0)
    doc.text(lims, margin, y); y += lims.length * 4 + 2
    doc.setTextColor(0, 0, 0)
    if (y > 270) { doc.addPage(); y = margin }
  }
  
  doc.save(`TwinSite_${opts.target.planet}_${opts.target.name.replace(/\s+/g,'_')}.pdf`)
}
