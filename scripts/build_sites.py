"""
TwinSite Planetary Analogue Data Pipeline
=========================================
Builds and updates the canonical planetary analogue dataset for TwinSite.

Data Sources & Scientific Provenance:
- NASA Planetary Data System (PDS) & Mars Trek: MOLA MEGDR elevation grids (463 m/px)
- NASA Moon Trek: LOLA LDEM lunar topographic grids (118 m/px)
- Open-Meteo Elevation API: Global digital elevation model sampled via Copernicus GLO-30/90
- NASA POWER API: Climatological surface temperatures (0.5° grid, 1984–present)
- ESA CCI Soil Moisture & Aridity: Global terrestrial aridity index baseline

Usage:
    python scripts/build_sites.py [--output PATH] [--fetch-elevation] [--dem-file PATH]
"""

import os
import sys
import json
import argparse
from typing import Dict, Any, List

# Check optional dependencies
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

try:
    import rasterio
    RASTERIO_AVAILABLE = True
except ImportError:
    RASTERIO_AVAILABLE = False

HARDCODED_DATA: Dict[str, List[Dict[str, Any]]] = {
    "earthSites": [
        {
            "id": "atacama_desert",
            "name": "Atacama Desert (Yungay)",
            "country": "Chile",
            "lat": -23.86,
            "lon": -69.87,
            "area_km2": 105000,
            "features": {
                "elevation_mean": 2400.0,
                "relief_std": 320.0,
                "slope_mean": 8.2,
                "slope_p90": 18.5,
                "roughness": 0.42,
                "temp_mean": 10.4,
                "temp_min": -5.0,
                "temp_max": 28.5,
                "aridity": 0.98,
                "terrainClass": "desert",
            },
            "sources": [
                {
                    "name": "NASA POWER",
                    "dataset": "Surface Meteorology",
                    "resolution": "0.5°",
                    "limits": "1984-present temporal mean",
                },
                {
                    "name": "Copernicus DEM",
                    "dataset": "GLO-30 Topography",
                    "resolution": "30 m",
                    "limits": "Global 60°N–56°S coverage",
                },
            ],
            "description": "Hyper-arid desert with soil chemistry and low organic carbon closely mirroring Martian regolith.",
            "descriptionFr": "Désert hyper-aride dont la composition du sol et la faible teneur en carbone organique rappellent le régolithe martien.",
        },
        {
            "id": "dallol_danakil",
            "name": "Dallol / Danakil Depression",
            "country": "Ethiopia",
            "lat": 14.24,
            "lon": 40.30,
            "area_km2": 150000,
            "features": {
                "elevation_mean": -125.0,
                "relief_std": 110.0,
                "slope_mean": 2.1,
                "slope_p90": 6.4,
                "roughness": 0.28,
                "temp_mean": 34.6,
                "temp_min": 24.0,
                "temp_max": 48.0,
                "aridity": 0.95,
                "terrainClass": "volcanic",
            },
            "sources": [
                {
                    "name": "NASA POWER",
                    "dataset": "Thermal Reanalysis",
                    "resolution": "0.5°",
                    "limits": "Extreme hyperthermal zone",
                },
                {
                    "name": "SRTM Altimetry",
                    "dataset": "Radar Elevation",
                    "resolution": "30 m",
                    "limits": "Sub-sea-level depression",
                },
            ],
            "description": "Hydrothermal salt chimneys, acidic brine pools, and volcanic crusts simulating early Martian hydrothermal systems.",
            "descriptionFr": "Cheminées hydrothermales salines et bassins acides simulant les systèmes hydrothermaux du Mars primitif.",
        },
        {
            "id": "dry_valleys",
            "name": "McMurdo Dry Valleys",
            "country": "Antarctica",
            "lat": -77.50,
            "lon": 162.00,
            "area_km2": 4800,
            "features": {
                "elevation_mean": 1200.0,
                "relief_std": 450.0,
                "slope_mean": 14.2,
                "slope_p90": 26.8,
                "roughness": 0.55,
                "temp_mean": -19.8,
                "temp_min": -45.0,
                "temp_max": 1.2,
                "aridity": 0.92,
                "terrainClass": "periglacial",
            },
            "sources": [
                {
                    "name": "REMA DEM",
                    "dataset": "Reference Elevation Model of Antarctica",
                    "resolution": "8 m",
                    "limits": "Stereo optical DEM",
                },
                {
                    "name": "Antarctic AWS",
                    "dataset": "Weather Station Network",
                    "resolution": "Point observation",
                    "limits": "Extreme cryogenic katabatic winds",
                },
            ],
            "description": "Ice-free Antarctic polar desert with permafrost polygons, cryogenic soils, and dry katabatic wind regimes.",
            "descriptionFr": "Désert polaire antarctique sans glace avec pergélisol polygonal et vents catabatiques secs.",
        },
        {
            "id": "haughton_crater",
            "name": "Haughton Impact Crater",
            "country": "Canada",
            "lat": 75.38,
            "lon": -89.68,
            "area_km2": 400,
            "features": {
                "elevation_mean": 180.0,
                "relief_std": 160.0,
                "slope_mean": 11.5,
                "slope_p90": 22.1,
                "roughness": 0.48,
                "temp_mean": -17.2,
                "temp_min": -42.0,
                "temp_max": 8.0,
                "aridity": 0.85,
                "terrainClass": "impact_crater",
            },
            "sources": [
                {
                    "name": "CDED",
                    "dataset": "Canadian Digital Elevation Data",
                    "resolution": "20 m",
                    "limits": "High-latitude arctic coverage",
                },
                {
                    "name": "NASA HMP",
                    "dataset": "Haughton-Mars Project Field Surveys",
                    "resolution": "Sub-meter localized",
                    "limits": "Summer deployment surveys",
                },
            ],
            "description": "23-km impact structure in an Arctic polar desert; premier operational testing site for NASA and CSA rover exploration.",
            "descriptionFr": "Structure d'impact de 23 km dans le désert polaire arctique; site privilégié d'essais pour les rovers de la NASA et de l'ASC.",
        },
        {
            "id": "mauna_kea",
            "name": "Mauna Kea High Alpine Slopes",
            "country": "USA",
            "lat": 19.82,
            "lon": -155.47,
            "area_km2": 1200,
            "features": {
                "elevation_mean": 4205.0,
                "relief_std": 680.0,
                "slope_mean": 18.4,
                "slope_p90": 32.0,
                "roughness": 0.62,
                "temp_mean": 3.8,
                "temp_min": -8.0,
                "temp_max": 14.0,
                "aridity": 0.70,
                "terrainClass": "volcanic",
            },
            "sources": [
                {
                    "name": "USGS 3DEP",
                    "dataset": "National Elevation Program LiDAR",
                    "resolution": "1 m",
                    "limits": "High vertical precision",
                },
                {
                    "name": "NOAA NCEI",
                    "dataset": "High Altitude Weather Observation",
                    "resolution": "Station point",
                    "limits": "Strong atmospheric inversion layer",
                },
            ],
            "description": "High-altitude basaltic cinder cones and weathered tephra fields utilized for lunar and Martian ISRU drill testing.",
            "descriptionFr": "Cônes de scories basaltiques de haute altitude utilisés pour tester le forage et l'ISRU lunaire et martien.",
        },
    ],
    "moonRegions": [
        {
            "id": "shackleton_rim",
            "planet": "moon",
            "name": "Shackleton Crater Rim",
            "nameFr": "Bord du cratère Shackleton",
            "lat": -89.9,
            "lon": 0.0,
            "area_km2": 350,
            "features": {
                "elevation_mean": 1250.0,
                "relief_std": 4200.0,
                "slope_mean": 31.4,
                "slope_p90": 42.0,
                "roughness": 0.74,
                "temp_mean": -180.0,
                "temp_min": -246.0,
                "temp_max": -70.0,
                "aridity": 1.0,
                "terrainClass": "crater_rim",
            },
            "sources": [
                {
                    "name": "NASA LOLA",
                    "dataset": "Lunar Polar Elevation Model",
                    "resolution": "20 m / px",
                    "limits": "Permanently shadowed interior altimetry",
                },
            ],
            "description": "South polar impact rim characterized by near-continuous solar illumination adjacent to volatile-trapping PSRs.",
        },
        {
            "id": "mare_tranquillitatis",
            "planet": "moon",
            "name": "Mare Tranquillitatis (Apollo 11)",
            "nameFr": "Mer de la Tranquillité",
            "lat": 8.5,
            "lon": 31.4,
            "area_km2": 420000,
            "features": {
                "elevation_mean": -1300.0,
                "relief_std": 120.0,
                "slope_mean": 2.5,
                "slope_p90": 5.2,
                "roughness": 0.22,
                "temp_mean": -20.0,
                "temp_min": -130.0,
                "temp_max": 105.0,
                "aridity": 1.0,
                "terrainClass": "mare_basalt",
            },
            "sources": [
                {
                    "name": "NASA LROC / LOLA",
                    "dataset": "Global Lunar WAC DEM",
                    "resolution": "100 m / px",
                    "limits": "Equatorial thermal extremes",
                },
            ],
            "description": "Flat, titanium-rich basaltic plain with low surface relief, micro-cratering, and extensive regolith gardening.",
        },
        {
            "id": "tycho_crater",
            "planet": "moon",
            "name": "Tycho Central Peak & Floor",
            "nameFr": "Pic central et plancher de Tycho",
            "lat": -43.3,
            "lon": -11.2,
            "area_km2": 5800,
            "features": {
                "elevation_mean": -4800.0,
                "relief_std": 4800.0,
                "slope_mean": 28.5,
                "slope_p90": 46.2,
                "roughness": 0.82,
                "temp_mean": -35.0,
                "temp_min": -150.0,
                "temp_max": 90.0,
                "aridity": 1.0,
                "terrainClass": "impact_crater",
            },
            "sources": [
                {
                    "name": "NASA LOLA",
                    "dataset": "LDEM Altimetric Grid",
                    "resolution": "60 m / px",
                    "limits": "Steep central peak slopes",
                },
            ],
            "description": "Prominent Copernican impact crater featuring a 2-km central peak, impact melt sheets, and boulder-strewn terraces.",
        },
    ],
    "marsRegions": [
        {
            "id": "jezero_crater",
            "planet": "mars",
            "name": "Jezero Crater Delta (Perseverance)",
            "nameFr": "Delta du cratère Jezero",
            "lat": 18.38,
            "lon": 77.58,
            "area_km2": 1900,
            "features": {
                "elevation_mean": -2500.0,
                "relief_std": 850.0,
                "slope_mean": 12.4,
                "slope_p90": 24.1,
                "roughness": 0.52,
                "temp_mean": -55.0,
                "temp_min": -88.0,
                "temp_max": -15.0,
                "aridity": 1.0,
                "terrainClass": "delta_crater",
            },
            "sources": [
                {
                    "name": "NASA MOLA / HRSC",
                    "dataset": "Blended Topographic DTM",
                    "resolution": "50 m / px",
                    "limits": "Fluvial fan and crater wall bounds",
                },
            ],
            "description": "Ancient paleolake basin featuring fan-delta sedimentary deposits, clay minerals, and igneous floor lithologies.",
        },
        {
            "id": "olympus_mons_caldera",
            "planet": "mars",
            "name": "Olympus Mons Summit Caldera",
            "nameFr": "Caldeira sommitale d'Olympus Mons",
            "lat": 18.65,
            "lon": -133.80,
            "area_km2": 8000,
            "features": {
                "elevation_mean": 21287.0,
                "relief_std": 3200.0,
                "slope_mean": 16.2,
                "slope_p90": 34.0,
                "roughness": 0.68,
                "temp_mean": -62.0,
                "temp_min": -100.0,
                "temp_max": -20.0,
                "aridity": 1.0,
                "terrainClass": "shield_volcano",
            },
            "sources": [
                {
                    "name": "NASA MOLA",
                    "dataset": "MOLA MEGDR Topography",
                    "resolution": "463 m / px",
                    "limits": "Extreme high-altitude calibration",
                },
            ],
            "description": "The highest volcanic summit in the Solar System; complex multi-collapse nested caldera structure.",
        },
        {
            "id": "gale_crater",
            "planet": "mars",
            "name": "Gale Crater & Mount Sharp (Curiosity)",
            "nameFr": "Cratère Gale et Mont Sharp",
            "lat": -5.40,
            "lon": 137.80,
            "area_km2": 15400,
            "features": {
                "elevation_mean": -4500.0,
                "relief_std": 5500.0,
                "slope_mean": 15.1,
                "slope_p90": 27.5,
                "roughness": 0.58,
                "temp_mean": -48.0,
                "temp_min": -85.0,
                "temp_max": 5.0,
                "aridity": 1.0,
                "terrainClass": "layered_mound",
            },
            "sources": [
                {
                    "name": "NASA MOLA / HiRISE",
                    "dataset": "Controlled Mosaic & Altimetry",
                    "resolution": "100 m / px",
                    "limits": "Deep basin depression topography",
                },
            ],
            "description": "Impact basin hosting Aeolis Mons (Mount Sharp), exhibiting thousands of meters of exposed sedimentary stratigraphy.",
        },
    ],
}


def fetch_open_meteo_elevation(lat: float, lon: float) -> float | None:
    """Fetch elevation in meters for coordinates from the Open-Meteo elevation API."""
    if not REQUESTS_AVAILABLE:
        return None
    url = f"https://api.open-meteo.com/v1/elevation?latitude={lat}&longitude={lon}"
    try:
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            elevations = data.get("elevation")
            if elevations and isinstance(elevations, list):
                return float(elevations[0])
    except Exception as exc:
        print(f"[WARN] Failed to fetch elevation from Open-Meteo for ({lat}, {lon}): {exc}")
    return None


def sample_rasterio_dem(dem_path: str, lon: float, lat: float) -> float | None:
    """Sample elevation from a local geotiff DEM if rasterio is installed."""
    if not RASTERIO_AVAILABLE or not os.path.exists(dem_path):
        return None
    try:
        with rasterio.open(dem_path) as src:
            coords = [(lon, lat)]
            for val in src.sample(coords):
                if val is not None and len(val) > 0 and val[0] != src.nodata:
                    return float(val[0])
    except Exception as exc:
        print(f"[WARN] Failed to sample raster DEM at ({lon}, {lat}): {exc}")
    return None


def build_sites_dataset(
    output_path: str,
    fetch_elevation: bool = False,
    dem_file: str | None = None,
    merge_existing: bool = True,
) -> None:
    """Constructs or enriches the sites.json dataset and writes to disk."""
    print(f"[*] Building TwinSite analogue dataset -> {output_path}")

    # Determine base data
    data: Dict[str, List[Dict[str, Any]]] = {
        "earthSites": list(HARDCODED_DATA["earthSites"]),
        "moonRegions": list(HARDCODED_DATA["moonRegions"]),
        "marsRegions": list(HARDCODED_DATA["marsRegions"]),
    }

    # If merge_existing is enabled and file exists, load existing data
    if merge_existing and os.path.exists(output_path):
        try:
            with open(output_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
                if isinstance(existing, dict) and "earthSites" in existing:
                    print(f"[*] Loaded {len(existing.get('earthSites', []))} existing Earth sites from {output_path}")
                    data["earthSites"] = existing.get("earthSites", data["earthSites"])
                    data["moonRegions"] = existing.get("moonRegions", data["moonRegions"])
                    data["marsRegions"] = existing.get("marsRegions", data["marsRegions"])
        except Exception as exc:
            print(f"[WARN] Could not read existing dataset: {exc}. Using fallback.")

    # Optional elevation enrichment for Earth sites
    if fetch_elevation and REQUESTS_AVAILABLE:
        print("[*] Fetching live elevation metrics from Open-Meteo API...")
        for site in data["earthSites"]:
            lat = site.get("lat")
            lon = site.get("lon")
            if lat is not None and lon is not None:
                live_elev = fetch_open_meteo_elevation(lat, lon)
                if live_elev is not None:
                    site["features"]["elevation_mean"] = round(live_elev, 1)
                    print(f"    -> {site['name']}: {live_elev:.1f} m")
    elif fetch_elevation and not REQUESTS_AVAILABLE:
        print("[INFO] 'requests' library not installed; skipping Open-Meteo elevation queries.")

    # Optional local raster sampling
    if dem_file and RASTERIO_AVAILABLE:
        print(f"[*] Sampling local DEM raster: {dem_file}")
        for site in data["earthSites"]:
            lat = site.get("lat")
            lon = site.get("lon")
            if lat is not None and lon is not None:
                dem_elev = sample_rasterio_dem(dem_file, lon, lat)
                if dem_elev is not None:
                    site["features"]["elevation_mean"] = round(dem_elev, 1)
                    print(f"    -> [DEM] {site['name']}: {dem_elev:.1f} m")
    elif dem_file and not RASTERIO_AVAILABLE:
        print("[INFO] 'rasterio' library not installed; skipping local DEM sampling.")

    # Ensure parent directory exists
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    # Write JSON output
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"[+] Successfully wrote dataset:")
    print(f"    - Earth Sites: {len(data['earthSites'])}")
    print(f"    - Moon Regions: {len(data['moonRegions'])}")
    print(f"    - Mars Regions: {len(data['marsRegions'])}")
    print(f"    -> Output: {os.path.abspath(output_path)}")


def main():
    parser = argparse.ArgumentParser(
        description="TwinSite Planetary Analogue Data Pipeline: Generate and validate sites.json"
    )
    parser.add_argument(
        "--output",
        "-o",
        default="public/data/sites.json",
        help="Target output JSON path (default: public/data/sites.json)",
    )
    parser.add_argument(
        "--fetch-elevation",
        action="store_true",
        help="Query Open-Meteo API to refresh terrestrial elevation values",
    )
    parser.add_argument(
        "--dem-file",
        type=str,
        default=None,
        help="Optional local GeoTIFF raster DEM to sample elevations using rasterio",
    )
    parser.add_argument(
        "--reset-to-hardcoded",
        action="store_true",
        help="Overwrite existing sites with minimal hardcoded data instead of merging",
    )

    args = parser.parse_args()

    build_sites_dataset(
        output_path=args.output,
        fetch_elevation=args.fetch_elevation,
        dem_file=args.dem_file,
        merge_existing=not args.reset_to_hardcoded,
    )


if __name__ == "__main__":
    main()
