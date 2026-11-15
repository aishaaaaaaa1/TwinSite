import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { LandingPage } from '@/components/landing/LandingPage'
import { MissionWorkspace } from '@/components/workspace/MissionWorkspace'

const PlanetaryExplorerPage = lazy(() =>
  import('@/components/workspace/PlanetaryExplorerPage').then((module) => ({
    default: module.PlanetaryExplorerPage,
  })),
)

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/explorer"
        element={(
          <Suspense fallback={<div className="min-h-screen bg-[#020408]" />}>
            <PlanetaryExplorerPage />
          </Suspense>
        )}
      />
      <Route path="/discovery" element={<MissionWorkspace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
