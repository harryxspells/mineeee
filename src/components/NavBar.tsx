import { useEffect, useState } from 'react'
import { Heart, Menu, SlidersHorizontal, X } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Home', href: '#home', id: 'home' },
  { label: 'Our Memories', href: '#memories', id: 'memories' },
  { label: 'My Wishes', href: '#wishes', id: 'wishes' },
  { label: 'Upload Photos', href: '#upload-photos', id: 'upload-photos' },
]

interface NavBarProps {
  herName: string
  onPersonalize: () => void
}

export function NavBar({ herName, onPersonalize }: NavBarProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      setIsScrolled(window.scrollY > 24)
      const marker = window.scrollY + window.innerHeight * 0.38
      let current = 'home'
      let closest = Number.NEGATIVE_INFINITY
      for (const link of NAV_LINKS) {
        const section = document.getElementById(link.id)
        if (!section) continue
        const top = section.getBoundingClientRect().top + window.scrollY
        if (top <= marker && top > closest) {
          closest = top
          current = link.id
        }
      }
      const memories = document.getElementById('memories')
      const storyEnd = memories ? memories.getBoundingClientRect().bottom + window.scrollY : 0
      if (marker > storyEnd) current = ''
      setActiveSection(current)
    }
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)
  const brandName = herName.trim() || 'my love'

  const openPersonalizer = () => {
    closeMenu()
    onPersonalize()
  }

  return (
    <header className={`nav-bar ${isScrolled || menuOpen ? 'is-solid' : ''}`}>
      <nav className="nav-inner" aria-label="Primary navigation">
        <a href="#home" className="nav-brand" onClick={closeMenu}>
          <span className="nav-brand-mark" aria-hidden="true">
            <Heart size={15} fill="currentColor" strokeWidth={1.5} />
          </span>
          <span className="nav-brand-copy">
            <span className="nav-brand-script">For {brandName}</span>
            <span className="nav-brand-caption">a birthday love letter</span>
          </span>
        </a>

        <div className="nav-links">
          {NAV_LINKS.map((link) => (
            <a
              key={link.id}
              className={`nav-link ${activeSection === link.id ? 'is-active' : ''}`}
              href={link.href}
              aria-current={activeSection === link.id ? 'location' : undefined}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="nav-actions">
          <button type="button" className="nav-personalize" onClick={openPersonalizer}>
            <SlidersHorizontal size={14} strokeWidth={1.8} aria-hidden="true" />
            <span>Personalize</span>
          </button>
          <button
            type="button"
            className="nav-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      <div
        id="mobile-navigation"
        className={`nav-mobile ${menuOpen ? 'is-open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <div className="nav-mobile-inner">
          {NAV_LINKS.map((link, index) => (
            <a
              key={link.id}
              href={link.href}
              className="nav-mobile-link"
              onClick={closeMenu}
              tabIndex={menuOpen ? 0 : -1}
            >
              <span>{String(index + 1).padStart(2, '0')}</span>
              {link.label}
            </a>
          ))}
          <button
            type="button"
            className="nav-mobile-personalize"
            onClick={openPersonalizer}
            tabIndex={menuOpen ? 0 : -1}
          >
            <SlidersHorizontal size={15} aria-hidden="true" />
            Personalize this gift
          </button>
        </div>
      </div>
    </header>
  )
}
