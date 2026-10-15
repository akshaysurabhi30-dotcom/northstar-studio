import { useEffect, useState } from 'react'
import { PageLink } from './components/PageLink'
import { EstimatePage } from './pages/EstimatePage'
import { ExploreMapPage } from './pages/ExploreMapPage'
import { HelpPage } from './pages/HelpPage'
import { LearnPage } from './pages/LearnPage'
import { SettingsPage } from './pages/SettingsPage'
import { Icon } from './components/Icon'
import { BrandMark } from './components/BrandMark'
import { DocGuidePage } from './pages/DocGuidePage'

const navItems = [['/', 'Learn'], ['/estimate', 'Estimate'], ['/explore', 'Map'], ['/science', 'DOC science'], ['/help', 'Help'], ['/settings', 'Settings']] as const
const currentPath = () => window.location.hash.slice(1) || '/'

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [path, setPath] = useState(currentPath)
  useEffect(() => { const update = () => setPath(currentPath()); window.addEventListener('hashchange', update); return () => window.removeEventListener('hashchange', update) }, [])
  useEffect(() => {
    document.title = `${navItems.find(([route]) => route === path)?.[1] ?? 'Learn'} · ClearCurrent`
    setMenuOpen(false)
    window.scrollTo(0, 0)
  }, [path])
  const page = path === '/estimate' ? <EstimatePage /> : path === '/explore' ? <ExploreMapPage /> : path === '/science' ? <DocGuidePage /> : path === '/help' ? <HelpPage /> : path === '/settings' ? <SettingsPage /> : <LearnPage />
  return <>
    <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>Skip to content</a>
    <header className="site-header">
      <div className="header-inner">
        <PageLink className="brand" to="/"><BrandMark />ClearCurrent</PageLink>
        <button className="menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-controls="site-nav"><Icon name={menuOpen ? 'close' : 'menu'} />{menuOpen ? 'Close' : 'Menu'}</button>
        <nav id="site-nav" aria-label="Main" className={menuOpen ? 'open' : ''}>
          {navItems.map(([itemPath, label]) => <a key={itemPath} href={`#${itemPath}`} aria-current={path === itemPath ? 'page' : undefined} onClick={() => setMenuOpen(false)} className={path === itemPath ? 'active' : ''}>{label}</a>)}
        </nav>
      </div>
    </header>
    <div id="main-content" tabIndex={-1}>{page}</div>
    <footer className="site-footer"><PageLink className="footer-brand" to="/"><BrandMark small />ClearCurrent</PageLink><PageLink to="/help">Help & resources <span aria-hidden="true">↗</span></PageLink></footer>
  </>
}
