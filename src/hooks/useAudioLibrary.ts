import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteAudio, getAudio, saveAudio } from '../lib/db'
import { audioValidationError } from '../lib/media'
import {
  deleteCloudAudio,
  fetchCloudAudio,
  isCloudAuthError,
  uploadCloudAudio,
} from '../lib/cloud'
import type { AudioTrack, GiftMode, ToastMessage } from '../types'

const BUILT_IN_TRACK: AudioTrack = {
  name: 'A little birthday melody',
  url: `${import.meta.env.BASE_URL}audio/a-little-birthday-melody.mp3`,
  isCustom: false,
}

type Notify = (message: string, tone?: ToastMessage['tone']) => void

export function useAudioLibrary(mode: GiftMode, notify: Notify) {
  const isCloud = mode === 'cloud'
  const [customTrack, setCustomTrack] = useState<AudioTrack | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const customUrl = useRef<string | null>(null)

  useEffect(() => {
    let active = true

    const load = isCloud
      ? fetchCloudAudio().then((payload) => {
          if (!active || !payload.audio) return
          setCustomTrack({
            name: payload.audio.name,
            url: payload.audio.url,
            isCustom: true,
          })
        })
      : getAudio().then((record) => {
          if (!active || !record) return
          const url = URL.createObjectURL(record.blob)
          customUrl.current = url
          setCustomTrack({ name: record.name, url, isCustom: true })
        })

    load
      .catch((error: unknown) => {
        console.error(error)
        if (!active || isCloudAuthError(error)) return
        notify('Your saved soundtrack could not be loaded.', 'error')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
      if (customUrl.current) URL.revokeObjectURL(customUrl.current)
      customUrl.current = null
    }
  }, [isCloud, notify])

  const uploadTrack = useCallback(
    async (file: File) => {
      const error = audioValidationError(file)
      if (error) throw new Error(error)
      const name = file.name.replace(/\.[^/.]+$/, '') || 'Your song'

      if (isCloud) {
        const payload = await uploadCloudAudio(file)
        const track: AudioTrack = {
          name: payload.audio.name || name,
          url: payload.audio.url,
          isCustom: true,
        }
        setCustomTrack(track)
        return track
      }

      await saveAudio({
        id: 'theme',
        name,
        type: file.type || 'audio/mpeg',
        blob: file,
        createdAt: Date.now(),
      })

      if (customUrl.current) URL.revokeObjectURL(customUrl.current)
      const url = URL.createObjectURL(file)
      customUrl.current = url
      const track = { name, url, isCustom: true }
      setCustomTrack(track)
      return track
    },
    [isCloud],
  )

  const removeTrack = useCallback(async () => {
    if (isCloud) {
      await deleteCloudAudio()
      setCustomTrack(null)
      return
    }

    await deleteAudio()
    if (customUrl.current) URL.revokeObjectURL(customUrl.current)
    customUrl.current = null
    setCustomTrack(null)
  }, [isCloud])

  return {
    track: customTrack ?? BUILT_IN_TRACK,
    customTrack,
    isLoading,
    uploadTrack,
    removeTrack,
  }
}
