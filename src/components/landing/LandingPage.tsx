import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { useI18n } from '@/hooks/useI18n'
import type { Planet, MissionType } from '@/types'
import earthImage from '@/assets/earth.jpg'
import earthMoonImage from '@/assets/earth-moon.jpg'
import marsImage from '@/assets/mars.jpg'
import marsTerrainImage from '@/assets/mars-terrain.jpg'
import './LandingPage.css'

export function LandingPage() {
  const navigate = useNavigate()
  const { planet, missionType, setPlanet, applyPreset, setLang } = useAppStore()
  const { lang } = useI18n()

  const isFr = lang === 'fr'

  const handleLaunch = () => {
    navigate('/explorer')
  }

  return (
    <div
      className="min-h-screen w-full relative flex flex-col justify-between overflow-hidden text-white select-none"
      style={{
        backgroundColor: '#020408',
        backgroundImage: `
          radial-gradient(circle at 80% 25%, rgba(249, 115, 22, 0.12) 0%, transparent 45%),
          radial-gradient(circle at 20% 70%, rgba(26, 108, 246, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(15, 23, 42, 0.6) 0%, transparent 100%)
        `,
      }}
    >
      {/* Background Starfield Canvas/Dots */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 25px 35px, #fff, transparent 100%),
            radial-gradient(1.5px 1.5px at 120px 80px, #93c5fd, transparent 100%),
            radial-gradient(1px 1px at 240px 190px, #fff, transparent 100%),
            radial-gradient(2px 2px at 380px 290px, #fdba74, transparent 100%),
            radial-gradient(1px 1px at 520px 140px, #fff, transparent 100%),
            radial-gradient(1.5px 1.5px at 680px 320px, #cbd5e1, transparent 100%),
            radial-gradient(1px 1px at 840px 220px, #fff, transparent 100%),
            radial-gradient(2px 2px at 980px 90px, #93c5fd, transparent 100%),
            radial-gradient(1px 1px at 1120px 280px, #fff, transparent 100%),
            radial-gradient(1.5px 1.5px at 1260px 160px, #fdba74, transparent 100%)
          `,
          backgroundSize: '1300px 400px',
        }}
      />

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <svg width="36" height="36" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <circle cx="16" cy="16" r="4.5" fill="#1a6cf6" />
            <ellipse
              cx="16"
              cy="16"
              rx="14"
              ry="6"
              stroke="#1a6cf6"
              strokeWidth="1.5"
              fill="none"
              opacity="0.8"
            />
            <ellipse
              cx="16"
              cy="16"
              rx="8"
              ry="14"
              stroke="#3b8eff"
              strokeWidth="1.5"
              fill="none"
              opacity="0.6"
              transform="rotate(45 16 16)"
            />
            <circle cx="26" cy="11" r="2.5" fill="#f97316" />
          </svg>
          <div>
            <div className="text-base font-black tracking-[0.25em] leading-none text-white">
              TWINSITE
            </div>
            <div className="text-[10px] tracking-[0.16em] text-slate-400 uppercase mt-0.5 font-medium">
              Planetary Analogue Discovery
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* FR / EN language toggle */}
          <button
            onClick={() => setLang(isFr ? 'en' : 'fr')}
            className="px-3 py-1.5 rounded-full text-xs font-bold tracking-widest border border-slate-700 bg-slate-900/60 text-slate-200 hover:text-white hover:border-blue-500 transition-all cursor-pointer backdrop-blur"
          >
            {isFr ? 'EN' : 'FR'}
          </button>

          {/* Launch exploration button */}
          <button
            onClick={handleLaunch}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide bg-blue-600/20 border border-blue-500/40 text-blue-400 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all cursor-pointer backdrop-blur shadow-sm shadow-blue-500/10"
          >
            <span>{isFr ? 'Lancer exploration' : 'Launch exploration'}</span>
            <span className="text-sm">→</span>
          </button>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-between px-8 py-6 w-full max-w-7xl mx-auto gap-12">
        {/* Left Column: Bold text & CTA */}
        <div className="hero-copy flex-1 max-w-2xl text-left">
          <div className="inline-block text-xs font-semibold tracking-[0.25em] text-orange-400 uppercase mb-4 py-1 px-2.5 rounded bg-orange-500/10 border border-orange-500/20">
            {isFr ? 'LA TERRE EST LA PREMIÈRE MISSION' : 'EARTH IS THE FIRST MISSION'}
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05] text-white uppercase mb-6">
            {isFr ? (
              <>
                LE PROCHAIN MONDE
                <br />
                COMMENCE
                <br />
                <span className="text-[#f97316] drop-shadow-[0_0_35px_rgba(249,115,22,0.45)]">
                  ICI.
                </span>
              </>
            ) : (
              <>
                THE NEXT WORLD
                <br />
                STARTS
                <br />
                <span className="text-[#f97316] drop-shadow-[0_0_35px_rgba(249,115,22,0.45)]">
                  HERE.
                </span>
              </>
            )}
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-xl mb-8 font-light">
            {isFr
              ? "Associez les régions lunaires et martiennes aux environnements terrestres les plus similaires grâce à l'analyse géomorphologique multi-critères et au classement par intelligence artificielle."
              : 'Match lunar and Martian regions to the most similar environments on Earth using terrain analysis and AI-powered ranking for rover testing, habitat planning, and mission training.'}
          </p>

          <button
            onClick={handleLaunch}
            className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl text-base font-bold tracking-wide text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transform hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            <span>{isFr ? 'Trouver mon terrain analogue' : 'Find my analogue terrain'}</span>
            <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>

        {/* Right Column: Decorative Planetary Visualizer */}
          <div className="planetary-visual">
            <div className="planet-earth" aria-hidden="true">
              <img src={earthImage} alt="" />
            </div>

            <svg
              className="planetary-orbits"
              viewBox="0 0 900 760"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M246 155 C 360 112, 468 210, 561 422" />
              <path d="M777 157 C 710 271, 659 348, 561 422" />
              <circle cx="561" cy="422" r="10" />
              <circle cx="246" cy="155" r="6" />
              <circle cx="777" cy="157" r="6" />
            </svg>

            <button
              type="button"
              className={`planet-marker moon-marker ${planet === 'moon' ? 'is-selected' : ''}`}
              onClick={() => setPlanet('moon')}
              aria-label={isFr ? 'Choisir la Lune' : 'Select the Moon'}
              aria-pressed={planet === 'moon'}
            >
              <span className="moon-photo" style={{ backgroundImage: `url(${earthMoonImage})` }} />
              <span className="planet-label">LUNE</span>
            </button>

            <button
              type="button"
              className={`planet-marker mars-marker ${planet === 'mars' ? 'is-selected' : ''}`}
              onClick={() => setPlanet('mars')}
              aria-label={isFr ? 'Choisir Mars' : 'Select Mars'}
              aria-pressed={planet === 'mars'}
            >
              <span
                className="mars-photo"
                style={{ backgroundImage: `url(${marsImage})` }}
                aria-hidden="true"
              />
              <span className="planet-label">MARS</span>
            </button>

            <div className="terrain-preview">
              <div className="terrain-preview-heading">
                <span className="status-dot" />
                {isFr ? 'Terrain analogue à explorer' : 'Analogue terrain to explore'}
              </div>
              <img
                src={marsTerrainImage}
                alt={isFr ? 'Panorama du terrain rocheux martien' : 'Panorama of rocky Martian terrain'}
              />
              <div className="terrain-preview-footer">
                <span>{isFr ? 'Analyses de terrain à comparer' : 'Terrain analyses to compare'}</span>
                <span aria-hidden="true">→</span>
              </div>
            </div>
            <span className="image-credit">IMAGES : NASA</span>
          </div>
      </main>

      {/* Bottom Control Bar */}
      <footer className="relative z-10 w-full px-6 py-4 bg-slate-950/80 border-t border-slate-800/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-8">
            {/* 01 / Choose target */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-medium tracking-wider text-slate-400 uppercase">
                {isFr ? '01 / Choisir la cible' : '01 / Choose target'}
              </span>
              <div className="flex items-center bg-slate-900/90 rounded-lg p-1 border border-slate-800">
                {(['moon', 'mars'] as Planet[]).map((p) => {
                  const active = planet === p
                  return (
                    <button
                      key={p}
                      onClick={() => setPlanet(p)}
                      className={`px-4 py-1.5 rounded-md text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                        active
                          ? 'bg-[#f97316] text-white shadow-md shadow-orange-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 02 / Define mission */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-medium tracking-wider text-slate-400 uppercase">
                {isFr ? '02 / Définir la mission' : '02 / Define mission'}
              </span>
              <div className="flex items-center bg-slate-900/90 rounded-lg p-1 border border-slate-800">
                {(['rover', 'base', 'exploration'] as MissionType[]).map((m) => {
                  const active = missionType === m
                  return (
                    <button
                      key={m}
                      onClick={() => applyPreset(m)}
                      className={`px-4 py-1.5 rounded-md text-xs font-bold tracking-wider capitalize transition-all cursor-pointer ${
                        active
                          ? 'bg-[#f97316] text-white shadow-md shadow-orange-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <button
            onClick={handleLaunch}
            className="flex items-center gap-2 text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors uppercase tracking-wider cursor-pointer"
          >
            <span>{isFr ? "Accéder à l'espace mission" : 'Open Mission Workspace'}</span>
            <span>→</span>
          </button>
        </div>
      </footer>
    </div>
  )
}
