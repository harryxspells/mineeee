import { useCallback, useEffect, useState } from 'react'
import {
  CLOUD_UNAUTHORIZED_EVENT,
  detectCloud,
  getCloudSession,
  lockGift,
  takeAccessKeyFromUrl,
  unlockGift,
} from '../lib/cloud'
import type { GiftMode } from '../types'

export type CloudAccessStatus = 'detecting' | 'local' | 'locked' | 'unlocked'

export function useCloudAccess() {
  const [status, setStatus] = useState<CloudAccessStatus>('detecting')
  const [error, setError] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)

  useEffect(() => {
    let active = true

    const openGift = async () => {
      const sharedKey = takeAccessKeyFromUrl()
      const cloud = await detectCloud()
      if (!active) return
      if (!cloud) {
        setStatus('local')
        return
      }

      try {
        if (sharedKey) {
          try {
            await unlockGift(sharedKey)
          } catch (unlockError) {
            if (!active) return
            setError(
              unlockError instanceof Error
                ? unlockError.message
                : 'That key could not open this gift.',
            )
            setStatus('locked')
            return
          }
        } else {
          const session = await getCloudSession()
          if (!active) return
          if (!session.authenticated) {
            setStatus('locked')
            return
          }
        }
        if (active) setStatus('unlocked')
      } catch (sessionError) {
        if (!active) return
        setError(
          sessionError instanceof Error
            ? sessionError.message
            : 'The private session could not be checked.',
        )
        setStatus('locked')
      }
    }

    void openGift()

    const onUnauthorized = () => {
      setStatus('locked')
      setError('Your private session has ended. Enter the key to step back inside.')
    }
    window.addEventListener(CLOUD_UNAUTHORIZED_EVENT, onUnauthorized)

    return () => {
      active = false
      window.removeEventListener(CLOUD_UNAUTHORIZED_EVENT, onUnauthorized)
    }
  }, [])

  const unlock = useCallback(async (key: string) => {
    const trimmed = key.trim()
    if (!trimmed) {
      setError('Please enter your private key.')
      return false
    }

    setIsUnlocking(true)
    setError('')
    try {
      await unlockGift(trimmed)
      setStatus('unlocked')
      return true
    } catch (unlockError) {
      setError(
        unlockError instanceof Error ? unlockError.message : 'That key could not open this gift.',
      )
      return false
    } finally {
      setIsUnlocking(false)
    }
  }, [])

  const lock = useCallback(async () => {
    try {
      await lockGift()
    } catch {
      // The gate still closes locally; the session cookie has its own expiry.
    } finally {
      setError('')
      setStatus('locked')
    }
  }, [])

  const mode: GiftMode = status === 'local' ? 'local' : 'cloud'

  return { status, mode, error, isUnlocking, unlock, lock }
}
