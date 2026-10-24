import { ArrowUp, Heart, LockKeyhole, SlidersHorizontal } from 'lucide-react'
import type { SiteContent } from '../types'
import { formatBirthday } from '../lib/content'

interface FooterProps {
  content: SiteContent
  isCloud: boolean
  onPersonalize: () => void
  onLock?: () => void
}

export function Footer({ content, isCloud, onPersonalize, onLock }: FooterProps) {
  return (
    <footer className="site-footer">
      <div className="footer-glow" aria-hidden="true" />
      <div className="page-shell">
        <div className="footer-ornament" aria-hidden="true">
          <span />
          <Heart size={12} fill="currentColor" strokeWidth={0} />
          <span />
        </div>

        <p className="footer-kicker">{formatBirthday(content.birthday)}</p>
        <p className="footer-signoff">
          For {content.herName.trim() || 'the birthday girl'},{' '}
          <span className="footer-script">today is all yours.</span>
        </p>
        <p className="footer-note">
          May this year bring you as much joy as you bring to everyone around you. Here’s to you,
          and to a beautiful year ahead.
        </p>

        <div className="footer-bottom">
          <span>Made with love{content.yourName.trim() ? ` by ${content.yourName.trim()}` : ''}.</span>
          <button type="button" className="footer-edit" onClick={onPersonalize}>
            <SlidersHorizontal size={13} aria-hidden="true" />
            Personalize this gift
          </button>
          <a href="#home" className="footer-top">
            Back to the beginning
            <span>
              <ArrowUp size={13} aria-hidden="true" />
            </span>
          </a>
        </div>
        <div className="footer-privacy">
          <span>
            {isCloud
              ? 'Your photos and words are kept privately in your gift, protected by your key.'
              : 'Your photos and words are kept privately in this browser.'}
          </span>
          {isCloud && onLock && (
            <button type="button" className="footer-lock" onClick={onLock}>
              <LockKeyhole size={10} aria-hidden="true" />
              Lock this gift
            </button>
          )}
        </div>
      </div>
    </footer>
  )
}
