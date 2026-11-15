export interface EarthAnalogueLocation {
  id: string
  name: string
  country: string
  latitude: number
  longitude: number
}

export const EARTH_ANALOGUE_LOCATIONS: EarthAnalogueLocation[] = [
  { id: 'atacama-yungay', name: 'Atacama Desert (Yungay)', country: 'Chile', latitude: -23.86, longitude: -69.87 },
  { id: 'danakil', name: 'Danakil Depression', country: 'Ethiopia', latitude: 14.24, longitude: 40.3 },
  { id: 'mauna-kea', name: 'Mauna Kea', country: 'United States', latitude: 19.82, longitude: -155.47 },
  { id: 'namib', name: 'Namib Desert', country: 'Namibia', latitude: -24.0, longitude: 15.0 },
  { id: 'mojave', name: 'Mojave Desert', country: 'United States', latitude: 35.0, longitude: -116.0 },
]
