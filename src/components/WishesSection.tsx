import { Heart, PencilLine, Sparkles } from 'lucide-react'
import type { SiteContent } from '../types'
import { formatBirthday } from '../lib/content'
import { HeartField } from './ui/HeartField'

interface WishesSectionProps {
  content: SiteContent
  onEdit: () => void
}

export function WishesSection({ content, onEdit }: WishesSectionProps) {
  const paragraphs = content.wishMessage
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return (
    <section
      id="wishes"
      data-nav="wishes"
      className="wishes-section"
      aria-labelledby="wish-heading"
    >
      <HeartField variant="soft" />
      <div className="section-glow section-glow--left" aria-hidden="true" />
      <div className="page-shell relative z-10">
        <div className="chapter-head">
          <p className="eyebrow">
            <span className="eyebrow-number">01</span>
            <span className="eyebrow-line" aria-hidden="true" />
            from my heart to yours
          </p>
          <button type="button" className="text-button" onClick={onEdit}>
            <PencilLine size={14} strokeWidth={1.7} aria-hidden="true" />
            Edit the letter
          </button>
        </div>

        <div className="wish-stage">
          <div className="wish-orbit wish-orbit--one" aria-hidden="true" />
          <div className="wish-orbit wish-orbit--two" aria-hidden="true" />
          <div className="wish-back-sheet" aria-hidden="true" />

          <article className="wish-card">
            <aside className="wish-card-aside">
              <div className="wish-monogram">
                <span className="wish-monogram-script">to</span>
                <span className="wish-monogram-name">{content.herName.trim() || 'my love'}</span>
              </div>
              <span className="wish-aside-rule" aria-hidden="true" />
              <p className="wish-aside-date">{formatBirthday(content.birthday)}</p>
              <Sparkles className="wish-aside-star" size={18} strokeWidth={1.2} aria-hidden="true" />
              <p className="wish-aside-note">a wish made<br />with all my love</p>
            </aside>

            <div className="wish-letter">
              <header className="wish-letter-heading">
                <p className="wish-letter-kicker">on your birthday</p>
                <h2 id="wish-heading" className="wish-title">
                  {content.wishHeading}
                </h2>
                <span className="wish-heading-flourish" aria-hidden="true">
                  <span />
                  <Heart size={10} fill="currentColor" strokeWidth={0} />
                  <span />
                </span>
              </header>

              <div className="wish-body">
                {paragraphs.length ? (
                  paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
                ) : (
                  <p>Your letter is waiting to be written. Open “Personalize” to say what’s in your heart.</p>
                )}
              </div>

              <footer className="wish-letter-footer">
                <div className="wish-signature">
                  <span>{content.signature}</span>
                  {content.yourName.trim() && (
                    <small className="wish-signature-name">{content.yourName.trim()}</small>
                  )}
                </div>
                <div className="wax-seal" aria-hidden="true">
                  <span className="wax-seal-ring" />
                  <Heart size={17} fill="currentColor" strokeWidth={0} />
                </div>
              </footer>
            </div>
          </article>
        </div>

        <p className="wish-footnote">
          <span aria-hidden="true">·</span> keep this one somewhere close to your heart{' '}
          <span aria-hidden="true">·</span>
        </p>
      </div>
    </section>
  )
}
