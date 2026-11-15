import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchPowerClimatology } from '../powerService'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchPowerClimatology', () => {
  it('returns NASA POWER values with response-derived provenance', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        geometry: { coordinates: [-70.12345, -23.12345, 1800] },
        properties: {
          parameter: {
            T2M: { ANN: 16.88 },
            T2M_MIN: { ANN: -1.59 },
            T2M_MAX: { ANN: 33.65 },
            PRECTOTCORR: { ANN: 0.03 },
          },
        },
        header: {
          title: 'NASA POWER Climatology',
          range: 'January 2001 - December 2025',
          sources: ['MERRA2', 'POWER'],
          fill_value: -999,
        },
        parameters: {
          T2M: { units: 'C', longname: 'Temperature at 2 Meters' },
          T2M_MIN: { units: 'C', longname: 'Minimum Temperature' },
          T2M_MAX: { units: 'C', longname: 'Maximum Temperature' },
          PRECTOTCORR: { units: 'mm/day', longname: 'Corrected Precipitation' },
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await fetchPowerClimatology(-23.12345, -70.12345)

    expect(result.measurements[0]).toMatchObject({
      code: 'T2M',
      annualValue: 16.88,
      unit: 'C',
      status: 'verified',
    })
    expect(result.sources).toEqual(['MERRA2', 'POWER'])
    expect(result.period).toBe('January 2001 - December 2025')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('marks NASA fill values unavailable instead of substituting a value', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        geometry: { coordinates: [10, 20] },
        properties: { parameter: { T2M: { ANN: -999 } } },
        header: {
          title: 'NASA POWER Climatology',
          range: 'January 2001 - December 2025',
          sources: ['POWER'],
          fill_value: -999,
        },
        parameters: { T2M: { units: 'C', longname: 'Temperature' } },
      }),
    }))

    const result = await fetchPowerClimatology(20, 10)

    expect(result.measurements[0].annualValue).toBeNull()
    expect(result.measurements[0].status).toBe('unavailable')
  })

  it('rejects invalid coordinates before making a request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchPowerClimatology(91, 0)).rejects.toThrow(
      'Latitude must be between -90 and 90 degrees.',
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
