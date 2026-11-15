import type { CSSProperties } from 'react'

interface WeightSliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}

const sliderStyles = `
.weight-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}
.weight-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #1a6cf6;
  cursor: pointer;
  border: 2px solid #3b8eff;
  box-shadow: 0 0 6px rgba(26,108,246,0.5);
  transition: box-shadow 0.15s ease;
}
.weight-slider::-webkit-slider-thumb:hover {
  box-shadow: 0 0 10px rgba(26,108,246,0.8);
}
.weight-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #1a6cf6;
  cursor: pointer;
  border: 2px solid #3b8eff;
  box-shadow: 0 0 6px rgba(26,108,246,0.5);
}
`

let stylesInjected = false
function injectStyles() {
  if (stylesInjected || typeof document === 'undefined') return
  stylesInjected = true
  const el = document.createElement('style')
  el.textContent = sliderStyles
  document.head.appendChild(el)
}

export function WeightSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
}: WeightSliderProps) {
  injectStyles()

  const pct = Math.round(value * 100)
  const fillPct = ((value - min) / (max - min)) * 100

  const trackStyle: CSSProperties = {
    background: `linear-gradient(to right, #1a6cf6 ${fillPct}%, rgba(59,142,255,0.15) ${fillPct}%)`,
  }

  return (
    <div className="flex flex-col gap-1 mb-2">
      <div className="flex items-center justify-between">
        <label
          className="text-xs"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {label}
        </label>
        <span
          className="text-xs font-mono font-semibold"
          style={{ color: '#1a6cf6' }}
        >
          {pct}%
        </span>
      </div>
      <input
        type="range"
        className="weight-slider"
        style={trackStyle}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  )
}
