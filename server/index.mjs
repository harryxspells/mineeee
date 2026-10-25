import compression from 'compression'
import cookieParser from 'cookie-parser'
import express from 'express'
import multer from 'multer'
import crypto from 'node:crypto'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(SERVER_DIR, '..')
const DIST_DIR = path.join(ROOT_DIR, 'dist')
const DATA_DIR = path.resolve(process.env.GIFT_DATA_DIR || path.join(SERVER_DIR, 'data'))
const PHOTO_DIR = path.join(DATA_DIR, 'photos')
const AUDIO_DIR = path.join(DATA_DIR, 'audio')
const CONTENT_FILE = path.join(DATA_DIR, 'gift.json')
const AUDIO_META_FILE = path.join(AUDIO_DIR, 'track.json')
const SESSION_SECRET_FILE = path.join(DATA_DIR, '.session-secret')

const ACCESS_KEY = process.env.GIFT_ACCESS_KEY ?? ''
const PORT = Number(process.env.PORT || 4174)
const SESSION_COOKIE = 'gift_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const PHOTO_LIMIT_BYTES = 15 * 1024 * 1024
const AUDIO_LIMIT_BYTES = 20 * 1024 * 1024
const CONTENT_LIMIT = '2mb'
const ORPHAN_GRACE_MS = 6 * 60 * 60 * 1000
const UNLOCK_WINDOW_MS = 15 * 60 * 1000
const UNLOCK_BLOCK_MS = 10 * 60 * 1000
const UNLOCK_MAX_FAILURES = 7
const PHOTO_MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
const AUDIO_MIME = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  webm: 'audio/webm',
  aac: 'audio/aac',
}
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

if (ACCESS_KEY.trim().length < 10) {
  console.error(
    [
      '',
      'GIFT_ACCESS_KEY is missing or too short.',
      'Set a private passphrase of at least 10 characters before starting the gift server.',
      'Copy .env.example to .env and choose a long, unique phrase.',
      '',
    ].join('\n'),
  )
  process.exit(1)
}

if (!fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  console.error('The production build is missing. Run "npm run build" before starting the server.')
  process.exit(1)
}

await fsp.mkdir(PHOTO_DIR, { recursive: true })
await fsp.mkdir(AUDIO_DIR, { recursive: true })

async function loadSessionSecret() {
  try {
    const existing = await fsp.readFile(SESSION_SECRET_FILE)
    if (existing.length >= 32) return existing
  } catch {
    // A fresh secret is created below.
  }
  const secret = crypto.randomBytes(32)
  await fsp.writeFile(SESSION_SECRET_FILE, secret, { mode: 0o600 })
  return secret
}

const sessionSecret = await loadSessionSecret()
const signingKey = crypto.createHmac('sha256', sessionSecret).update(ACCESS_KEY).digest()

let writeQueue = Promise.resolve()

function withWriteLock(task) {
  const run = writeQueue.then(task, task)
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

async function writeJsonAtomic(file, value) {
  const temporary = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`
  await fsp.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  })
  await fsp.rename(temporary, file)
}

async function writeBinaryAtomic(file, buffer) {
  const temporary = `${file}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`
  await fsp.writeFile(temporary, buffer, { mode: 0o600 })
  await fsp.rename(temporary, file)
}

async function readJson(file) {
  try {
    return JSON.parse(await fsp.readFile(file, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    throw error
  }
}

async function readGiftDocument() {
  const document = await readJson(CONTENT_FILE)
  if (!document || typeof document !== 'object' || Array.isArray(document)) return null
  return document
}

function collectPhotoIds(content) {
  const ids = new Set()
  if (!content || typeof content !== 'object') return ids
  if (typeof content.cover?.imageId === 'string') ids.add(content.cover.imageId)
  if (Array.isArray(content.floatingPhotos)) {
    for (const photo of content.floatingPhotos) {
      if (typeof photo?.imageId === 'string') ids.add(photo.imageId)
    }
  }
  if (Array.isArray(content.memories)) {
    for (const memory of content.memories) {
      if (typeof memory?.imageId === 'string') ids.add(memory.imageId)
    }
  }
  return ids
}

function photoRecord(filename) {
  const match = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpg|png|webp)$/i.exec(
    filename,
  )
  if (!match) return null
  return { id: match[1].toLowerCase(), extension: match[2].toLowerCase() }
}

async function deletePhotoIfUnreferenced(id, { ignoreGrace = false } = {}) {
  const document = await readGiftDocument().catch(() => null)
  if (collectPhotoIds(document?.content).has(id)) return false

  for (const extension of Object.keys(PHOTO_MIME)) {
    const filename = `${id}.${extension}`
    const fullPath = path.join(PHOTO_DIR, filename)
    try {
      if (!ignoreGrace) {
        const stats = await fsp.stat(fullPath)
        if (Date.now() - stats.mtimeMs < ORPHAN_GRACE_MS) continue
      }
      await fsp.unlink(fullPath)
      return true
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }
  return false
}

async function sweepUnreferencedPhotos() {
  const document = await readGiftDocument()
  const referenced = collectPhotoIds(document?.content)
  const entries = await fsp.readdir(PHOTO_DIR, { withFileTypes: true })
  const cutoff = Date.now() - ORPHAN_GRACE_MS

  for (const entry of entries) {
    if (!entry.isFile()) continue
    const record = photoRecord(entry.name)
    if (!record || referenced.has(record.id)) continue
    const fullPath = path.join(PHOTO_DIR, entry.name)
    try {
      const stats = await fsp.stat(fullPath)
      if (stats.mtimeMs < cutoff) await fsp.unlink(fullPath)
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error
    }
  }
}

function base64url(value) {
  return Buffer.from(value).toString('base64url')
}

function createSessionToken() {
  const payload = base64url(
    JSON.stringify({
      v: 1,
      exp: Date.now() + SESSION_TTL_MS,
      nonce: crypto.randomBytes(12).toString('hex'),
    }),
  )
  const signature = crypto.createHmac('sha256', signingKey).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

function verifySessionToken(token) {
  if (typeof token !== 'string' || token.length > 1024) return false
  const separator = token.lastIndexOf('.')
  if (separator <= 0) return false
  const payload = token.slice(0, separator)
  const supplied = token.slice(separator + 1)
  const expected = crypto.createHmac('sha256', signingKey).update(payload).digest('base64url')
  const suppliedBuffer = Buffer.from(supplied)
  const expectedBuffer = Buffer.from(expected)
  if (suppliedBuffer.length !== expectedBuffer.length) return false
  if (!crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) return false

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    return decoded?.v === 1 && typeof decoded.exp === 'number' && decoded.exp > Date.now()
  } catch {
    return false
  }
}

function isAuthenticated(request) {
  return verifySessionToken(request.cookies?.[SESSION_COOKIE])
}

function requireAuth(request, response, next) {
  if (isAuthenticated(request)) return next()
  response.status(401).json({
    error: 'This gift is locked. Enter the private key to continue.',
    code: 'locked',
  })
}

function secureCookie(request) {
  return process.env.GIFT_COOKIE_SECURE === '1' || request.secure
}

function sessionCookieOptions(request) {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: secureCookie(request),
    path: '/',
    maxAge: SESSION_TTL_MS,
  }
}

function clearSessionCookie(request, response) {
  response.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'strict',
    secure: secureCookie(request),
    path: '/',
  })
}

function detectImage(buffer) {
  if (buffer.length < 12) return null
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { extension: 'jpg', mime: PHOTO_MIME.jpg }
  }
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { extension: 'png', mime: PHOTO_MIME.png }
  }
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return { extension: 'webp', mime: PHOTO_MIME.webp }
  }
  return null
}

function detectAudio(buffer) {
  if (buffer.length < 12) return null
  if (buffer.toString('ascii', 0, 3) === 'ID3') return { extension: 'mp3', mime: AUDIO_MIME.mp3 }
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WAVE'
  ) {
    return { extension: 'wav', mime: AUDIO_MIME.wav }
  }
  if (buffer.toString('ascii', 0, 4) === 'OggS') return { extension: 'ogg', mime: AUDIO_MIME.ogg }
  if (buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
    return { extension: 'webm', mime: AUDIO_MIME.webm }
  }
  if (buffer.toString('ascii', 4, 8) === 'ftyp') {
    return { extension: 'm4a', mime: AUDIO_MIME.m4a }
  }
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    const layer = buffer[1] & 0x06
    if (layer === 0x02) return { extension: 'mp3', mime: AUDIO_MIME.mp3 }
    if (layer === 0x00) return { extension: 'aac', mime: AUDIO_MIME.aac }
  }
  return null
}

function stripControlCharacters(value) {
  return Array.from(value)
    .filter((character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127)
    .join('')
}

function uploadName(raw, fallback) {
  const cleaned = stripControlCharacters(String(raw ?? '').replace(/\.[^./\\]+$/, ''))
    .trim()
    .slice(0, 120)
  return cleaned || fallback
}

function isValidContent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8') <= 2 * 1024 * 1024
  } catch {
    return false
  }
}

const unlockAttempts = new Map()

function attemptRecord(ip) {
  const now = Date.now()
  const existing = unlockAttempts.get(ip)
  if (!existing || now - existing.windowStartedAt > UNLOCK_WINDOW_MS) {
    const record = { failures: 0, windowStartedAt: now, blockedUntil: 0 }
    unlockAttempts.set(ip, record)
    return record
  }
  return existing
}

const cleanupTimer = setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of unlockAttempts) {
    if (now - record.windowStartedAt > UNLOCK_WINDOW_MS && now > record.blockedUntil) {
      unlockAttempts.delete(ip)
    }
  }
}, 5 * 60 * 1000)
cleanupTimer.unref()

const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: PHOTO_LIMIT_BYTES, files: 1, fields: 2, fieldSize: 512, parts: 4 },
})

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AUDIO_LIMIT_BYTES, files: 1, fields: 3, fieldSize: 1024, parts: 5 },
})

const app = express()

app.disable('x-powered-by')
if (process.env.GIFT_TRUST_PROXY === '1') app.set('trust proxy', 1)

app.use(compression())
app.use((request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  response.setHeader('Referrer-Policy', 'no-referrer')
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'none'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data: blob: https://*.supabase.co",
      "media-src 'self' blob: https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co",
      "manifest-src 'self'",
      "worker-src 'self' blob:",
    ].join('; '),
  )
  next()
})
app.use(cookieParser())

app.use('/api', (request, response, next) => {
  response.setHeader('Cache-Control', 'no-store')
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    const fetchSite = request.get('sec-fetch-site')
    if (fetchSite && fetchSite !== 'same-origin') {
      return response.status(403).json({ error: 'This request came from an unexpected place.' })
    }
  }
  next()
})

app.get('/api/health', (request, response) => {
  response.json({ ok: true, cloud: true })
})

app.get('/api/session', (request, response) => {
  response.json({ cloud: true, authenticated: isAuthenticated(request) })
})

app.post(
  '/api/unlock',
  express.json({ limit: '2kb' }),
  async (request, response, next) => {
    try {
      const ip = request.ip || 'unknown'
      const record = attemptRecord(ip)
      const now = Date.now()

      if (record.blockedUntil > now) {
        const minutes = Math.max(1, Math.ceil((record.blockedUntil - now) / 60000))
        return response.status(429).json({
          error: `Too many tries. Please wait about ${minutes} minute${minutes === 1 ? '' : 's'} and try again.`,
        })
      }

      const suppliedKey = typeof request.body?.key === 'string' ? request.body.key : ''
      const suppliedHash = crypto.createHash('sha256').update(suppliedKey).digest()
      const expectedHash = crypto.createHash('sha256').update(ACCESS_KEY).digest()
      const matched =
        suppliedKey.length > 0 && crypto.timingSafeEqual(suppliedHash, expectedHash)

      if (!matched) {
        record.failures += 1
        if (record.failures >= UNLOCK_MAX_FAILURES) record.blockedUntil = now + UNLOCK_BLOCK_MS
        await new Promise((resolve) => setTimeout(resolve, 240))
        return response.status(401).json({ error: 'That key does not open this gift.' })
      }

      unlockAttempts.delete(ip)
      response.cookie(SESSION_COOKIE, createSessionToken(), sessionCookieOptions(request))
      response.json({ authenticated: true })
    } catch (error) {
      next(error)
    }
  },
)

app.post('/api/lock', requireAuth, (request, response) => {
  clearSessionCookie(request, response)
  response.json({ authenticated: false })
})

app.get('/api/content', requireAuth, async (request, response, next) => {
  try {
    const document = await readGiftDocument()
    response.json({
      content: document?.content ?? null,
      updatedAt: typeof document?.updatedAt === 'number' ? document.updatedAt : null,
    })
  } catch (error) {
    next(error)
  }
})

app.put(
  '/api/content',
  requireAuth,
  express.json({ limit: CONTENT_LIMIT }),
  async (request, response, next) => {
    try {
      const content = request.body?.content
      if (!isValidContent(content)) {
        return response.status(400).json({ error: 'Those changes could not be saved.' })
      }

      const updatedAt = Date.now()
      await withWriteLock(() => writeJsonAtomic(CONTENT_FILE, { version: 1, updatedAt, content }))
      response.json({ savedAt: updatedAt })

      void withWriteLock(() => sweepUnreferencedPhotos()).catch((error) => {
        console.error('Photo cleanup failed:', error)
      })
    } catch (error) {
      next(error)
    }
  },
)

app.get('/api/photos', requireAuth, async (request, response, next) => {
  try {
    const entries = await fsp.readdir(PHOTO_DIR, { withFileTypes: true })
    const photos = []

    for (const entry of entries) {
      if (!entry.isFile()) continue
      const record = photoRecord(entry.name)
      if (!record) continue
      const stats = await fsp.stat(path.join(PHOTO_DIR, entry.name))
      photos.push({
        id: record.id,
        url: `/media/photos/${entry.name}`,
        createdAt: Math.round(stats.mtimeMs),
      })
    }

    photos.sort((left, right) => left.createdAt - right.createdAt)
    response.json({ photos })
  } catch (error) {
    next(error)
  }
})

app.post('/api/photos', requireAuth, photoUpload.single('photo'), async (request, response, next) => {
  try {
    if (!request.file?.buffer?.length) {
      return response.status(400).json({ error: 'No photo was received.' })
    }
    const detected = detectImage(request.file.buffer)
    if (!detected) {
      return response.status(415).json({ error: 'Please choose a JPG, PNG, or WebP photo.' })
    }

    const id = crypto.randomUUID()
    const filename = `${id}.${detected.extension}`
    await writeBinaryAtomic(path.join(PHOTO_DIR, filename), request.file.buffer)
    response.status(201).json({
      photo: {
        id,
        url: `/media/photos/${filename}`,
        createdAt: Date.now(),
      },
    })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/photos/:id', requireAuth, async (request, response, next) => {
  try {
    const id = request.params.id
    if (!UUID_PATTERN.test(id)) {
      return response.status(400).json({ error: 'That photo could not be found.' })
    }

    await deletePhotoIfUnreferenced(id, { ignoreGrace: true }).catch((error) => {
      console.error('Photo deletion failed:', error)
    })

    setTimeout(() => {
      void deletePhotoIfUnreferenced(id, { ignoreGrace: true }).catch((error) =>
        console.error('Delayed photo cleanup failed:', error),
      )
    }, 3000).unref()

    response.status(204).end()
  } catch (error) {
    next(error)
  }
})

async function readAudioMetadata() {
  const metadata = await readJson(AUDIO_META_FILE)
  if (!metadata || typeof metadata !== 'object') return null
  const filename = typeof metadata.filename === 'string' ? metadata.filename : ''
  const match = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(mp3|m4a|wav|ogg|webm|aac)$/i.exec(
    filename,
  )
  if (!match) return null
  try {
    await fsp.access(path.join(AUDIO_DIR, filename))
  } catch {
    return null
  }
  return {
    filename,
    name: uploadName(metadata.name, 'Your song'),
    createdAt: typeof metadata.createdAt === 'number' ? metadata.createdAt : Date.now(),
  }
}

app.get('/api/audio', requireAuth, async (request, response, next) => {
  try {
    const metadata = await readAudioMetadata()
    response.json({
      audio: metadata
        ? {
            name: metadata.name,
            url: `/media/audio/${metadata.filename}`,
            createdAt: metadata.createdAt,
          }
        : null,
    })
  } catch (error) {
    next(error)
  }
})

app.post('/api/audio', requireAuth, audioUpload.single('audio'), async (request, response, next) => {
  try {
    if (!request.file?.buffer?.length) {
      return response.status(400).json({ error: 'No audio file was received.' })
    }
    const detected = detectAudio(request.file.buffer)
    if (!detected) {
      return response.status(415).json({
        error: 'Please choose an MP3, M4A, WAV, OGG, WebM, or AAC audio file.',
      })
    }

    const previous = await readAudioMetadata().catch(() => null)
    const id = crypto.randomUUID()
    const filename = `${id}.${detected.extension}`
    const name = uploadName(request.body?.name || request.file.originalname, 'Your song')
    const metadata = { filename, name, createdAt: Date.now() }

    await writeBinaryAtomic(path.join(AUDIO_DIR, filename), request.file.buffer)
    await withWriteLock(() => writeJsonAtomic(AUDIO_META_FILE, metadata))
    if (previous?.filename && previous.filename !== filename) {
      await fsp.unlink(path.join(AUDIO_DIR, previous.filename)).catch(() => undefined)
    }

    response.status(201).json({
      audio: {
        name: metadata.name,
        url: `/media/audio/${filename}`,
        createdAt: metadata.createdAt,
      },
    })
  } catch (error) {
    next(error)
  }
})

app.delete('/api/audio', requireAuth, async (request, response, next) => {
  try {
    const metadata = await readAudioMetadata()
    await withWriteLock(async () => {
      await fsp.unlink(AUDIO_META_FILE).catch((error) => {
        if (error?.code !== 'ENOENT') throw error
      })
      if (metadata?.filename) {
        await fsp.unlink(path.join(AUDIO_DIR, metadata.filename)).catch((error) => {
          if (error?.code !== 'ENOENT') throw error
        })
      }
    })
    response.status(204).end()
  } catch (error) {
    next(error)
  }
})

app.use('/api', (request, response) => {
  response.status(404).json({ error: 'That gift service could not be found.' })
})

app.get('/media/photos/:filename', requireAuth, (request, response, next) => {
  const filename = request.params.filename
  const record = photoRecord(filename)
  if (!record) return response.status(404).json({ error: 'That photo could not be found.' })
  const fullPath = path.join(PHOTO_DIR, filename)
  if (path.basename(fullPath) !== filename) {
    return response.status(404).json({ error: 'That photo could not be found.' })
  }

  response.sendFile(
    fullPath,
    {
      dotfiles: 'deny',
      cacheControl: false,
      headers: {
        'Content-Type': PHOTO_MIME[record.extension],
        'Cache-Control': 'private, max-age=31536000, immutable',
        Vary: 'Cookie',
      },
    },
    (error) => {
      if (!error) return
      if (response.headersSent) return
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
        return response.status(404).json({ error: 'That photo could not be found.' })
      }
      next(error)
    },
  )
})

app.get('/media/audio/:filename', requireAuth, (request, response, next) => {
  const filename = request.params.filename
  const match = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(mp3|m4a|wav|ogg|webm|aac)$/i.exec(
    filename,
  )
  if (!match) return response.status(404).json({ error: 'That song could not be found.' })
  const fullPath = path.join(AUDIO_DIR, filename)
  if (path.basename(fullPath) !== filename) {
    return response.status(404).json({ error: 'That song could not be found.' })
  }

  response.sendFile(
    fullPath,
    {
      dotfiles: 'deny',
      cacheControl: false,
      headers: {
        'Content-Type': AUDIO_MIME[match[2].toLowerCase()],
        'Cache-Control': 'private, max-age=31536000, immutable',
        Vary: 'Cookie',
      },
    },
    (error) => {
      if (!error) return
      if (response.headersSent) return
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') {
        return response.status(404).json({ error: 'That song could not be found.' })
      }
      next(error)
    },
  )
})

app.use('/media', (request, response) => {
  response.status(404).json({ error: 'That media file could not be found.' })
})

app.use(
  express.static(DIST_DIR, {
    index: false,
    dotfiles: 'ignore',
    setHeaders(response, filePath) {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      } else {
        response.setHeader('Cache-Control', 'no-cache')
      }
    },
  }),
)

app.get('*', (request, response, next) => {
  if (path.extname(request.path)) return next()
  response.setHeader('Cache-Control', 'no-cache')
  response.sendFile(path.join(DIST_DIR, 'index.html'))
})

app.use((request, response) => {
  response.status(404).type('text/plain').send('Not found')
})

app.use((error, request, response, next) => {
  if (response.headersSent) return next(error)

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return response.status(413).json({ error: 'That file is too large to upload.' })
    }
    return response.status(400).json({ error: 'That upload could not be read. Please try again.' })
  }

  if (error?.type === 'entity.too.large') {
    return response.status(413).json({ error: 'That change is too large to save.' })
  }
  if (error?.type === 'entity.parse.failed') {
    return response.status(400).json({ error: 'That request could not be understood.' })
  }

  console.error(error)
  response.status(500).json({ error: 'Something went wrong. Please try again in a moment.' })
})

const server = app.listen(PORT, process.env.HOST || '0.0.0.0', () => {
  console.log('')
  console.log(`Gift server ready at http://localhost:${PORT}`)
  console.log(`Private data directory: ${DATA_DIR}`)
  console.log('The gift is locked. Open the site and enter your private key.')
  console.log('')
})

void withWriteLock(() => sweepUnreferencedPhotos()).catch((error) => {
  console.error('Startup photo cleanup failed:', error)
})

const sweepTimer = setInterval(() => {
  void withWriteLock(() => sweepUnreferencedPhotos()).catch((error) => {
    console.error('Scheduled photo cleanup failed:', error)
  })
}, 60 * 60 * 1000)
sweepTimer.unref()

function shutdown() {
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(0), 5000).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
