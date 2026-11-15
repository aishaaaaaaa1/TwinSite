import type { ReactNode } from 'react'

interface AppLayoutProps {
  leftPanel: ReactNode
  centerPanel: ReactNode
  rightPanel: ReactNode
}

export function AppLayout({ leftPanel, centerPanel, rightPanel }: AppLayoutProps) {
  return (
    <div className="flex w-full min-w-0 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
      <aside
        className="w-[220px] min-w-[220px] shrink-0 overflow-y-auto p-2 xl:w-[280px] xl:min-w-[280px] xl:p-3"
        style={{
          background: 'var(--color-panel)',
          backdropFilter: 'blur(12px)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {leftPanel}
      </aside>

      <main className="min-w-0 flex-1 relative overflow-hidden">
        {centerPanel}
      </main>

      <aside
        className="w-[240px] min-w-[240px] shrink-0 overflow-y-auto p-2 xl:w-[320px] xl:min-w-[320px] xl:p-3"
        style={{
          background: 'var(--color-panel)',
          backdropFilter: 'blur(12px)',
          borderLeft: '1px solid var(--color-border)',
        }}
      >
        {rightPanel}
      </aside>
    </div>
  )
}
