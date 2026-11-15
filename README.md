# TwinSite — NASA Space Apps Planetary Analogue Discovery Platform

> **Exploring Lunar and Martian Regions and comparing them with terrestrial analogue candidates.**

[![NASA Space Apps Challenge](https://img.shields.io/badge/NASA-Space_Apps_Challenge-0B3D91?style=for-the-badge&logo=nasa&logoColor=white)](https://www.spaceappschallenge.org/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)

---

## 1. Project Overview

Before landing rovers or astronauts on the Moon or Mars, aerospace agencies test hardware, autonomy algorithms, drilling assemblies, and mission architectures in Earth analogues. However, planetary scientists currently choose analogue sites using fragmented publications and subjective intuition.

**TwinSite** is a planetary exploration prototype developed for the NASA Space Apps Challenge. Its three views let users inspect Earth, the Moon, or Mars in a Cesium globe, select a region, and explore terrestrial analogue candidates. The discovery view ranks candidates with weighted feature comparisons and optional MMR diversity selection; it also provides a PDF report.

> **Scientific data status:** TwinSite opens in DEMO mode with illustrative catalogue values. The code includes a NASA terrain retrieval path, but it is not exposed in the current page. Existing DEM products have different spatial resolutions and reference datums, so altitude-only scores are exploratory proxies—not validated terrain-similarity findings. NASA Trek/GIBS map tiles remain imagery only.

DEMO mode uses the bundled example catalogue and is not scientific. It ranks candidates using illustrative values and labels estimates for custom point/area selections.

---

## 2. NASA Space Apps Challenge Context

Testing surface mobility systems (e.g. VIPER, CADRE, Mars 2020 Perseverance) requires matching specific physical properties:
- **Rover Mobility & Wheel Sinkage:** Requires matching slope distributions, micro-relief, and surface roughness.
- **ISRU & Subsurface Drills:** Requires matching hyper-arid mineralogy, permafrost polygons, or basaltic cinder cones.
- **Habitat Construction & Solar Arrays:** Requires matching solar illumination patterns, extreme temperature swings, and wind-blown dust dynamics.

TwinSite provides scientific tools that bridge orbital remote sensing data from planetary missions with terrestrial in-situ test facilities.

---

## 3. Technology Stack

- **Core Framework:** [React 19](https://react.dev/) & [Vite 8](https://vite.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict mode, `verbatimModuleSyntax`)
- **Styling & Design Tokens:** [Tailwind CSS v4](https://tailwindcss.com/) with aerospace deep-space theme (`#020408`, glassmorphism, glowing status accents)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand) with [Immer](https://immerjs.github.io/immer/)
- **Data Visualization:** [Recharts](https://recharts.org/) (Multi-axis Radar charts, distribution histograms)
- **Mapping:** [CesiumJS](https://cesium.com/platform/cesiumjs/) & [Resium](https://resium.reearth.io/) for planetary ellipsoid globes, plus [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/) for 2D NASA imagery maps
- **Document Generation:** [jsPDF](https://github.com/parallax/jsPDF) & [html2canvas](https://html2canvas.hertzen.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Testing:** [Vitest](https://vitest.dev/) & React Testing Library

---

## 4. Algorithmic Architecture

### 4.1. Feature Extraction & Z-Score Normalization
Each target region and terrestrial site is evaluated along 7 continuous numerical features:
- **$\text{elevation\_mean}$:** Mean elevation (meters above datum)
- **$\text{relief\_std}$:** Topographic relief standard deviation (meters)
- **$\text{slope\_mean}$:** Mean surface slope (degrees)
- **$\text{slope\_p90}$:** 90th percentile slope steepness (degrees)
- **$\text{roughness}$:** Surface roughness index
- **$\text{temp\_mean}$:** Mean ambient surface temperature (°C)
- **$\text{aridity}$:** Aridity index ($0.0 = \text{wet}$, $1.0 = \text{hyper-arid}$)

The current NASA-backed analysis does **not** populate all seven features: it samples one elevation per point and ranks analogues by elevation only. The broader seven-feature scoring model is currently available only for illustrative DEMO data.

Because features operate on divergent scales, values are normalized using population $z$-scores across the global terrestrial dataset:
$$z_i = \frac{x_i - \mu_i}{\sigma_i}$$

### 4.2. Weighted Gaussian Distance & Similarity Score
Given user-defined or mission-preset weights $w_i \in [0, 1]$ (where $\sum w_i = 1$):
$$d_w^2 = \sum_{i=1}^{7} w_i \cdot \left( z_{\text{target}, i} - z_{\text{earth}, i} \right)^2$$

The non-linear similarity score $S \in [0, 100]$ is computed via a Gaussian radial basis function with scaling factor $\sigma = 1.5$:
$$\text{Score} = \exp\left( -\frac{d_w^2}{2\sigma^2} \right) \times 100$$

The individual dissimilarity contribution of each feature is preserved:
$$c_i = w_i \cdot \left( z_{\text{target}, i} - z_{\text{earth}, i} \right)^2$$
Higher $c_i$ denotes the primary parameter where the analogue deviates from the planetary target.

### 4.3. Maximal Marginal Relevance (MMR) Diversity Selection
When fielding a suite of $N$ test sites, selecting solely the top-ranked candidates often yields geographic and geomorphological redundancy (e.g. multiple adjacent desert basins). TwinSite incorporates Maximal Marginal Relevance parameterized by diversity coefficient $\lambda \in [0, 1]$:
$$\text{MMR}(S) = \underset{d_i \in R \setminus S}{\operatorname{argmax}} \left[ \lambda \cdot \text{Sim}(d_i, q) - (1 - \lambda) \max_{d_j \in S} \text{Sim}(d_i, d_j) \right]$$
- $\lambda = 1.0$: Pure similarity ranking.
- $\lambda = 0.5$: Balanced trade-off between target fidelity and candidate diversity.

### 4.4. K-Means Terrain Coverage
To ensure a campaign tests hardware across every terrain regime present on the target body, an unsupervised $k$-means clustering ($k=6$) partitions the planetary region feature space. The selected Earth analogues are mapped to their nearest centroid. Any unmapped cluster is flagged with a **Missing** status badge to indicate an unrepresented morphological regime.

### 4.5. Monte Carlo Confidence & Rank Stability
To prevent overfitting to noisy sensor data or arbitrary weights, a 500-iteration Monte Carlo engine runs in real time:
- Weights are perturbed stochastically: $w_i' = w_i \cdot (1 + \delta_w), \quad \delta_w \sim \mathcal{U}(-0.20, +0.20)$
- Site features undergo Gaussian perturbation with $\sigma_{\text{noise}} = 0.05$.
- Output: 90% score confidence intervals $[S_{10}, S_{90}]$ and rank stability percentage (probability of remaining within $\pm 2$ ranks of the nominal ranking).

### 4.6. Scientific Ground-Truth Validation
The scoring model is continually benchmarked against a curated catalog of peer-reviewed historical analogue pairings (e.g. Atacama Desert $\leftrightarrow$ Mars, Haughton Crater $\leftrightarrow$ Moon/Mars, Mauna Kea $\leftrightarrow$ Lunar Basalts). TwinSite computes:
$$\text{Recall@1}, \quad \text{Recall@3}, \quad \text{Recall@5}, \quad \text{Mean Rank}$$

---

## 5. Scientific Data Sources

| Provider | Dataset | Spatial Resolution | Coverage & Scientific Limitations |
| :--- | :--- | :--- | :--- |
| **NASA PDS** | MOLA MEGDR (`MEGT90N000CB`) | 4 px/deg (~14.8 km/px at equator) | The currently sampled product is coarse; NASA Trek map tiles are not sampled |
| **NASA PDS** | LOLA LDEM (`LDEM_4`) | 4 px/deg (~7.6 km/px at equator) | The currently sampled product is coarse; NASA Trek map tiles are not sampled |
| **NASA Earthdata / LP DAAC** | NASADEM_HGT | 1 arc-second (~30 m) | Authenticated granule downloads; current comparison samples one point per analogue |
| **NASA POWER API** | Surface Meteorology & Solar Flux | 0.5° × 0.5° grid | Multi-decadal climatology (1984–present); interpolated over rugged mountains |
| **NASA GIBS WMTS** | MERRA-2 2 m Air Temperature (monthly) | Google Maps Compatible Level 6 | Color-mapped Earth weather visualization; not point-value data or a local forecast |
| **Copernicus / Open-Meteo** | Copernicus GLO-30 / GLO-90 DEM | 30 m – 90 m | Global Earth surface model; radar speckle artifacts in dense vegetation |
| **ESA CCI Soil Moisture** | ESA Climate Change Initiative | 1 km | Terrestrial aridity index baseline |
| **NASA GIBS WMTS** | MODIS / VIIRS Surface Imagery | 250 m – 500 m daily | Daily optical true-color composites and Blue Marble bathymetry |

---

## 6. Known Scientific Limitations of Terrestrial Analogues

While terrestrial sites provide invaluable engineering testbeds, planetary analogue fidelity breaks down along 4 fundamental environmental axes:

1. **Gravity Disparity:**
   - Earth: $9.81\text{ m/s}^2$
   - Moon: $1.62\text{ m/s}^2$ (16.5% of Earth)
   - Mars: $3.71\text{ m/s}^2$ (37.8% of Earth)
   - *Impact:* Lower gravity significantly alters wheel sinkage, traction, chassis rollover thresholds, and soil shearing.
2. **Atmospheric Pressure & Composition:**
   - Earth: $101.3\text{ kPa}$ ($\text{N}_2 / \text{O}_2$) with active convective heat transfer.
   - Moon: Hard vacuum ($< 10^{-12}\text{ bar}$).
   - Mars: $0.6\text{ kPa}$ (95% $\text{CO}_2$), near the Armstrong limit.
   - *Impact:* Parachute dynamics, aerodynamic lift, and convective cooling cannot be tested simultaneously at 1 atm without pressure chambers.
3. **Radiation Flux:**
   - Without a global dipolar magnetosphere or thick ozone layer, lunar and Martian surfaces receive unattenuated Galactic Cosmic Rays (GCR) and Solar Particle Events (SPE).
   - *Impact:* Terrestrial testing cannot replicate cumulative electronic single-event upsets (SEUs) or bio-dosimetry.
4. **Regolith Tribology & Chemistry:**
   - Martian regolith contains 0.5–1.0 wt% toxic, oxidizing perchlorates ($\text{ClO}_4^-$) and fine suspended dust.
   - Lunar regolith consists of jagged, electrostatically charged, impact-melt glass shards with extreme abrasive wear on seals and rover joints.

---

## 7. Python Data Pipeline (`scripts/build_sites.py`)

TwinSite includes a Python data pipeline to generate, enrich, and validate the candidate catalogue (`public/data/sites.json`):

```bash
# View all CLI options
py scripts/build_sites.py --help

# Rebuild dataset and validate consistency
py scripts/build_sites.py

# Query live Open-Meteo API to refresh terrestrial elevations
py scripts/build_sites.py --fetch-elevation

# Sample local GeoTIFF DEM raster using rasterio
py scripts/build_sites.py --dem-file path/to/copernicus_dem.tif
```

The script includes built-in fallback data for 5 major Earth sites, 3 Moon regions, and 3 Mars regions, while seamlessly merging with the comprehensive 40-site dataset.

---

## 8. Installation & Deployment

### Prerequisites
- Node.js 20+
- pnpm 9+
- Python 3.10+ (for data pipeline scripts)

### Local Development Setup
```bash
# Clone the repository
git clone https://github.com/nasa-spaceapps/twinsite.git
cd twinsite

# Install dependencies
pnpm install

# Start local development server
pnpm dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Run Tests & Typecheck
```bash
# Verify TypeScript strict compilation
npx tsc --noEmit

# Run unit tests with Vitest
pnpm test
```

The Earthdata proxy is a Vercel serverless function in `api/nasadem/[granule].ts`; local Vite development uses the same server-side handler. Other deployment platforms need an equivalent same-origin server-side proxy.

### Production Build
```bash
pnpm build
```

### Deployment to Vercel
TwinSite is configured for zero-configuration deployment to [Vercel](https://vercel.com/):
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy production release
vercel --prod
```

---

## 9. License & NASA Space Apps Acknowledgments

Created for the **NASA International Space Apps Challenge**.
Dedicated to the planetary science community, the Artemis generation, and future explorers of the Moon and Mars.

Released under the **MIT License**.
"# TwinSite" 
