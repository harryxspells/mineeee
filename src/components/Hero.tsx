import { useEffect, useRef } from 'react'
import { Heart, PencilLine, Plus } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { FloatingPhoto, PhotoMap, SiteContent } from '../types'
import { formatBirthday, splitHeroTitle } from '../lib/content'
import { birthdaySparkle } from '../lib/celebrate'
import { HeartField } from './ui/HeartField'
import coverPlaceholder from '../assets/cover-placeholder.webp'

interface HeroProps {
  content: SiteContent
  photos: PhotoMap
  onOpenPhotoEditor: () => void
}

interface PolaroidCardProps {
  photo: FloatingPhoto
  index: number
  imageUrl?: string
  onEdit: () => void
}

function PolaroidCard({ photo, index, imageUrl, onEdit }: PolaroidCardProps) {
  const style = {
    '--rotation': `${photo.rotation}deg`,
    '--float-delay': `${index * -1.7}s`,
  } as CSSProperties

  return (
    <div className={`hero-polaroid-slot hero-polaroid-slot--${index + 1}`}>
      <button
        type="button"
        className={`polaroid ${imageUrl ? 'polaroid--filled' : 'polaroid--empty'}`}
        style={style}
        onClick={onEdit}
        aria-label={
          imageUrl
            ? `Edit floating photo: ${photo.caption || 'our memory'}`
            : `Add a floating photo${photo.caption ? ` for “${photo.caption}”` : ''}`
        }
      >
        <span className="polaroid-tape" aria-hidden="true" />
        <span className="polaroid-window">
          {imageUrl ? (
            <img src={imageUrl} alt="" loading="eager" />
          ) : (
            <span className="polaroid-empty-art">
              <span className="polaroid-empty-icon">
                <Heart size={20} strokeWidth={1.4} aria-hidden="true" />
              </span>
              <span>add our photo</span>
              <Plus size={13} strokeWidth={1.8} aria-hidden="true" />
            </span>
          )}
          {imageUrl && (
            <span className="polaroid-edit-hint" aria-hidden="true">
              <PencilLine size={16} strokeWidth={1.8} />
              <span>edit photo</span>
            </span>
          )}
        </span>
        <span className="polaroid-caption">{photo.caption || 'our little memory'}</span>
      </button>
    </div>
  )
}

export function Hero({ content, photos, onOpenPhotoEditor }: HeroProps) {
  const mediaRef = useRef<HTMLDivElement>(null)
  const [firstLine, secondLine] = splitHeroTitle(content.heroTitle)
  const userCoverUrl = content.cover.imageId ? photos[content.cover.imageId] : undefined
  const coverUrl = userCoverUrl ?? coverPlaceholder
  const coverStyle = {
    '--overlay': content.cover.overlay / 100,
  } as CSSProperties
  const coverImageStyle = {
    objectPosition: `${content.cover.positionX}% ${content.cover.positionY}%`,
  }

  useEffect(() => {
    const media = mediaRef.current
    if (!media) return
    if (!content.cover.parallax) {
      media.style.setProperty('--parallax-y', '0px')
      return
    }

    let frame = 0
    const update = () => {
      frame = 0
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        media.style.setProperty('--parallax-y', '0px')
        return
      }
      const shift = Math.min(window.scrollY * 0.12, window.innerHeight * 0.09)
      media.style.setProperty('--parallax-y', `${shift.toFixed(1)}px`)
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
  }, [content.cover.parallax])

  const scrollToWishes = () => {
    birthdaySparkle()
    document.getElementById('wishes')?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  return (
    <section id="home" data-nav="home" className="hero-section">
      <div ref={mediaRef} className="hero-media" style={coverStyle}>
        <img
          className="hero-media-image"
          src={coverUrl}
          alt={userCoverUrl ? 'Our favorite photo, glowing softly in the background' : ''}
          style={coverImageStyle}
          fetchPriority="high"
        />
        <div className="hero-scrim" />
        <div className="hero-glow" aria-hidden="true" />
      </div>

      <HeartField />
      <div className="hero-veil" aria-hidden="true" />

      <div className="hero-body">
        <div className="hero-content">
          <p className="hero-kicker">
            <span className="hero-kicker-line" aria-hidden="true" />
            <span>For {content.herName.trim() || 'my love'}</span>
            <span className="hero-kicker-dot" aria-hidden="true">
              <Heart size={7} fill="currentColor" strokeWidth={0} />
            </span>
            <span>{formatBirthday(content.birthday)}</span>
            <span className="hero-kicker-line" aria-hidden="true" />
          </p>

          <h1 className="hero-title" aria-label={`${content.heroTitle} ❤️`}>
            <span className="hero-title-script">{firstLine}</span>
            <span className="hero-title-serif">
              {secondLine}
              <Heart className="hero-title-heart" size={40} fill="currentColor" strokeWidth={0} aria-hidden="true" />
            </span>
          </h1>

          <p className="hero-subtitle">{content.heroSubtitle}</p>

          <div className="hero-actions">
            <button type="button" className="btn-primary hero-cta" onClick={scrollToWishes}>
              <span>Open My Heart</span>
              <span className="button-emoji" aria-hidden="true">
                💌
              </span>
            </button>
          </div>
        </div>

        <div className="hero-polaroids" role="group" aria-label="Floating photos of us">
          {content.floatingPhotos.map((photo, index) => (
            <PolaroidCard
              key={photo.id}
              photo={photo}
              index={index}
              imageUrl={photo.imageId ? photos[photo.imageId] : undefined}
              onEdit={onOpenPhotoEditor}
            />
          ))}
        </div>
      </div>

      <div className="hero-scroll-cue" aria-hidden="true">
        <span>scroll into our story</span>
        <span className="hero-scroll-line" />
      </div>
    </section>
  )
}
