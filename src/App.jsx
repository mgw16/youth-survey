import { useEffect, useState } from 'react'
import SurveyApp from './survey/SurveyApp.jsx'
import Dashboard from './dashboard/Dashboard.jsx'
import { WORKSHOP_NAME } from './config/surveys.js'
import { BRAND } from './config/brand.js'
import { isLive } from './lib/store.js'

function useHashRoute() {
  const [route, setRoute] = useState(() => window.location.hash.replace('#', '') || '/')
  useEffect(() => {
    const onChange = () => setRoute(window.location.hash.replace('#', '') || '/')
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

// Push the brand palette into CSS variables so brand.js controls the colours.
function useBrandPalette() {
  useEffect(() => {
    const p = BRAND.palette || {}
    const root = document.documentElement.style
    if (p.brand) root.setProperty('--eucalypt', p.brand)
    if (p.brandDeep) root.setProperty('--eucalypt-deep', p.brandDeep)
    if (p.accent) root.setProperty('--clay', p.accent)
  }, [])
}

function BrandMark() {
  const [broken, setBroken] = useState(false)
  if (broken || !BRAND.logoUrl) {
    return <span style={{ fontWeight: 700, fontSize: 17 }}>{BRAND.name}</span>
  }
  return (
    <img
      src={BRAND.logoUrl}
      alt={BRAND.name}
      style={{ height: 30, width: 'auto', display: 'block' }}
      onError={() => setBroken(true)}
    />
  )
}

export default function App() {
  const route = useHashRoute()
  useBrandPalette()
  const onDashboard = route.startsWith('/dashboard')

  return (
    <div className="shell">
      <div className="topbar">
        <div className="brand">
          <BrandMark />
          <span className="brand-sep" />
          <small className="muted">{onDashboard ? 'Facilitator dashboard' : WORKSHOP_NAME}</small>
        </div>
        <div className="muted mono" style={{ fontSize: 12 }}>{isLive ? 'LIVE' : 'DEMO MODE'}</div>
      </div>

      {onDashboard ? <Dashboard /> : <SurveyApp />}

      <div className="brandfoot">
        <span>{BRAND.values.join(' · ')}</span>
        <a href={BRAND.website} target="_blank" rel="noopener noreferrer">{BRAND.name}</a>
      </div>
    </div>
  )
}
