import type { SiteContent } from '../types'
import { newId } from './content'
import {
  GIFT_ACCOUNT_EMAIL,
  getSupabaseClient,
  hasSupabaseEnvironment,
  supabaseConfigProblem,
} from './supabase'

export const CLOUD_UNAUTHORIZED_EVENT = 'gift-cloud-unauthorized'

const PHOTO_BUCKET = 'gift-photos'
const AUDIO_BUCKET = 'gift-audio'
const SIGNED_URL_TTL = 60 * 60 * 24 * 7

const AUDIO_MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  webm: 'audio/webm',
  aac: 'audio/aac',
}

const IMAGE_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export interface CloudPhoto {
  id: string
  url: string
  createdAt: number
}

export interface CloudAudio {
  name: string
  url: string
  createdAt: number
}

export class CloudApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'CloudApiError'
    this.status = status
  }
}

export function isCloudAuthError(error: unknown): boolean {
  return error instanceof CloudApiError && error.status === 401
}

function errorMessage(payload: unknown, fallback: string): string {
  if (
    payload &&
    typeof payload === 'object' &&
    'error' in payload &&
    typeof payload.error === 'string'
  ) {
    return payload.error
  }
  return fallback
}

function requireSupabaseClient() {
  const client = getSupabaseClient()
  if (!client) {
    throw new CloudApiError(
      supabaseConfigProblem() ?? 'Supabase is not configured for this build.',
      500,
    )
  }
  return client
}

function backendStatus(error: unknown): number {
  if (!error || typeof error !== 'object') return 0
  const status = 'status' in error ? error.status : undefined
  if (typeof status === 'number') return status
  const statusCode = 'statusCode' in error ? error.statusCode : undefined
  const parsed = Number(statusCode)
  return Number.isFinite(parsed) ? parsed : 0
}

function backendDetails(error: unknown) {
  if (!error || typeof error !== 'object') {
    return { code: '', message: '', status: 0 }
  }
  const code = 'code' in error && typeof error.code === 'string' ? error.code : ''
  const message =
    'message' in error && typeof error.message === 'string' ? error.message : ''
  return { code, message, status: backendStatus(error) }
}

function supabaseFailure(error: unknown, fallback: string): never {
  console.error('Supabase gift request failed:', error)
  const { code, message, status } = backendDetails(error)
  const lower = message.toLowerCase()

  const authFailure =
    status === 401 ||
    code === 'PGRST301' ||
    code === 'PGRST302' ||
    lower.includes('jwt expired') ||
    lower.includes('invalid jwt')
  if (authFailure) {
    window.dispatchEvent(new Event(CLOUD_UNAUTHORIZED_EVENT))
    throw new CloudApiError(
      'Your private session has ended. Enter the key to step back inside.',
      401,
    )
  }

  if (lower.includes('invalid api key') || lower.includes('no api key found')) {
    throw new CloudApiError(
      'Supabase rejected the public key. Check VITE_SUPABASE_ANON_KEY in your environment.',
      500,
    )
  }

  if (
    code === 'PGRST205' ||
    code === '42P01' ||
    lower.includes('could not find the table') ||
    (lower.includes('relation') && lower.includes('does not exist'))
  ) {
    throw new CloudApiError(
      'The shared gift tables are missing. Run supabase/schema.sql in the Supabase SQL editor, then reload.',
      500,
    )
  }

  if (lower.includes('bucket not found')) {
    throw new CloudApiError(
      'The shared photo storage is missing. Run supabase/schema.sql, then reload.',
      500,
    )
  }

  if (status === 403 || code === '42501') {
    throw new CloudApiError(
      'This Supabase account is not allowed to use the gift storage. Check the policies in supabase/schema.sql.',
      403,
    )
  }

  throw new CloudApiError(fallback, status || 500)
}

function authFailure(error: unknown): CloudApiError {
  console.error('Supabase sign-in failed:', error)
  const { message, status } = backendDetails(error)
  const lower = message.toLowerCase()

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('user not found')
  ) {
    return new CloudApiError('That key does not open this gift.', 401)
  }
  if (lower.includes('email not confirmed')) {
    return new CloudApiError(
      'This gift account is not confirmed yet. Confirm it in Supabase Authentication, then try again.',
      401,
    )
  }
  if (status === 429 || lower.includes('rate limit')) {
    return new CloudApiError('Too many attempts. Please wait a moment and try again.', 429)
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return new CloudApiError(
      'Supabase could not be reached. Check the project URL and your connection.',
      0,
    )
  }
  return new CloudApiError(
    message || 'The shared gift could not be opened right now.',
    status || 500,
  )
}

interface RequestOptions {
  quietUnauthorized?: boolean
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      headers,
      cache: 'no-store',
      credentials: 'same-origin',
    })
  } catch {
    throw new CloudApiError('We could not reach the gift. Please check your connection.', 0)
  }

  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => null)
    : null

  if (!response.ok) {
    if (response.status === 401 && !options.quietUnauthorized) {
      window.dispatchEvent(new Event(CLOUD_UNAUTHORIZED_EVENT))
    }
    throw new CloudApiError(
      errorMessage(payload, 'The gift server could not complete that request.'),
      response.status,
    )
  }

  return payload as T
}

export async function detectCloud(): Promise<boolean> {
  if (hasSupabaseEnvironment) return true

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 3500)
  try {
    const response = await fetch('/api/health', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      credentials: 'same-origin',
      signal: controller.signal,
    })
    if (!response.ok) return false
    if (!(response.headers.get('content-type') ?? '').includes('application/json')) return false
    const payload = (await response.json()) as { cloud?: unknown }
    return payload?.cloud === true
  } catch {
    return false
  } finally {
    window.clearTimeout(timeout)
  }
}

export async function getCloudSession(): Promise<{ authenticated: boolean }> {
  if (hasSupabaseEnvironment) {
    const problem = supabaseConfigProblem()
    if (problem) throw new CloudApiError(problem, 500)
    const supabase = requireSupabaseClient()
    const { data, error } = await supabase.auth.getSession()
    if (error) throw authFailure(error)
    return { authenticated: Boolean(data.session) }
  }
  return request('/api/session')
}

export async function unlockGift(key: string): Promise<void> {
  if (hasSupabaseEnvironment) {
    const problem = supabaseConfigProblem()
    if (problem) throw new CloudApiError(problem, 500)
    const supabase = requireSupabaseClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: GIFT_ACCOUNT_EMAIL,
      password: key,
    })
    if (error) throw authFailure(error)
    return
  }

  await request(
    '/api/unlock',
    {
      method: 'POST',
      body: JSON.stringify({ key }),
    },
    { quietUnauthorized: true },
  )
}

export async function lockGift(): Promise<void> {
  if (hasSupabaseEnvironment) {
    const supabase = getSupabaseClient()
    if (supabase) {
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      if (error) console.warn('The Supabase session could not be cleared.', error)
    }
    return
  }
  await request('/api/lock', { method: 'POST' })
}

export async function fetchCloudContent(): Promise<{ content: unknown | null }> {
  if (hasSupabaseEnvironment) {
    const supabase = requireSupabaseClient()
    const { data, error } = await supabase
      .from('gift_content')
      .select('content')
      .eq('id', 'main')
      .maybeSingle()
    if (error) supabaseFailure(error, 'Your shared gift could not be loaded from Supabase.')
    return { content: data?.content ?? null }
  }
  return request('/api/content')
}

export async function saveCloudContent(content: SiteContent): Promise<void> {
  if (hasSupabaseEnvironment) {
    const supabase = requireSupabaseClient()
    const { error } = await supabase
      .from('gift_content')
      .upsert(
        { id: 'main', content, updated_at: new Date().toISOString() },
        { onConflict: 'id' },
      )
    if (error) supabaseFailure(error, 'Your latest changes could not be saved to Supabase.')
    return
  }
  await request('/api/content', {
    method: 'PUT',
    body: JSON.stringify({ content }),
  })
}

interface PhotoRow {
  id: string
  storage_path: string
  created_at: string
}

export async function fetchCloudPhotos(): Promise<{ photos: CloudPhoto[] }> {
  if (!hasSupabaseEnvironment) return request('/api/photos')

  const supabase = requireSupabaseClient()
  const { data, error } = await supabase
    .from('gift_photos')
    .select('id, storage_path, created_at')
    .order('created_at', { ascending: true })
  if (error) supabaseFailure(error, 'Your shared photos could not be loaded from Supabase.')

  const rows = (data ?? []) as PhotoRow[]
  if (rows.length === 0) return { photos: [] }

  const { data: signed, error: signError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(
      rows.map((row) => row.storage_path),
      SIGNED_URL_TTL,
    )
  if (signError) supabaseFailure(signError, 'Your shared photos could not be opened.')

  const urlByPath = new Map<string, string>()
  for (const item of signed ?? []) {
    if (item.path && item.signedUrl) urlByPath.set(item.path, item.signedUrl)
  }

  const photos: CloudPhoto[] = []
  for (const row of rows) {
    const url = urlByPath.get(row.storage_path)
    if (!url) {
      console.warn('A shared photo could not be signed:', row.storage_path)
      continue
    }
    photos.push({
      id: row.id,
      url,
      createdAt: Date.parse(row.created_at) || Date.now(),
    })
  }
  return { photos }
}

export async function uploadCloudPhoto(
  blob: Blob,
  fileName: string,
): Promise<{ photo: CloudPhoto }> {
  if (!hasSupabaseEnvironment) {
    const form = new FormData()
    form.append('photo', blob, fileName)
    return request('/api/photos', { method: 'POST', body: form })
  }

  const supabase = requireSupabaseClient()
  const id = newId()
  const extension =
    blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp'
  const storagePath = `${id}.${extension}`
  const contentType = IMAGE_MIME[extension] ?? 'image/webp'

  const { error: uploadError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(storagePath, blob, {
      contentType,
      cacheControl: '31536000',
      upsert: false,
    })
  if (uploadError) supabaseFailure(uploadError, 'That photo could not be uploaded to Supabase.')

  const createdAt = Date.now()
  const { error: rowError } = await supabase.from('gift_photos').insert({
    id,
    storage_path: storagePath,
    created_at: new Date(createdAt).toISOString(),
  })
  if (rowError) {
    await supabase.storage.from(PHOTO_BUCKET).remove([storagePath])
    supabaseFailure(rowError, 'That photo could not be added to your shared gift.')
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL)
  if (signError || !signed?.signedUrl) {
    await Promise.allSettled([
      supabase.storage.from(PHOTO_BUCKET).remove([storagePath]),
      supabase.from('gift_photos').delete().eq('id', id),
    ])
    supabaseFailure(signError, 'That photo was uploaded but could not be opened.')
  }

  return {
    photo: {
      id,
      url: signed.signedUrl,
      createdAt,
    },
  }
}

export async function deleteCloudPhoto(id: string): Promise<void> {
  if (!hasSupabaseEnvironment) {
    await request(`/api/photos/${encodeURIComponent(id)}`, { method: 'DELETE' })
    return
  }

  const supabase = requireSupabaseClient()
  const { data, error } = await supabase
    .from('gift_photos')
    .select('storage_path')
    .eq('id', id)
    .maybeSingle()
  if (error) supabaseFailure(error, 'That photo could not be removed from Supabase.')

  const { error: deleteError } = await supabase.from('gift_photos').delete().eq('id', id)
  if (deleteError) supabaseFailure(deleteError, 'That photo could not be removed from Supabase.')

  if (data?.storage_path) {
    const { error: removeError } = await supabase.storage
      .from(PHOTO_BUCKET)
      .remove([data.storage_path])
    if (removeError) {
      console.warn('The photo row was deleted, but its file remains in Supabase:', removeError)
    }
  }
}

interface AudioRow {
  name: string
  storage_path: string
  created_at: string
}

export async function fetchCloudAudio(): Promise<{ audio: CloudAudio | null }> {
  if (!hasSupabaseEnvironment) return request('/api/audio')

  const supabase = requireSupabaseClient()
  const { data, error } = await supabase
    .from('gift_audio')
    .select('name, storage_path, created_at')
    .eq('id', 'theme')
    .maybeSingle()
  if (error) supabaseFailure(error, 'Your shared soundtrack could not be loaded from Supabase.')
  if (!data) return { audio: null }

  const row = data as AudioRow
  const { data: signed, error: signError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .createSignedUrl(row.storage_path, SIGNED_URL_TTL)
  if (signError || !signed?.signedUrl) {
    supabaseFailure(signError, 'Your shared soundtrack could not be opened.')
  }

  return {
    audio: {
      name: row.name,
      url: signed.signedUrl,
      createdAt: Date.parse(row.created_at) || Date.now(),
    },
  }
}

function audioExtension(file: File): string {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (AUDIO_MIME[extension]) return extension === 'oga' ? 'ogg' : extension
  if (file.type === 'audio/mpeg') return 'mp3'
  if (file.type === 'audio/mp4') return 'm4a'
  if (file.type === 'audio/wav' || file.type === 'audio/x-wav') return 'wav'
  if (file.type === 'audio/ogg') return 'ogg'
  if (file.type === 'audio/webm') return 'webm'
  if (file.type === 'audio/aac') return 'aac'
  return 'mp3'
}

export async function uploadCloudAudio(file: File): Promise<{ audio: CloudAudio }> {
  if (!hasSupabaseEnvironment) {
    const form = new FormData()
    form.append('name', file.name.replace(/\.[^/.]+$/, '') || 'Your song')
    form.append('audio', file, file.name)
    return request('/api/audio', { method: 'POST', body: form })
  }

  const supabase = requireSupabaseClient()
  const name = file.name.replace(/\.[^/.]+$/, '') || 'Your song'
  const extension = audioExtension(file)
  const storagePath = `${newId()}.${extension}`
  const contentType = AUDIO_MIME[extension] ?? (file.type || 'audio/mpeg')

  const { data: previous } = await supabase
    .from('gift_audio')
    .select('storage_path')
    .eq('id', 'theme')
    .maybeSingle()

  const { error: uploadError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(storagePath, file, {
      contentType,
      cacheControl: '31536000',
      upsert: false,
    })
  if (uploadError) supabaseFailure(uploadError, 'That song could not be uploaded to Supabase.')

  const createdAt = Date.now()
  const { error: rowError } = await supabase.from('gift_audio').upsert(
    {
      id: 'theme',
      name,
      storage_path: storagePath,
      created_at: new Date(createdAt).toISOString(),
    },
    { onConflict: 'id' },
  )
  if (rowError) {
    await supabase.storage.from(AUDIO_BUCKET).remove([storagePath])
    supabaseFailure(rowError, 'That song could not be added to your shared gift.')
  }

  const oldPath =
    previous && typeof previous.storage_path === 'string' ? previous.storage_path : ''
  if (oldPath && oldPath !== storagePath) {
    const { error: removeError } = await supabase.storage.from(AUDIO_BUCKET).remove([oldPath])
    if (removeError) console.warn('The previous soundtrack file could not be removed.', removeError)
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL)
  if (signError || !signed?.signedUrl) {
    supabaseFailure(signError, 'That song was uploaded but could not be opened.')
  }

  return {
    audio: {
      name,
      url: signed.signedUrl,
      createdAt,
    },
  }
}

export async function deleteCloudAudio(): Promise<void> {
  if (!hasSupabaseEnvironment) {
    await request('/api/audio', { method: 'DELETE' })
    return
  }

  const supabase = requireSupabaseClient()
  const { data, error } = await supabase
    .from('gift_audio')
    .select('storage_path')
    .eq('id', 'theme')
    .maybeSingle()
  if (error) supabaseFailure(error, 'That song could not be removed from Supabase.')

  const { error: deleteError } = await supabase.from('gift_audio').delete().eq('id', 'theme')
  if (deleteError) supabaseFailure(deleteError, 'That song could not be removed from Supabase.')

  if (data?.storage_path) {
    const { error: removeError } = await supabase.storage
      .from(AUDIO_BUCKET)
      .remove([data.storage_path])
    if (removeError) {
      console.warn('The soundtrack row was deleted, but its file remains in Supabase:', removeError)
    }
  }
}

export function takeAccessKeyFromUrl(): string | null {
  const url = new URL(window.location.href)
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
  const key =
    hashParams.get('key') ??
    hashParams.get('access') ??
    url.searchParams.get('key') ??
    url.searchParams.get('access')

  let changed = false
  for (const name of ['key', 'access']) {
    if (hashParams.has(name)) {
      hashParams.delete(name)
      changed = true
    }
    if (url.searchParams.has(name)) {
      url.searchParams.delete(name)
      changed = true
    }
  }

  if (changed) {
    const hash = hashParams.toString()
    url.hash = hash ? `#${hash}` : ''
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`,
    )
  }

  const trimmed = key?.trim()
  return trimmed || null
}
