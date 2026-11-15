export type Planet = 'earth' | 'moon' | 'mars';
export type AnalysisMode = 'scientific' | 'demo';
export type MissionType = 'rover' | 'base' | 'exploration';
export type ViewMode = 'globe' | '2d' | 'surface';
export type GeometryMode = 'point' | 'circle' | 'rectangle' | 'polygon';
export type Lang = 'en' | 'fr';
export type CatalogStatus = 'unavailable' | 'measured-data' | 'illustrative-fallback';
export type RegionGeometry =
  | { type: 'Point'; coordinates: [longitude: number, latitude: number] }
  | { type: 'Polygon'; coordinates: Array<Array<[longitude: number, latitude: number]>> };

export interface FeatureSet {
  elevation_mean: number | null;
  relief_std: number | null;
  slope_mean: number | null;
  slope_p90: number | null;
  roughness: number | null;
  temp_mean: number | null;
  temp_min: number | null;
  temp_max: number | null;
  aridity: number | null;
  terrainClass: string | null;
}

export interface DataSource {
  name: string;
  dataset: string;
  resolution: string;
  limits: string;
}

export interface EarthSite {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  area_km2: number;
  features: FeatureSet;
  sources: DataSource[];
  imageUrl?: string;
  description?: string;
  descriptionFr?: string;
}

export interface PlanetaryRegion {
  id: string;
  planet: Planet;
  name: string;
  nameFr?: string;
  lat: number;
  lon: number;
  area_km2: number;
  features: FeatureSet;
  sources: DataSource[];
  description?: string;
  descriptionFr?: string;
  geometry?: RegionGeometry;
  metricsEstimated?: boolean;
}

export interface SiteScore {
  site: EarthSite;
  score: number;
  distance: number;
  contributions: Record<string, number>;
  rank: number;
  prevRank?: number;
}

export interface WeightSet {
  elevation_mean: number;
  relief_std: number;
  slope_mean: number;
  slope_p90: number;
  roughness: number;
  temp_mean: number;
  aridity: number;
}

export interface MMRResult {
  selected: SiteScore[];
  lambda: number;
}

export interface TerrainCluster {
  id: number;
  centroid: number[];
  members: string[];
  coveredBy: string[];
  missing: boolean;
}

export interface ConfidenceResult {
  siteId: string;
  meanScore: number;
  stdScore: number;
  rankStability: number;
  scoreInterval: [number, number];
}

export interface ValidationResult {
  recallAt1: number;
  recallAt3: number;
  recallAt5: number;
  meanRank: number;
  hits: Array<{ targetId: string; earthSiteId: string; rank: number; hit: boolean }>;
}

export interface KnownAnalog {
  targetId: string;
  earthSiteId: string;
  note?: string;
}

export interface SitesData {
  earthSites: EarthSite[];
  moonRegions: PlanetaryRegion[];
  marsRegions: PlanetaryRegion[];
  catalogStatus?: CatalogStatus;
}
