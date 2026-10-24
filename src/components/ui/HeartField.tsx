const HEARTS = [
  { left: 6, delay: -2, duration: 20, size: 13, opacity: 0.32 },
  { left: 17, delay: -11, duration: 26, size: 8, opacity: 0.22 },
  { left: 28, delay: -5, duration: 22, size: 11, opacity: 0.26 },
  { left: 41, delay: -17, duration: 29, size: 7, opacity: 0.18 },
  { left: 54, delay: -8, duration: 21, size: 12, opacity: 0.22 },
  { left: 64, delay: -21, duration: 27, size: 9, opacity: 0.2 },
  { left: 73, delay: -3, duration: 24, size: 15, opacity: 0.28 },
  { left: 84, delay: -14, duration: 30, size: 8, opacity: 0.22 },
  { left: 93, delay: -7, duration: 23, size: 11, opacity: 0.26 },
  { left: 48, delay: -24, duration: 31, size: 6, opacity: 0.18 },
]

export function HeartField({ variant = 'hero' }: { variant?: 'hero' | 'soft' }) {
  return (
    <div className={`heart-field heart-field--${variant}`} aria-hidden="true">
      {HEARTS.map((heart, index) => (
        <span
          key={index}
          className="floating-heart"
          style={{
            left: `${heart.left}%`,
            animationDelay: `${heart.delay}s`,
            animationDuration: `${heart.duration}s`,
            width: heart.size,
            height: heart.size,
            opacity: heart.opacity,
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21s-7.5-4.8-9.7-9.1C.7 8.6 2.3 5.2 5.6 4.5c2-.4 4 .4 5.2 2 1.2-1.6 3.2-2.4 5.2-2 3.3.7 4.9 4.1 3.3 7.4C19.5 16.2 12 21 12 21Z" />
          </svg>
        </span>
      ))}
    </div>
  )
}
