import { useCallback, useRef, useState } from 'react'
import type { ToastMessage } from '../types'

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const nextId = useRef(0)

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback(
    (message: string, tone: ToastMessage['tone'] = 'success') => {
      const id = ++nextId.current
      setToasts((current) => [...current.slice(-2), { id, message, tone }])
      window.setTimeout(() => dismissToast(id), 4600)
    },
    [dismissToast],
  )

  return { toasts, notify, dismissToast }
}
