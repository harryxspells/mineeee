import { AlertCircle, Check, Info, X } from 'lucide-react'
import type { ToastMessage } from '../../types'

interface ToastViewportProps {
  toasts: ToastMessage[]
  onDismiss: (id: number) => void
}

const icons = {
  success: Check,
  error: AlertCircle,
  info: Info,
}

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const Icon = icons[toast.tone]
        return (
          <div key={toast.id} className={`toast toast--${toast.tone}`} role="status">
            <span className="toast-icon" aria-hidden="true">
              <Icon size={16} strokeWidth={2} />
            </span>
            <p>{toast.message}</p>
            <button
              type="button"
              className="toast-close"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
