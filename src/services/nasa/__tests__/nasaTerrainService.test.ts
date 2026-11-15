import { describe, expect, it } from 'vitest'
import { calculateTerrainStatistics } from '../nasaTerrainService'
import type { RasterGrid } from '../nasaTypes'

describe('calculateTerrainStatistics', () => {
  it('normalizes western longitudes for global planetary PDS rasters', () => {
    const values = new Float32Array(360 * 180)
    values[90 * 360 + 350] = 1234
    const grid: RasterGrid = {
      columns: 360,
      rows: 180,
      values,
      west: 0,
      north: 90,
      pixelsPerDegree: 1,
      pixelIsPoint: true,
      noDataValues: [],
      pixelSizeMetersAtEquator: 1,
    }

    const statistics = calculateTerrainStatistics(
      [grid],
      { type: 'Point', coordinates: [-10, 0] },
      1,
    )

    expect(statistics.elevationMean).toBe(1234)
  })
})
