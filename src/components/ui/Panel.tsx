import { useState, useRef, useEffect, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ChevronDown } from 'lucide-react'
import { useI18n } from '@/hooks/useI18n'

interface PanelProps {
  title?: string
  titleKey?: string
  icon?: LucideIcon
  defaultOpen?: boolean
  children: ReactNode
}

export function Panel({ title, titleKey, icon: Icon, defaultOpen = true, children }: PanelProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(defaultOpen)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [maxHeight, setMaxHeight] = useState<string>(defaultOpen ? '2000px' : '0px')

  const displayTitle = titleKey ? t(titleKey) : title ?? ''

  useEffect(() => {
    if (!bodyRef.current) return
    if (open) {
      setMaxHeight(bodyRef.current.scrollHeight + 'px')
      // After animation, allow free growth
      const timer = setTimeout(() => setMaxHeight('2000px'), 300)
      return () => clearTimeout(timer)
    } else {
      // Snapshot current height then animate to 0
      setMaxHeight(bodyRef.current.scrollHeight + 'px')
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setMaxHeight('0px'))
      })
    }
  }, [open])

  return (
    <div
      className="rounded-lg mb-2 overflow-hidden"
      style={{ border: '1px solid var(--color-border)', background: 'var(--color-panel-hover)' }}
    >
      <button
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/5"
        onClick={() => setOpen((v) => !v)}
      >
        {Icon && (
          <Icon size={14} style={{ color: '#1a6cf6', flexShrink: 0 }} />
        )}
        <span
          className="flex-1 text-xs font-semibold tracking-wide uppercase"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {displayTitle}
        </span>
        <ChevronDown
          size={14}
          style={{
            color: 'var(--color-text-secondary)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s ease',
            flexShrink: 0,
          }}
        />
      </button>

      <div
        ref={bodyRef}
        style={{
          maxHeight,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        <div className="px-3 pb-3">
          {children}
        </div>
      </div>
    </div>
  )
}
