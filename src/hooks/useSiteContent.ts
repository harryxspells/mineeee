import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_CONTENT, loadContent, normalizeContent, saveContent } from '../lib/content'
import { fetchCloudContent, isCloudAuthError, saveCloudContent } from '../lib/cloud'
import type { GiftMode, SiteContent, ToastMessage } from '../types'

type Notify = (message: string, tone?: ToastMessage['tone']) => void

export function useSiteContent(mode: GiftMode, notify: Notify) {
  const isCloud = mode === 'cloud'
  const [content, setContent] = useState<SiteContent>(() =>
    isCloud ? DEFAULT_CONTENT : loadContent(),
  )
  const [isReady, setIsReady] = useState(!isCloud)
  const [loadError, setLoadError] = useState('')
  const [loadVersion, setLoadVersion] = useState(0)
  const skipNextSave = useRef(true)
  const saveTimer = useRef<number | null>(null)
  const pendingSave = useRef<SiteContent | null>(null)
  const isSaving = useRef(false)

  useEffect(() => {
    if (!isCloud) return
    let active = true

    skipNextSave.current = true

    fetchCloudContent()
      .then((payload) => {
        if (!active) return
        setContent(payload.content == null ? DEFAULT_CONTENT : normalizeContent(payload.content))
        setIsReady(true)
      })
      .catch((error: unknown) => {
        if (!active || isCloudAuthError(error)) return
        setLoadError(
          error instanceof Error ? error.message : 'The gift could not be loaded right now.',
        )
      })

    return () => {
      active = false
    }
  }, [isCloud, loadVersion])

  useEffect(() => {
    if (isCloud || !isReady) return
    saveContent(content)
  }, [content, isCloud, isReady])

  const flushSaves = useCallback(async () => {
    if (!isCloud || isSaving.current || !pendingSave.current) return
    isSaving.current = true

    try {
      while (pendingSave.current) {
        const next = pendingSave.current
        pendingSave.current = null
        try {
          await saveCloudContent(next)
        } catch (error) {
          pendingSave.current = pendingSave.current ?? next
          if (isCloudAuthError(error)) return
          notify(
            'Your latest changes could not be saved. Check your connection, then keep editing to try again.',
            'error',
          )
          return
        }
      }
    } finally {
      isSaving.current = false
    }
  }, [isCloud, notify])

  useEffect(() => {
    if (!isCloud || !isReady) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }

    pendingSave.current = content
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      saveTimer.current = null
      void flushSaves()
    }, 700)
  }, [content, flushSaves, isCloud, isReady])

  useEffect(() => {
    if (!isCloud) return
    const saveWhenLeaving = () => {
      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
      void flushSaves()
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveWhenLeaving()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', saveWhenLeaving)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', saveWhenLeaving)
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current)
    }
  }, [flushSaves, isCloud])

  const updateContent = useCallback(
    (updater: SiteContent | ((current: SiteContent) => SiteContent)) => {
      setContent(updater)
    },
    [],
  )

  const retryLoad = useCallback(() => {
    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    setIsReady(false)
    setLoadError('')
    setLoadVersion((current) => current + 1)
  }, [])

  return { content, updateContent, isReady, loadError, retryLoad }
}
