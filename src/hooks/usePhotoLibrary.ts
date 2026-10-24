import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteImage, getAllImages, saveImage } from '../lib/db'
import { processImage } from '../lib/media'
import { newId } from '../lib/content'
import {
  deleteCloudPhoto,
  fetchCloudPhotos,
  isCloudAuthError,
  uploadCloudPhoto,
} from '../lib/cloud'
import type { GiftMode, PhotoMap, ToastMessage } from '../types'

interface AddPhotoOptions {
  maxDimension?: number
}

type Notify = (message: string, tone?: ToastMessage['tone']) => void

export function usePhotoLibrary(mode: GiftMode, notify: Notify) {
  const isCloud = mode === 'cloud'
  const [photos, setPhotos] = useState<PhotoMap>({})
  const [isLoading, setIsLoading] = useState(true)
  const objectUrls = useRef(new Map<string, string>())

  useEffect(() => {
    let active = true
    const urlMap = objectUrls.current

    const load = isCloud
      ? fetchCloudPhotos().then((payload) => {
          if (!active) return
          const next: PhotoMap = {}
          for (const photo of payload.photos) next[photo.id] = photo.url
          setPhotos(next)
        })
      : getAllImages().then((records) => {
          if (!active) return
          const next: PhotoMap = {}
          for (const record of records) {
            const url = URL.createObjectURL(record.blob)
            objectUrls.current.set(record.id, url)
            next[record.id] = url
          }
          setPhotos(next)
        })

    load
      .catch((error: unknown) => {
        console.error(error)
        if (!active || isCloudAuthError(error)) return
        notify(
          isCloud
            ? 'Our shared photos could not be loaded. Refresh to try again.'
            : 'Photos saved in this browser could not be loaded.',
          'error',
        )
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
      for (const url of urlMap.values()) URL.revokeObjectURL(url)
      urlMap.clear()
    }
  }, [isCloud, notify])

  const addPhoto = useCallback(
    async (file: File, options: AddPhotoOptions = {}) => {
      const processed = await processImage(file, {
        maxDimension: options.maxDimension,
      })

      if (isCloud) {
        const extension =
          processed.blob.type === 'image/png'
            ? 'png'
            : processed.blob.type === 'image/jpeg'
              ? 'jpg'
              : 'webp'
        const { photo } = await uploadCloudPhoto(processed.blob, `memory.${extension}`)
        setPhotos((current) => ({ ...current, [photo.id]: photo.url }))
        return {
          id: photo.id,
          url: photo.url,
          width: processed.width,
          height: processed.height,
        }
      }

      const id = newId()
      await saveImage({
        id,
        name: file.name,
        type: processed.blob.type || file.type,
        blob: processed.blob,
        width: processed.width,
        height: processed.height,
        createdAt: Date.now(),
      })
      const url = URL.createObjectURL(processed.blob)
      objectUrls.current.set(id, url)
      setPhotos((current) => ({ ...current, [id]: url }))
      return { id, url, width: processed.width, height: processed.height }
    },
    [isCloud],
  )

  const removePhoto = useCallback(
    async (id: string) => {
      if (isCloud) {
        await deleteCloudPhoto(id)
        setPhotos((current) => {
          const next = { ...current }
          delete next[id]
          return next
        })
        return
      }

      await deleteImage(id)
      const url = objectUrls.current.get(id)
      if (url) URL.revokeObjectURL(url)
      objectUrls.current.delete(id)
      setPhotos((current) => {
        const next = { ...current }
        delete next[id]
        return next
      })
    },
    [isCloud],
  )

  return { photos, isLoading, addPhoto, removePhoto }
}
