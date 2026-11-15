import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Map, Plus } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { fetchPlanetImage } from '@/lib/nasaImagery'
import type { Planet, PlanetaryRegion, EarthSite } from '@/types'

export interface GlobeViewProps {
  planet: Planet
  regions: PlanetaryRegion[]
  earthSites: EarthSite[]
  selectedRegion: PlanetaryRegion | null
  onRegionSelect: (region: PlanetaryRegion) => void
}

export function GlobeView({ planet, regions, selectedRegion, onRegionSelect }: GlobeViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const setViewMode = useAppStore((state) => state.setViewMode)
  const [dimensions, setDimensions] = useState({ width: 600, height: 600 })
  const [imageStatus, setImageStatus] = useState({ planet, title: '', error: '' })
  const imageTitle = imageStatus.planet === planet ? imageStatus.title : ''
  const imageError = imageStatus.planet === planet ? imageStatus.error : ''

  useEffect(() => {
    const controller = new AbortController()
    imageRef.current = null

    fetchPlanetImage(planet, controller.signal)
      .then((image) => {
        const texture = new Image()
        texture.onload = () => {
          imageRef.current = texture
          setImageStatus({ planet, title: image.title, error: '' })
        }
        texture.onerror = () => {
          setImageStatus({
            planet,
            title: '',
            error: 'The NASA image could not be displayed. Use the NASA surface map instead.',
          })
        }
        texture.src = image.url
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setImageStatus({
          planet,
          title: '',
          error: error instanceof Error ? error.message : String(error),
        })
      })

    return () => controller.abort()
  }, [planet])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      canvas.width = Math.round(bounds.width * ratio)
      canvas.height = Math.round(bounds.height * ratio)
      setDimensions({ width: bounds.width, height: bounds.height })
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const ratio = window.devicePixelRatio || 1
    const width = canvas.width
    const height = canvas.height
    const cx = width / 2
    const cy = height / 2
    const radius = Math.min(width, height) * 0.38 * ratio

    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = '#020408'
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = 'rgba(255,255,255,0.42)'
    for (let index = 0; index < 70; index += 1) {
      const x = (index * 137.5 * ratio) % width
      const y = (index * 249.7 * ratio) % height
      ctx.fillRect(x, y, 1.2 * ratio, 1.2 * ratio)
    }

    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.clip()
    const texture = imageRef.current
    if (texture) {
      ctx.drawImage(texture, cx - radius, cy - radius, radius * 2, radius * 2)
    } else {
      const surface = ctx.createRadialGradient(
        cx - radius * 0.35,
        cy - radius * 0.35,
        radius * 0.05,
        cx,
        cy,
        radius,
      )
      if (planet === 'mars') {
        surface.addColorStop(0, '#f97316')
        surface.addColorStop(0.55, '#b4532b')
        surface.addColorStop(1, '#2c0c04')
      } else {
        surface.addColorStop(0, '#d6d3d1')
        surface.addColorStop(0.6, '#737373')
        surface.addColorStop(1, '#171717')
      }
      ctx.fillStyle = surface
      ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)
    }

    const shading = ctx.createRadialGradient(
      cx - radius * 0.2,
      cy - radius * 0.2,
      radius * 0.1,
      cx + radius * 0.25,
      cy + radius * 0.15,
      radius * 1.2,
    )
    shading.addColorStop(0, 'rgba(255,255,255,0.08)')
    shading.addColorStop(0.55, 'rgba(0,0,0,0)')
    shading.addColorStop(1, 'rgba(0,0,0,0.85)')
    ctx.fillStyle = shading
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2)
    ctx.restore()

    ctx.beginPath()
    ctx.arc(cx, cy, radius + 3 * ratio, 0, Math.PI * 2)
    ctx.strokeStyle = planet === 'mars' ? 'rgba(249,115,22,0.55)' : 'rgba(203,213,225,0.5)'
    ctx.lineWidth = 3 * ratio
    ctx.stroke()
  }, [dimensions, planet, imageTitle])

  const radius = Math.min(dimensions.width, dimensions.height) * 0.38

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#020408]">
      <canvas ref={canvasRef} className="block h-full w-full" />

      <div className="absolute left-4 top-4 z-10 rounded-lg border border-slate-700 bg-slate-900/85 px-3 py-1.5 text-xs backdrop-blur">
        <span className="block text-[10px] uppercase text-slate-400">NASA planetary imagery</span>
        <span className="font-bold capitalize text-white">{planet}</span>
      </div>

      <div className="absolute right-4 top-4 z-10 flex flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-900/90 shadow-lg">
        <button
          type="button"
          onClick={() => setViewMode('2d')}
          className="border-b border-slate-700 p-2 text-slate-200 hover:bg-slate-800"
          aria-label="Zoom to NASA surface map"
          title="Open detailed NASA surface map"
        >
          <Plus size={18} />
        </button>
        <button
          type="button"
          onClick={() => setViewMode('2d')}
          className="p-2 text-slate-200 hover:bg-slate-800"
          aria-label="Open 2D NASA map"
          title="Open 2D NASA map"
        >
          <Map size={17} />
        </button>
      </div>

      {regions.map((region) => {
        const lat = (region.lat * Math.PI) / 180
        const lon = (region.lon * Math.PI) / 180
        const depth = Math.cos(lat) * Math.cos(lon)
        if (depth <= 0) return null

        const x = dimensions.width / 2 + radius * Math.cos(lat) * Math.sin(lon)
        const y = dimensions.height / 2 - radius * Math.sin(lat)
        const selected = selectedRegion?.id === region.id

        return (
          <button
            type="button"
            key={region.id}
            onClick={() => onRegionSelect(region)}
            className="group absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: x, top: y }}
            aria-label={`Select ${region.name}`}
          >
            <span
              className={`block h-3.5 w-3.5 rounded-full border-2 ${
                selected
                  ? 'border-white bg-blue-500 shadow-[0_0_12px_#3b82f6]'
                  : 'border-slate-950 bg-orange-500'
              }`}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-950/90 px-2 py-1 text-[10px] text-white group-hover:block">
              {region.name}
            </span>
          </button>
        )
      })}

      <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between gap-3">
        <div className="min-w-0 text-[10px] text-slate-300">
          {imageError ? (
            <span className="flex items-center gap-1 text-amber-300">
              <AlertTriangle size={12} />
              {imageError}
            </span>
          ) : imageTitle ? (
            <span className="truncate">NASA Image Library · {imageTitle}</span>
          ) : (
            <span>Loading real imagery from NASA...</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setViewMode('2d')}
          className="shrink-0 rounded-lg border border-blue-400/50 bg-blue-600/90 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
        >
          Open 2D map
        </button>
      </div>
    </div>
  )
}
