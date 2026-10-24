import type { FloatingPhoto, Memory, Reason, SiteContent } from '../types'

export const STORAGE_KEY = 'our-love-scrapbook.v1'

const today = () => new Date().toISOString().slice(0, 10)

const defaultFloatingPhotos: FloatingPhoto[] = [
  { id: 'polaroid-1', imageId: null, caption: 'my favorite hello', rotation: -7 },
  { id: 'polaroid-2', imageId: null, caption: 'us, always', rotation: 5 },
  { id: 'polaroid-3', imageId: null, caption: 'a little magic', rotation: 4 },
  { id: 'polaroid-4', imageId: null, caption: 'forever feels like this', rotation: -5 },
]

const defaultReasons: Reason[] = [
  { id: 'reason-1', text: 'Your smile makes my day, every single time.' },
  { id: 'reason-2', text: 'You make ordinary moments feel like the best parts of life.' },
  { id: 'reason-3', text: 'You are my favorite person to share my life with.' },
  { id: 'reason-4', text: 'You listen with your whole heart, and I feel safe with you.' },
  { id: 'reason-5', text: 'You make me braver just by being completely yourself.' },
  { id: 'reason-6', text: 'Every version of tomorrow feels brighter because you are in it.' },
]

export const DEFAULT_CONTENT: SiteContent = {
  herName: 'My Love',
  yourName: '',
  birthday: today(),
  heroTitle: 'Happy Birthday, My Everything',
  heroSubtitle:
    'You are my favorite person, my happiest memory, and my most beautiful reason to smile.',
  cover: {
    imageId: null,
    positionX: 50,
    positionY: 50,
    overlay: 58,
    parallax: true,
  },
  floatingPhotos: defaultFloatingPhotos,
  wishHeading: 'My Wish for You ❤️',
  wishMessage:
    'My love,\n\nToday the whole world gets to celebrate the person who makes my world feel softer, brighter, and infinitely more beautiful. I hope this year brings you every little thing that makes your heart light up.\n\nI wish you mornings that feel unhurried, laughter that makes your cheeks hurt, and the courage to chase every dream that calls your name. I wish you a life that feels as wonderful as you make mine feel.\n\nMost of all, I wish for more time with you — more silly moments, more quiet Sundays, more adventures, and a thousand more birthdays to celebrate together.\n\nYou are my favorite hello, my safest place, and my forever.',
  signature: 'Forever yours ❤️',
  reasons: defaultReasons,
  surpriseTitle: 'One last thing, my love…',
  surpriseMessage:
    'If I could gather every star in the sky tonight, I would still struggle to explain how much you mean to me.\n\nYou are the best thing that ever happened to me. Thank you for being my home, my favorite adventure, and the answer to every wish I was too afraid to say out loud.\n\nHappy birthday, my everything. Here’s to us, and to every beautiful year still waiting for us.',
  memories: [],
}

type StoredShape = Partial<SiteContent> & {
  cover?: Partial<SiteContent['cover']>
  floatingPhotos?: FloatingPhoto[]
  reasons?: Reason[]
  memories?: Memory[]
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function restoreFloatingPhotos(value: unknown): FloatingPhoto[] {
  if (!Array.isArray(value) || value.length === 0) return defaultFloatingPhotos
  const restored = value
    .filter((item): item is Partial<FloatingPhoto> => Boolean(item) && typeof item === 'object')
    .slice(0, 4)
    .map((item, index) => ({
      id: isString(item.id) ? item.id : `polaroid-${index + 1}`,
      imageId: isString(item.imageId) ? item.imageId : null,
      caption: isString(item.caption) ? item.caption : '',
      rotation: typeof item.rotation === 'number' ? item.rotation : 0,
    }))
  return restored.length ? restored : defaultFloatingPhotos
}

function restoreReasons(value: unknown): Reason[] {
  if (!Array.isArray(value) || value.length === 0) return defaultReasons
  return value
    .filter((item): item is Partial<Reason> => Boolean(item) && typeof item === 'object')
    .slice(0, 12)
    .map((item, index) => ({
      id: isString(item.id) ? item.id : `reason-${index + 1}`,
      text: isString(item.text) ? item.text : '',
    }))
}

function restoreMemories(value: unknown): Memory[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is Partial<Memory> => Boolean(item) && typeof item === 'object')
    .filter((item) => isString(item.imageId))
    .map((item, index) => ({
      id: isString(item.id) ? item.id : `memory-${index + 1}`,
      imageId: item.imageId as string,
      caption: isString(item.caption) ? item.caption : '',
      date: isString(item.date) ? item.date : '',
      createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now() + index,
    }))
}

export function normalizeContent(value: unknown): SiteContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return DEFAULT_CONTENT
  const stored = value as StoredShape
  const cover = { ...DEFAULT_CONTENT.cover, ...(stored.cover ?? {}) }
  return {
    ...DEFAULT_CONTENT,
    ...stored,
    herName: isString(stored.herName) ? stored.herName : DEFAULT_CONTENT.herName,
    yourName: isString(stored.yourName) ? stored.yourName : '',
    birthday: isString(stored.birthday) ? stored.birthday : DEFAULT_CONTENT.birthday,
    cover: {
      imageId: isString(cover.imageId) ? cover.imageId : null,
      positionX: typeof cover.positionX === 'number' ? cover.positionX : 50,
      positionY: typeof cover.positionY === 'number' ? cover.positionY : 50,
      overlay: typeof cover.overlay === 'number' ? cover.overlay : 58,
      parallax: typeof cover.parallax === 'boolean' ? cover.parallax : true,
    },
    floatingPhotos: restoreFloatingPhotos(stored.floatingPhotos),
    reasons: restoreReasons(stored.reasons),
    memories: restoreMemories(stored.memories),
  }
}

export function loadContent(): SiteContent {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CONTENT
    return normalizeContent(JSON.parse(raw))
  } catch {
    return DEFAULT_CONTENT
  }
}

export function saveContent(content: SiteContent) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content))
  } catch {
    // Storage can be unavailable in private windows. The app stays usable in memory.
  }
}

export function isPhotoReferenced(imageId: string, content: SiteContent): boolean {
  if (content.cover.imageId === imageId) return true
  if (content.floatingPhotos.some((photo) => photo.imageId === imageId)) return true
  return content.memories.some((memory) => memory.imageId === imageId)
}

export function formatReadableDate(value: string): string {
  if (!value) return ''
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

export function formatBirthday(value: string): string {
  return formatReadableDate(value) || 'a day worth celebrating'
}

export function splitHeroTitle(title: string): [string, string] {
  const commaIndex = title.indexOf(',')
  if (commaIndex === -1) return ['Happy Birthday,', title || 'My Everything']
  const first = title.slice(0, commaIndex).trim()
  const second = title.slice(commaIndex + 1).trim()
  return [first ? `${first},` : 'Happy Birthday,', second || 'My Everything']
}

export const newId = () => crypto.randomUUID()
