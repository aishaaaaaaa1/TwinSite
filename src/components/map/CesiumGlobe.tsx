import { useEffect, useMemo, useRef } from 'react'
import {
  Cartesian2,
  Cartesian3,
  Color,
  Ellipsoid,
  EllipsoidGeodesic,
  EllipsoidTerrainProvider,
  PolygonHierarchy,
  Rectangle,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  UrlTemplateImageryProvider,
  WebMercatorTilingScheme,
  GeographicTilingScheme,
  Math as CesiumMath,
} from 'cesium'
import { CameraFlyTo, Entity, ImageryLayer, Viewer, useCesium } from 'resium'
import type { GeometryMode, Planet, PlanetaryRegion, RegionGeometry } from '@/types'
import type { LayerConfig } from '@/lib/layerConfig'
import { useAppStore } from '@/store/useAppStore'
import { createCircleRegion, createPolygonRegion } from '@/lib/regionSelection'
import 'cesium/Build/Cesium/Widgets/widgets.css'

const PLANET_RADII: Record<Planet, number> = {
  earth: 6_378_137,
  moon: 1_737_400,
  mars: 3_389_500,
}

function getEllipsoid(planet: Planet): Ellipsoid {
  if (planet === 'earth') return Ellipsoid.WGS84
  const radius = PLANET_RADII[planet]
  return new Ellipsoid(radius, radius, radius)
}

function getImageryProvider(
  url: string,
  attribution: string,
  planet: Planet,
  ellipsoid: Ellipsoid,
  maxNativeZoom: number,
) {
  return new UrlTemplateImageryProvider({
    url,
    credit: attribution,
    tilingScheme:
      planet === 'earth'
        ? new WebMercatorTilingScheme({ ellipsoid })
        : new GeographicTilingScheme({
            ellipsoid,
            numberOfLevelZeroTilesX: 2,
            numberOfLevelZeroTilesY: 1,
          }),
    rectangle: Rectangle.fromDegrees(-180, -90, 180, 90),
    minimumLevel: 0,
    maximumLevel: maxNativeZoom,
    tileWidth: 256,
    tileHeight: 256,
  })
}

function SelectionController({
  planet,
  geometryMode,
  selectedRegion,
  onRegionPick,
  onCursorMove,
}: {
  planet: Planet
  geometryMode: GeometryMode
  selectedRegion: PlanetaryRegion | null
  onRegionPick: (lat: number, lon: number, areaKm2: number, geometry: RegionGeometry) => void
  onCursorMove: (coordinates: { lat: number; lon: number } | null) => void
}) {
  const { viewer } = useCesium()
  const mapPicking = useAppStore((state) => state.mapPicking)
  const clicks = useRef<Array<{ lat: number; lon: number; position: Cartesian3 }>>([])
  const drawnEntities = useRef<string[]>([])

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas)
    const ellipsoid = viewer.scene.globe.ellipsoid

    const getPoint = (position: Cartesian2) => {
      const cartesian = viewer.camera.pickEllipsoid(position, ellipsoid)
      if (!cartesian) return null
      const cartographic = ellipsoid.cartesianToCartographic(cartesian)
      if (!cartographic) return null
      return {
        lat: CesiumMath.toDegrees(cartographic.latitude),
        lon: CesiumMath.toDegrees(cartographic.longitude),
        position: cartesian,
      }
    }

    const clearDrawing = () => {
      for (const id of drawnEntities.current) {
        viewer.entities.removeById(id)
      }
      drawnEntities.current = []
    }

    const finish = (
      points: typeof clicks.current,
      areaKm2: number,
      geometry: RegionGeometry,
    ) => {
      if (points.length === 0) return
      const lat = points.reduce((sum, point) => sum + point.lat, 0) / points.length
      const firstLongitude = points[0].lon
      const unwrappedLongitudes = points.map(({ lon }) =>
        firstLongitude + (((lon - firstLongitude + 540) % 360) - 180),
      )
      const meanLongitude = unwrappedLongitudes.reduce((sum, lon) => sum + lon, 0) / points.length
      const lon = ((meanLongitude + 540) % 360) - 180
      onRegionPick(lat, lon, areaKm2, geometry)
      clicks.current = []
    }

    handler.setInputAction(
      (event: { endPosition: Cartesian2 }) => {
        const point = getPoint(event.endPosition)
        onCursorMove(point ? { lat: point.lat, lon: point.lon } : null)
      },
      ScreenSpaceEventType.MOUSE_MOVE,
    )

    handler.setInputAction(
      (event: { position: Cartesian2 }) => {
        if (!mapPicking) return
        const point = getPoint(event.position)
        if (!point) return

        if (geometryMode === 'point') {
          clearDrawing()
          drawnEntities.current.push(
            viewer.entities
              .add({
                position: point.position,
                point: {
                  pixelSize: 12,
                  color: Color.ORANGE,
                  outlineColor: Color.WHITE,
                  outlineWidth: 2,
                },
              })
              .id,
          )
          finish([point], 25, { type: 'Point', coordinates: [point.lon, point.lat] })
          return
        }

        if (clicks.current.length === 0) clearDrawing()
        clicks.current.push(point)
        if (geometryMode === 'circle' && clicks.current.length === 2) {
          const [center, edge] = clicks.current
          const centerCartographic = ellipsoid.cartesianToCartographic(center.position)
          const edgeCartographic = ellipsoid.cartesianToCartographic(edge.position)
          if (!centerCartographic || !edgeCartographic) return
          const radius = new EllipsoidGeodesic(
            centerCartographic,
            edgeCartographic,
            ellipsoid,
          ).surfaceDistance
          if (radius <= 0) {
            clicks.current = []
            clearDrawing()
            return
          }
          clearDrawing()
          drawnEntities.current.push(
            viewer.entities
              .add({
                position: center.position,
                ellipse: {
                  semiMajorAxis: radius,
                  semiMinorAxis: radius,
                  height: 0,
                  material: Color.ORANGE.withAlpha(0.25),
                  outline: true,
                  outlineColor: Color.ORANGE,
                },
              })
              .id,
          )
          const circle = createCircleRegion(planet, center.lat, center.lon, radius / 1000)
          finish([center], (Math.PI * radius ** 2) / 1_000_000, circle.geometry)
          return
        }

        if (geometryMode === 'rectangle' && clicks.current.length === 2) {
          const [first, second] = clicks.current
          let west = Math.min(first.lon, second.lon)
          let east = Math.max(first.lon, second.lon)
          if (east - west > 180) [west, east] = [east, west]
          const longitudeWidth = east >= west ? east - west : east + 360 - west
          const south = Math.min(first.lat, second.lat)
          const north = Math.max(first.lat, second.lat)
          const kilometerPerDegree = (PLANET_RADII[planet] / 1000) * (Math.PI / 180)
          const areaKm2 = Math.max(
            0.01,
            Math.abs(longitudeWidth * kilometerPerDegree * Math.cos(CesiumMath.toRadians((north + south) / 2))) *
              Math.abs((north - south) * kilometerPerDegree),
          )
          clearDrawing()
          drawnEntities.current.push(
            viewer.entities
              .add({
                rectangle: {
                  coordinates: Rectangle.fromDegrees(west, south, east, north),
                  height: 0,
                  material: Color.CYAN.withAlpha(0.25),
                  outline: true,
                  outlineColor: Color.CYAN,
                },
              })
              .id,
          )
          const rectangle = createPolygonRegion(planet, [
            [west, south],
            [east, south],
            [east, north],
            [west, north],
          ])
          finish([first, second], areaKm2, rectangle.geometry)
          return
        }

        if (geometryMode === 'polygon') {
          const vertex = viewer.entities.add({
            position: point.position,
            point: {
              pixelSize: 8,
              color: Color.CYAN,
              outlineColor: Color.WHITE,
              outlineWidth: 1,
            },
          })
          drawnEntities.current.push(vertex.id)
        }
      },
      ScreenSpaceEventType.LEFT_CLICK,
    )

    handler.setInputAction(() => {
      if (!mapPicking || geometryMode !== 'polygon' || clicks.current.length < 3) return
      const points = [...clicks.current]
      const hierarchy = new PolygonHierarchy(points.map((point) => point.position))
      const polygon = viewer.entities.add({
        polygon: {
          hierarchy,
          perPositionHeight: true,
          material: Color.CYAN.withAlpha(0.25),
          outline: true,
          outlineColor: Color.CYAN,
        },
      })
      drawnEntities.current.push(polygon.id)
      const polygonData = createPolygonRegion(
        planet,
        points.map(({ lon, lat }): [number, number] => [lon, lat]),
      )
      finish(points, polygonData.areaKm2, polygonData.geometry)
    }, ScreenSpaceEventType.RIGHT_CLICK)

    return () => {
      handler.destroy()
      onCursorMove(null)
      clicks.current = []
    }
  }, [geometryMode, mapPicking, onCursorMove, onRegionPick, planet, viewer])

  if (!viewer || !selectedRegion || selectedRegion.planet !== planet) return null
  const polygonHierarchy = selectedRegion.geometry?.type === 'Polygon'
    ? new PolygonHierarchy(
        selectedRegion.geometry.coordinates[0]
          ?.slice(0, -1)
          .map(([longitude, latitude]) =>
            Cartesian3.fromDegrees(longitude, latitude, 0, viewer.scene.globe.ellipsoid),
          ) ?? [],
      )
    : null
  return (
    <>
      {polygonHierarchy && (
        <Entity
          key={`${selectedRegion.id}-area`}
          polygon={{
            hierarchy: polygonHierarchy,
            material: Color.CYAN.withAlpha(0.25),
            outline: true,
            outlineColor: Color.CYAN,
          }}
        />
      )}
      <Entity
        key={`${selectedRegion.id}-center`}
        position={Cartesian3.fromDegrees(
          selectedRegion.lon,
          selectedRegion.lat,
          0,
          viewer.scene.globe.ellipsoid,
        )}
        point={{
          pixelSize: 14,
          color: Color.ORANGE,
          outlineColor: Color.WHITE,
          outlineWidth: 2,
        }}
        description={`${selectedRegion.name} · ${selectedRegion.lat.toFixed(3)}°, ${selectedRegion.lon.toFixed(3)}°`}
      />
    </>
  )
}

export interface CesiumGlobeProps {
  planet: Planet
  layer: LayerConfig
  selectedRegion: PlanetaryRegion | null
  geometryMode: GeometryMode
  onRegionPick: (lat: number, lon: number, areaKm2: number, geometry: RegionGeometry) => void
  onCursorMove: (coordinates: { lat: number; lon: number } | null) => void
  cameraResetKey?: number
}

export function CesiumGlobe({
  planet,
  layer,
  selectedRegion,
  geometryMode,
  onRegionPick,
  onCursorMove,
  cameraResetKey = 0,
}: CesiumGlobeProps) {
  const ellipsoid = useMemo(() => getEllipsoid(planet), [planet])
  const terrainProvider = useMemo(
    () => new EllipsoidTerrainProvider({ ellipsoid }),
    [ellipsoid],
  )
  const provider = useMemo(
    () => getImageryProvider(
      layer.url,
      layer.attribution,
      planet,
      ellipsoid,
      layer.maxNativeZoom ?? (planet === 'earth' ? 8 : 9),
    ),
    [ellipsoid, layer.attribution, layer.maxNativeZoom, layer.url, planet],
  )
  const cameraHeight = PLANET_RADII[planet] * 1.35
  const flyDestination = selectedRegion?.planet === planet
    ? Cartesian3.fromDegrees(selectedRegion.lon, selectedRegion.lat, 250_000)
    : Cartesian3.fromDegrees(15, 20, cameraHeight, ellipsoid)

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden">
      <Viewer
        key={planet}
        full
        ellipsoid={ellipsoid}
        terrainProvider={terrainProvider}
        baseLayer={false}
        baseLayerPicker={false}
        animation={false}
        timeline={false}
        geocoder={false}
        homeButton={false}
        sceneModePicker={false}
        navigationHelpButton={false}
        selectionIndicator={false}
        infoBox={false}
        shouldAnimate
        requestRenderMode={false}
      >
        <ImageryLayer imageryProvider={provider} alpha={layer.opacity} />
        <CameraFlyTo
          key={`${planet}-${selectedRegion?.id ?? 'global'}-${cameraResetKey}`}
          destination={flyDestination}
          duration={1.6}
        />
        <SelectionController
          planet={planet}
          geometryMode={geometryMode}
          selectedRegion={selectedRegion}
          onRegionPick={onRegionPick}
          onCursorMove={onCursorMove}
        />
      </Viewer>
    </div>
  )
}
