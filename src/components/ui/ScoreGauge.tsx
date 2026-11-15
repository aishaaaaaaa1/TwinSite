interface ScoreGaugeProps {
  score: number // 0–100
  size?: number
}

export function ScoreGauge({ score, size = 96 }: ScoreGaugeProps) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const clampedScore = Math.max(0, Math.min(100, score))
  const dashOffset = circumference * (1 - clampedScore / 100)

  const color =
    clampedScore >= 70
      ? '#22c55e'
      : clampedScore >= 40
      ? '#eab308'
      : '#ef4444'

  const label =
    clampedScore >= 70
      ? 'High'
      : clampedScore >= 40
      ? 'Medium'
      : 'Low'

  const cx = size / 2
  const cy = size / 2

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(59,142,255,0.1)"
          strokeWidth={8}
        />
        {/* Score arc */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.4s ease' }}
        />
        {/* Center text */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize={size > 80 ? 18 : 14}
          fontWeight="700"
          fontFamily="monospace"
        >
          {Math.round(clampedScore)}
        </text>
        <text
          x={cx}
          y={cy + (size > 80 ? 14 : 11)}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(148,163,184,0.8)"
          fontSize={size > 80 ? 9 : 7}
          fontWeight="500"
          letterSpacing="0.05em"
        >
          {label.toUpperCase()}
        </text>
      </svg>
      <span
        className="text-[10px] font-medium tracking-wide"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {label} Similarity
      </span>
    </div>
  )
}
