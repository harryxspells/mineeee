import type { SiteContent } from '../types'

export const CLOUD_UNAUTHORIZED_EVENT = 'gift-cloud-unauthorized'

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
  return request('/api/session')
}

export async function unlockGift(key: string): Promise<void> {
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
  await request('/api/lock', { method: 'POST' })
}

export async function fetchCloudContent(): Promise<{ content: unknown | null }> {
  return request('/api/content')
}

export async function saveCloudContent(content: SiteContent): Promise<void> {
  await request('/api/content', {
    method: 'PUT',
    body: JSON.stringify({ content }),
  })
}

export async function fetchCloudPhotos(): Promise<{ photos: CloudPhoto[] }> {
  return request('/api/photos')
}

export async function uploadCloudPhoto(
  blob: Blob,
  fileName: string,
): Promise<{ photo: CloudPhoto }> {
  const form = new FormData()
  form.append('photo', blob, fileName)
  return request('/api/photos', { method: 'POST', body: form })
}

export async function deleteCloudPhoto(id: string): Promise<void> {
  await request(`/api/photos/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function fetchCloudAudio(): Promise<{ audio: CloudAudio | null }> {
  return request('/api/audio')
}

export async function uploadCloudAudio(file: File): Promise<{ audio: CloudAudio }> {
  const form = new FormData()
  form.append('name', file.name.replace(/\.[^/.]+$/, '') || 'Our song')
  form.append('audio', file, file.name)
  return request('/api/audio', { method: 'POST', body: form })
}

export async function deleteCloudAudio(): Promise<void> {
  await request('/api/audio', { method: 'DELETE' })
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
