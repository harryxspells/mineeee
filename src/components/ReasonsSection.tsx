import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Heart, PencilLine, Sparkles } from 'lucide-react'
import type { SiteContent } from '../types'
import { bigCelebration } from '../lib/celebrate'
import { HeartField } from './ui/HeartField'
import { Modal } from './ui/Modal'

interface ReasonsSectionProps {
  content: SiteContent
  onEdit: () => void
}

export function ReasonsSection({ content, onEdit }: ReasonsSectionProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(false)
  const [surpriseOpen, setSurpriseOpen] = useState(false)

  useEffect(() => {
    const grid = gridRef.current
    if (!grid) return
    setRevealed(false)
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setRevealed(true)
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    observer.observe(grid)
    return () => observer.disconnect()
  }, [])

  const openSurprise = () => {
    setSurpriseOpen(true)
    bigCelebration()
  }

  const surpriseParagraphs = content.surpriseMessage
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return (
    <section id="reasons" className="reasons-section" aria-labelledby="reasons-title">
      <div className="reasons-aura" aria-hidden="true" />
      <div className="reasons-rings" aria-hidden="true">
        <span />
        <span />
      </div>

      <div className="page-shell relative z-10">
        <div className="reasons-heading">
          <p className="eyebrow eyebrow--light">
            <span className="eyebrow-number">03</span>
            <span className="eyebrow-line" aria-hidden="true" />
            the reasons, and then some
          </p>
          <h2 id="reasons-title" className="reasons-title">
            Reasons Why I <span className="script-word">Love You</span>{' '}
            <span className="reasons-title-heart" aria-hidden="true">
              ❤️
            </span>
          </h2>
          <p className="reasons-intro">
            I could fill a thousand pages and still run out of room. Here are a few of my favorite
            reasons — the ones that make my heart feel completely at home.
          </p>
        </div>

        <div
          ref={gridRef}
          className={`reasons-grid ${revealed ? 'is-revealed' : 'will-reveal'}`}
        >
          {content.reasons.map((reason, index) => (
            <article
              className="reason-card"
              key={reason.id}
              style={{ '--card-index': index } as CSSProperties}
            >
              <span className="reason-number" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="reason-icon" aria-hidden="true">
                <Heart size={15} fill="currentColor" strokeWidth={0} />
              </span>
              <p>{reason.text}</p>
              <Sparkles className="reason-sparkle" size={14} strokeWidth={1.2} aria-hidden="true" />
            </article>
          ))}
        </div>

        <div className="reasons-footer">
          <p>
            <span aria-hidden="true">…</span> and a thousand quieter reasons I’ll spend forever
            finding words for.
          </p>
          <button type="button" className="text-button text-button--light" onClick={onEdit}>
            <PencilLine size={14} strokeWidth={1.7} aria-hidden="true" />
            Edit my reasons
          </button>
        </div>

        <div className="surprise-invitation">
          <div className="surprise-invitation-glow" aria-hidden="true" />
          <span className="surprise-invitation-script">wait, there’s one more thing…</span>
          <h3>I hid a little more love for you.</h3>
          <p>Something I wanted you to hear when you’re ready.</p>
          <button type="button" className="btn-surprise" onClick={openSurprise}>
            <span>One Last Surprise</span>
            <span aria-hidden="true" className="surprise-heart">
              💖
            </span>
          </button>
          <div className="surprise-invitation-sparkles" aria-hidden="true">
            <span>✦</span>
            <span>✧</span>
            <span>✧</span>
            <span>✦</span>
          </div>
        </div>
      </div>

      <Modal
        open={surpriseOpen}
        onClose={() => setSurpriseOpen(false)}
        labelledBy="surprise-title"
        panelClassName="surprise-modal"
        closeLabel="Close the surprise"
      >
        <HeartField variant="soft" />
        <div className="surprise-specks" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => (
            <span key={index} style={{ '--speck': index } as CSSProperties} />
          ))}
        </div>
        <div className="surprise-content">
          <span className="surprise-seal" aria-hidden="true">
            <Heart size={22} fill="currentColor" strokeWidth={0} />
          </span>
          <p className="surprise-eyebrow">one last secret, just for you</p>
          <h2 id="surprise-title">{content.surpriseTitle}</h2>
          <span className="surprise-divider" aria-hidden="true" />
          <div className="surprise-message">
            {surpriseParagraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
          <p className="surprise-signature">
            {content.signature}
            {content.yourName.trim() && <span>{content.yourName.trim()}</span>}
          </p>
          <button
            type="button"
            className="btn-primary surprise-close"
            onClick={() => setSurpriseOpen(false)}
          >
            Keep this close
            <Heart size={14} fill="currentColor" strokeWidth={0} aria-hidden="true" />
          </button>
        </div>
      </Modal>
    </section>
  )
}
