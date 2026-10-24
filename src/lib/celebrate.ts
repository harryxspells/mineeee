import confetti from 'canvas-confetti'

const COLORS = ['#f7a072', '#e96b61', '#ffd8c9', '#f5c2b2', '#e8b373', '#fff4e9']

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function birthdaySparkle() {
  if (prefersReducedMotion()) return
  confetti({
    particleCount: 55,
    spread: 62,
    startVelocity: 28,
    gravity: 0.7,
    scalar: 0.85,
    ticks: 180,
    origin: { x: 0.5, y: 0.62 },
    colors: COLORS,
    zIndex: 200,
    disableForReducedMotion: true,
  })
}

export function bigCelebration() {
  if (prefersReducedMotion()) return
  const common = {
    colors: COLORS,
    zIndex: 200,
    disableForReducedMotion: true,
    scalar: 0.95,
  }
  confetti({
    ...common,
    particleCount: 110,
    spread: 80,
    startVelocity: 42,
    origin: { x: 0.5, y: 0.58 },
  })
  window.setTimeout(() => {
    confetti({ ...common, particleCount: 50, angle: 60, spread: 58, origin: { x: 0, y: 0.72 } })
    confetti({ ...common, particleCount: 50, angle: 120, spread: 58, origin: { x: 1, y: 0.72 } })
  }, 300)
  window.setTimeout(() => {
    confetti({
      ...common,
      particleCount: 70,
      spread: 100,
      startVelocity: 30,
      gravity: 0.8,
      origin: { x: 0.5, y: 0.35 },
    })
  }, 750)
}
