import type { FloatingPhoto, Memory, Reason, SiteContent } from '../types'

export const STORAGE_KEY = 'our-love-scrapbook.v1'

const today = () => new Date().toISOString().slice(0, 10)

const defaultFloatingPhotos: FloatingPhoto[] = [
  { id: 'polaroid-1', imageId: null, caption: 'birthday magic', rotation: -7 },
  { id: 'polaroid-2', imageId: null, caption: 'that smile', rotation: 5 },
  { id: 'polaroid-3', imageId: null, caption: 'so much joy', rotation: 4 },
  { id: 'polaroid-4', imageId: null, caption: 'a day like this', rotation: -5 },
]

const defaultReasons: Reason[] = [
  { id: 'reason-1', text: 'The way you light up every room without even trying.' },
  { id: 'reason-2', text: 'Your laugh is contagious in the very best way.' },
  { id: 'reason-3', text: 'You make ordinary days feel worth remembering.' },
  { id: 'reason-4', text: 'You listen with your whole heart, and you make people feel understood.' },
  { id: 'reason-5', text: 'You face life with a courage that quietly inspires everyone around you.' },
  { id: 'reason-6', text: 'The world is brighter, kinder, and so much more fun with you in it.' },
]

export const DEFAULT_CONTENT: SiteContent = {
  herName: '',
  yourName: '',
  birthday: today(),
  heroTitle: 'mine, Beautiful',
  heroSubtitle:
    'Today is all about you — the joy you bring, the dreams you chase, and every wonderful thing that makes you, you.',
  cover: {
    imageId: null,
    positionX: 50,
    positionY: 50,
    overlay: 58,
    parallax: true,
  },
  floatingPhotos: defaultFloatingPhotos,
  wishHeading: 'My Birthday Wish for You ❤️',
  wishMessage:
    'Today the whole world gets to celebrate you — the light you bring, the laughter you share, and the wonderful person you are.\n\nI hope this year brings you every little thing that makes your heart light up: mornings that feel unhurried, laughter that makes your cheeks hurt, and the courage to chase every dream that calls your name.\n\nI wish you a life that feels as wonderful as you make life feel for the people around you. More silly moments. More quiet Sundays. More adventures. A thousand more birthdays to celebrate.\n\nHappy birthday. You are so dearly loved — today and always.',
  signature: 'With so much love ❤️',
  reasons: defaultReasons,
  surpriseTitle: 'One last birthday wish…',
  surpriseMessage:
    'If I could gather every star in the sky tonight, it still wouldn’t be enough to explain how glad I am that you were born.\n\nYou make ordinary days brighter, hard days lighter, and every room a little more like home. Thank you for being exactly who you are.\n\nHappy birthday. Here’s to a year full of joy, adventure, and every good thing you’ve been wishing for.',
  memories: [],
}

// The site previously shipped with a romantic love-letter theme. These values
// let stored copies of the old defaults upgrade to birthday wording while
// leaving every personalized photo, name, and message untouched.
const LEGACY_DEFAULT_COPY = {
  herName: 'My Love',
  heroTitle: 'Happy Birthday, My Everything',
  heroSubtitle:
    'You are my favorite person, my happiest memory, and my most beautiful reason to smile.',
  wishHeading: 'My Wish for You ❤️',
  wishMessage:
    'My love,\n\nToday the whole world gets to celebrate the person who makes my world feel softer, brighter, and infinitely more beautiful. I hope this year brings you every little thing that makes your heart light up.\n\nI wish you mornings that feel unhurried, laughter that makes your cheeks hurt, and the courage to chase every dream that calls your name. I wish you a life that feels as wonderful as you make mine feel.\n\nMost of all, I wish for more time with you — more silly moments, more quiet Sundays, more adventures, and a thousand more birthdays to celebrate together.\n\nYou are my favorite hello, my safest place, and my forever.',
  signature: 'Forever yours ❤️',
  surpriseTitle: 'One last thing, my love…',
  surpriseMessage:
    'If I could gather every star in the sky tonight, I would still struggle to explain how much you mean to me.\n\nYou are the best thing that ever happened to me. Thank you for being my home, my favorite adventure, and the answer to every wish I was too afraid to say out loud.\n\nHappy birthday, my everything. Here’s to us, and to every beautiful year still waiting for us.',
}

const LEGACY_COPY_FIELDS = [
  'heroTitle',
  'heroSubtitle',
  'wishHeading',
  'wishMessage',
  'signature',
  'surpriseTitle',
  'surpriseMessage',
] as const

const LEGACY_POLAROID_CAPTIONS: Record<string, string> = {
  'polaroid-1': 'my favorite hello',
  'polaroid-2': 'us, always',
  'polaroid-3': 'a little magic',
  'polaroid-4': 'forever feels like this',
}

const LEGACY_REASON_TEXT: Record<string, string> = {
  'reason-1': 'Your smile makes my day, every single time.',
  'reason-2': 'You make ordinary moments feel like the best parts of life.',
  'reason-3': 'You are my favorite person to share my life with.',
  'reason-4': 'You listen with your whole heart, and I feel safe with you.',
  'reason-5': 'You make me braver just by being completely yourself.',
  'reason-6': 'Every version of tomorrow feels brighter because you are in it.',
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

function hasLegacyCopy(content: SiteContent): boolean {
  return LEGACY_COPY_FIELDS.some((field) => content[field] === LEGACY_DEFAULT_COPY[field])
}

function migrateLegacyCopy(content: SiteContent): SiteContent {
  if (!hasLegacyCopy(content)) return content

  const next = { ...content }
  if (next.herName === LEGACY_DEFAULT_COPY.herName) next.herName = DEFAULT_CONTENT.herName

  for (const field of LEGACY_COPY_FIELDS) {
    if (next[field] === LEGACY_DEFAULT_COPY[field]) next[field] = DEFAULT_CONTENT[field]
  }

  next.floatingPhotos = content.floatingPhotos.map((photo) => {
    const legacyCaption = LEGACY_POLAROID_CAPTIONS[photo.id]
    if (!legacyCaption || photo.caption !== legacyCaption) return photo
    const updated = DEFAULT_CONTENT.floatingPhotos.find((item) => item.id === photo.id)
    return updated ? { ...photo, caption: updated.caption } : photo
  })

  next.reasons = content.reasons.map((reason) => {
    if (LEGACY_REASON_TEXT[reason.id] !== reason.text) return reason
    const updated = DEFAULT_CONTENT.reasons.find((item) => item.id === reason.id)
    return updated ? { ...reason, text: updated.text } : reason
  })

  return next
}

export function normalizeContent(value: unknown): SiteContent {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return DEFAULT_CONTENT
  const stored = value as StoredShape
  const cover = { ...DEFAULT_CONTENT.cover, ...(stored.cover ?? {}) }
  return migrateLegacyCopy({
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
  })
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
  if (commaIndex === -1) return ['Happy Birthday,', title || 'Beautiful']
  const first = title.slice(0, commaIndex).trim()
  const second = title.slice(commaIndex + 1).trim()
  return [first ? `${first},` : 'Happy Birthday,', second || 'Beautiful']
}

export const newId = () => crypto.randomUUID()
