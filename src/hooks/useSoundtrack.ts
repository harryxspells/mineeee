import { useCallback, useEffect, useRef, useState } from 'react'
import type { AudioTrack } from '../types'

const VOLUME_KEY = 'our-love-scrapbook.volume'
const MUTED_KEY = 'our-love-scrapbook.muted'

function readVolume(): number {
  try {
    const value = Number(localStorage.getItem(VOLUME_KEY))
    return Number.isFinite(value) && value >= 0 && value <= 1 ? value : 0.55
  } catch {
    return 0.55
  }
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_KEY) === 'true'
  } catch {
    return false
  }
}

export function useSoundtrack(track: AudioTrack) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playingRef = useRef(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [volume, setVolumeState] = useState(readVolume)
  const [isMuted, setIsMuted] = useState(readMuted)

  useEffect(() => {
    const audio = new Audio()
    audio.loop = true
    audio.preload = 'metadata'
    audioRef.current = audio

    return () => {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
      audioRef.current = null
    }
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.src = track.url
    audio.load()
    if (playingRef.current) {
      void audio.play().catch(() => {
        playingRef.current = false
        setIsPlaying(false)
      })
    }
  }, [track.url])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
    try {
      localStorage.setItem(VOLUME_KEY, String(volume))
    } catch {
      // Volume preferences are a nice-to-have if storage is unavailable.
    }
  }, [volume])

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = isMuted
    try {
      localStorage.setItem(MUTED_KEY, String(isMuted))
    } catch {
      // Muting still works for this session.
    }
  }, [isMuted])

  const togglePlayback = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return

    if (playingRef.current) {
      audio.pause()
      playingRef.current = false
      setIsPlaying(false)
      return
    }

    setIsBusy(true)
    try {
      await audio.play()
      playingRef.current = true
      setIsPlaying(true)
    } catch {
      throw new Error(
        'Your browser would not start the music. Please tap play once more or try a different song.',
      )
    } finally {
      setIsBusy(false)
    }
  }, [])

  const setVolume = useCallback((value: number) => {
    setVolumeState(Math.min(1, Math.max(0, value)))
    if (value > 0) setIsMuted(false)
  }, [])

  const toggleMuted = useCallback(() => setIsMuted((current) => !current), [])

  return {
    isPlaying,
    isBusy,
    volume,
    setVolume,
    isMuted,
    toggleMuted,
    togglePlayback,
  }
}
