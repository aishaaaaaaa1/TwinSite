import { useEffect, useState } from 'react'
import type { SitesData } from '@/types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumberOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

function isFeatureSet(value: unknown): boolean {
  if (!isRecord(value)) return false
  const numericFeatures = [
    'elevation_mean',
    'relief_std',
    'slope_mean',
    'slope_p90',
    'roughness',
    'temp_mean',
    'temp_min',
    'temp_max',
    'aridity',
  ]
  return numericFeatures.every((key) => isFiniteNumberOrNull(value[key])) &&
    (value.terrainClass === null || typeof value.terrainClass === 'string')
}

function isSources(value: unknown): boolean {
  return Array.isArray(value) && value.every((source) =>
    isRecord(source) &&
    typeof source.name === 'string' &&
    typeof source.dataset === 'string' &&
    typeof source.resolution === 'string' &&
    typeof source.limits === 'string',
  )
}

function isRegion(value: unknown, planet: 'moon' | 'mars'): boolean {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    value.planet === planet &&
    typeof value.name === 'string' &&
    typeof value.lat === 'number' &&
    Number.isFinite(value.lat) &&
    typeof value.lon === 'number' &&
    Number.isFinite(value.lon) &&
    typeof value.area_km2 === 'number' &&
    Number.isFinite(value.area_km2) &&
    isFeatureSet(value.features) &&
    isSources(value.sources)
}

function isEarthSite(value: unknown): boolean {
  return isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.country === 'string' &&
    typeof value.lat === 'number' &&
    Number.isFinite(value.lat) &&
    typeof value.lon === 'number' &&
    Number.isFinite(value.lon) &&
    typeof value.area_km2 === 'number' &&
    Number.isFinite(value.area_km2) &&
    isFeatureSet(value.features) &&
    isSources(value.sources)
}

function isSitesData(value: unknown): value is Omit<SitesData, 'catalogStatus'> {
  return isRecord(value) &&
    Array.isArray(value.earthSites) &&
    value.earthSites.every(isEarthSite) &&
    Array.isArray(value.moonRegions) &&
    value.moonRegions.every((region) => isRegion(region, 'moon')) &&
    Array.isArray(value.marsRegions) &&
    value.marsRegions.every((region) => isRegion(region, 'mars'))
}

export function useSitesData() {
  const [data, setData] = useState<SitesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch('/data/sites.json')
      .then(async (response) => {
        if (!response.ok) throw new Error(`Could not load the demo catalogue (HTTP ${response.status}).`)
        const payload: unknown = await response.json()
        if (!isSitesData(payload)) throw new Error('The demo catalogue has an invalid data format.')
        if (active) setData({ ...payload, catalogStatus: 'illustrative-fallback' })
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return { data, loading, error }
}
