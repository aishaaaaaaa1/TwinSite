type PlanetKind = 'moon' | 'mars' | 'earth'
type BadgeSize = 'sm' | 'md' | 'lg'

interface PlanetBadgeProps {
  planet: PlanetKind
  size?: BadgeSize
}

const PLANET_CONFIG: Record<PlanetKind, { color: string; glow: string; label: string }> = {
  moon: {
    color: 'linear-gradient(135deg, #94a3b8 0%, #cbd5e1 50%, #64748b 100%)',
    glow: 'rgba(148,163,184,0.4)',
    label: 'Moon',
  },
  mars: {
    color: 'linear-gradient(135deg, #c2410c 0%, #f97316 50%, #9a3412 100%)',
    glow: 'rgba(249,115,22,0.4)',
    label: 'Mars',
  },
  earth: {
    color: 'linear-gradient(135deg, #1d4ed8 0%, #22c55e 50%, #0369a1 100%)',
    glow: 'rgba(34,197,94,0.4)',
    label: 'Earth',
  },
}

const SIZE_CONFIG: Record<BadgeSize, { dot: number; text: string; gap: string }> = {
  sm: { dot: 8, text: 'text-[10px]', gap: 'gap-1' },
  md: { dot: 12, text: 'text-xs', gap: 'gap-1.5' },
  lg: { dot: 18, text: 'text-sm', gap: 'gap-2' },
}

export function PlanetBadge({ planet, size = 'md' }: PlanetBadgeProps) {
  const cfg = PLANET_CONFIG[planet]
  const sz = SIZE_CONFIG[size]

  return (
    <div className={`inline-flex items-center ${sz.gap}`}>
      <span
        style={{
          display: 'inline-block',
          width: sz.dot,
          height: sz.dot,
          borderRadius: '50%',
          background: cfg.color,
          boxShadow: `0 0 ${sz.dot}px ${cfg.glow}`,
          flexShrink: 0,
        }}
      />
      <span
        className={`${sz.text} font-semibold tracking-wide`}
        style={{ color: 'var(--color-text-primary)' }}
      >
        {cfg.label}
      </span>
    </div>
  )
}
