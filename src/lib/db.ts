import type { StoredAudio } from '../types'

const DB_NAME = 'our-love-scrapbook'
const DB_VERSION = 1
const IMAGE_STORE = 'images'
const AUDIO_STORE = 'audio'

export interface StoredImage {
  id: string
  name: string
  type: string
  blob: Blob
  width: number
  height: number
  createdAt: number
}

let databasePromise: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  if (!('indexedDB' in window)) {
    return Promise.reject(new Error('This browser does not support local photo storage.'))
  }
  if (databasePromise) return databasePromise

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(IMAGE_STORE)) {
        database.createObjectStore(IMAGE_STORE, { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains(AUDIO_STORE)) {
        database.createObjectStore(AUDIO_STORE, { keyPath: 'id' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () =>
      reject(request.error ?? new Error('Could not open the local photo library.'))
    request.onblocked = () =>
      reject(new Error('Please close other tabs of this site and try again.'))
  })

  return databasePromise
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Local storage request failed.'))
  })
}

export async function saveImage(image: StoredImage): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(IMAGE_STORE, 'readwrite')
  await requestResult(transaction.objectStore(IMAGE_STORE).put(image))
}

export async function getAllImages(): Promise<StoredImage[]> {
  const database = await openDatabase()
  const transaction = database.transaction(IMAGE_STORE, 'readonly')
  return requestResult(transaction.objectStore(IMAGE_STORE).getAll() as IDBRequest<StoredImage[]>)
}

export async function deleteImage(id: string): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(IMAGE_STORE, 'readwrite')
  await requestResult(transaction.objectStore(IMAGE_STORE).delete(id))
}

export async function getAudio(): Promise<StoredAudio | null> {
  const database = await openDatabase()
  const transaction = database.transaction(AUDIO_STORE, 'readonly')
  const result = await requestResult(
    transaction.objectStore(AUDIO_STORE).get('theme') as IDBRequest<StoredAudio | undefined>,
  )
  return result ?? null
}

export async function saveAudio(audio: StoredAudio): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(AUDIO_STORE, 'readwrite')
  await requestResult(transaction.objectStore(AUDIO_STORE).put(audio))
}

export async function deleteAudio(): Promise<void> {
  const database = await openDatabase()
  const transaction = database.transaction(AUDIO_STORE, 'readwrite')
  await requestResult(transaction.objectStore(AUDIO_STORE).delete('theme'))
}
