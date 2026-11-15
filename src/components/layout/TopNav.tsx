import { useNavigate, useLocation } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useI18n } from '@/hooks/useI18n'

const NAV_TABS = [
  { key: 'home', label: 'Home', path: '/' },
  { key: 'explorer', label: 'Planetary Explorer', path: '/explorer' },
  { key: 'discovery', label: 'Analogue Discovery', path: '/discovery' },
  { key: 'report', label: 'Scientific Report', path: '/discovery?tab=report' },
]

function Logo() {
  return (
    <div className="flex items-center gap-2 mr-6 shrink-0">
      {/* Orbit icon */}
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <circle cx="16" cy="16" r="4" fill="#1a6cf6" />
        <ellipse cx="16" cy="16" rx="14" ry="6" stroke="#1a6cf6" strokeWidth="1.5" fill="none" opacity="0.7" />
        <ellipse cx="16" cy="16" rx="8" ry="14" stroke="#3b8eff" strokeWidth="1.5" fill="none" opacity="0.5" transform="rotate(45 16 16)" />
        <circle cx="26" cy="11" r="2.5" fill="#f97316" />
      </svg>
      <div>
        <div
          className="text-sm font-black tracking-[0.2em] leading-none"
          style={{ color: 'var(--color-text-primary)' }}
        >
          TWINSITE
        </div>
        <div
          className="text-[9px] tracking-[0.12em] leading-none mt-0.5 uppercase"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Planetary Analogue Discovery
        </div>
      </div>
    </div>
  )
}

function NavTabs() {
  const navigate = useNavigate()
  const location = useLocation()
  const setActiveTab = useAppStore((s) => s.setActiveTab)

  const handleTab = (tab: typeof NAV_TABS[number]) => {
    setActiveTab(tab.key)
    navigate(tab.path)
  }

  const isActive = (tab: typeof NAV_TABS[number]) => {
    if (tab.key === 'home') return location.pathname === '/'
    if (tab.key === 'explorer') return location.pathname === '/explorer'
    if (tab.key === 'discovery') {
      return location.pathname === '/discovery' && !location.search
    }
    return location.pathname === '/discovery' && new URLSearchParams(location.search).get('tab') === 'report'
  }

  return (
    <nav className="flex min-w-0 items-center gap-1 flex-1 justify-center overflow-x-auto">
      {NAV_TABS.map((tab) => {
        const active = isActive(tab)
        return (
          <button
            key={tab.key}
            onClick={() => handleTab(tab)}
            className={[
              'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap',
              active
                ? 'text-white'
                : 'hover:text-white',
            ].join(' ')}
            style={
              active
                ? { background: '#1a6cf6', color: '#fff' }
                : { color: 'var(--color-text-secondary)' }
            }
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}

function StatusAndSettings() {
  const { lang } = useI18n()
  const setLang = useAppStore((s) => s.setLang)

  return (
    <div className="flex items-center gap-3 shrink-0">
      {/* Status pill */}
      <div
        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border"
        style={{
          color: '#22c55e',
          borderColor: 'rgba(34,197,94,0.3)',
          background: 'rgba(34,197,94,0.08)',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        System Status: Ready
      </div>

      {/* Settings icon */}
      <button
        className="p-1.5 rounded-lg transition-colors duration-150 hover:bg-white/10"
        style={{ color: 'var(--color-text-secondary)' }}
        aria-label="Settings"
      >
        <Settings size={16} />
      </button>

      {/* Language toggle */}
      <button
        onClick={() => setLang(lang === 'en' ? 'fr' : 'en')}
        className="px-2.5 py-1 rounded-full text-xs font-bold tracking-widest border transition-all duration-200 hover:border-[#1a6cf6]"
        style={{
          color: 'var(--color-text-primary)',
          borderColor: 'var(--color-border)',
        }}
      >
        {lang === 'en' ? 'FR' : 'EN'}
      </button>
    </div>
  )
}

export function TopNav() {
  return (
    <nav
      className="sticky top-0 z-50 h-14 flex min-w-0 items-center gap-2 px-4"
      style={{
        background: 'rgba(4,13,26,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      <Logo />
      <NavTabs />
      <StatusAndSettings />
    </nav>
  )
}
