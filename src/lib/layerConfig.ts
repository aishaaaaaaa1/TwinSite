export interface LayerConfig {
  id: string
  nameKey: string
  url: string
  attribution: string
  type: 'wmts' | 'xyz'
  format: string
  opacity: number
  visible: boolean
  isBase: boolean
  body: 'earth' | 'moon' | 'mars'
  maxNativeZoom?: number
  legendUrl?: string
}

export const LAYER_CONFIGS: LayerConfig[] = [
  {
    id: 'earth_blue_marble',
    nameKey: 'map.blueMarble',
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_ShadedRelief/default/2004-08/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpg',
    attribution: 'NASA GIBS Blue Marble',
    type: 'wmts',
    format: 'jpg',
    opacity: 1,
    visible: true,
    isBase: true,
    body: 'earth',
    maxNativeZoom: 8,
  },
  {
    id: 'earth_land_temp',
    nameKey: 'map.landTemp',
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_Land_Surface_Temp_Day/default/2024-01-01/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png',
    attribution: 'NASA GIBS MODIS Land Surface Temperature',
    type: 'wmts',
    format: 'png',
    opacity: 0.7,
    visible: false,
    isBase: false,
    body: 'earth',
    maxNativeZoom: 7,
  },
  {
    id: 'earth_srtm_hillshade',
    nameKey: 'map.hillshade',
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/SRTM_Color_Index/default/GoogleMapsCompatible_Level12/{z}/{y}/{x}.png',
    attribution: 'NASA GIBS SRTM',
    type: 'wmts',
    format: 'png',
    opacity: 0.5,
    visible: false,
    isBase: false,
    body: 'earth',
    maxNativeZoom: 12,
  },
  {
    id: 'earth_air_temp_monthly',
    nameKey: 'map.airTemperature',
    url: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MERRA2_2m_Air_Temperature_Monthly/default/default/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png',
    attribution: 'NASA GIBS · MERRA-2 2 m air temperature (monthly)',
    type: 'wmts',
    format: 'png',
    opacity: 0.8,
    visible: false,
    isBase: false,
    body: 'earth',
    maxNativeZoom: 6,
    legendUrl: 'https://gibs.earthdata.nasa.gov/legends/MERRA2_2m_Air_Temperature_Monthly_H.svg',
  },
  {
    id: 'moon_lola_shade',
    nameKey: 'map.elevation',
    url: 'https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    attribution: 'NASA Moon Trek — Lunar Reconnaissance Orbiter WAC',
    type: 'wmts',
    format: 'jpg',
    opacity: 1,
    visible: true,
    isBase: true,
    body: 'moon',
  },
  {
    id: 'mars_mola_elevation',
    nameKey: 'map.elevation',
    url: 'https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{z}/{y}/{x}.jpg',
    attribution: 'NASA Mars Trek — MOLA',
    type: 'wmts',
    format: 'jpg',
    opacity: 1,
    visible: true,
    isBase: true,
    body: 'mars',
  },
]
