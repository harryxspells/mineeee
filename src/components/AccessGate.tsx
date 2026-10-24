import { useState, type FormEvent } from 'react'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Heart,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  WifiOff,
} from 'lucide-react'

function GateAmbience() {
  return (
    <div className="gate-ambience" aria-hidden="true">
      <span className="gate-orb gate-orb--one" />
      <span className="gate-orb gate-orb--two" />
      <span className="gate-orb gate-orb--three" />
      <div className="gate-hearts">
        {Array.from({ length: 7 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
    </div>
  )
}

export function GiftBootScreen({ message }: { message?: string }) {
  return (
    <main className="access-gate access-gate--loading" aria-busy="true">
      <GateAmbience />
      <div className="gate-boot" role="status">
        <span className="gate-boot-heart">
          <Heart size={24} strokeWidth={1.2} aria-hidden="true" />
          <span className="gate-boot-ring" aria-hidden="true" />
        </span>
        <p className="gate-kicker">a little world made with love</p>
        <p className="gate-boot-copy">{message ?? 'Opening something made with love…'}</p>
      </div>
    </main>
  )
}

interface GiftAccessGateProps {
  onUnlock: (key: string) => Promise<boolean>
  isUnlocking: boolean
  error: string
}

export function GiftAccessGate({ onUnlock, isUnlocking, error }: GiftAccessGateProps) {
  const [key, setKey] = useState('')
  const [showKey, setShowKey] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isUnlocking) return
    await onUnlock(key)
  }

  return (
    <main className="access-gate">
      <GateAmbience />
      <div className="gate-frame">
        <div className="gate-card">
          <span className="gate-seal" aria-hidden="true">
            <Heart size={20} fill="currentColor" strokeWidth={0} />
            <span>
              <LockKeyhole size={11} strokeWidth={2} />
            </span>
          </span>

          <p className="gate-kicker">a private birthday gift</p>
          <h1 className="gate-title">
            A little world,
            <span> made just for you.</span>
          </h1>
          <p className="gate-copy">
            This scrapbook is protected by a private key. Enter the one you were given to step
            inside.
          </p>

          <form className="gate-form" onSubmit={handleSubmit}>
            <label className="gate-label" htmlFor="gift-access-key">
              Your private key
            </label>
            <span className={`gate-input-shell ${error ? 'has-error' : ''}`}>
              <KeyRound size={16} strokeWidth={1.6} aria-hidden="true" />
              <input
                id="gift-access-key"
                type={showKey ? 'text' : 'password'}
                value={key}
                onChange={(event) => setKey(event.target.value)}
                placeholder="Enter the key you were given"
                autoComplete="current-password"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus
                aria-describedby={error ? 'gift-access-error' : 'gift-access-note'}
                aria-invalid={error ? true : undefined}
                disabled={isUnlocking}
              />
              <button
                type="button"
                className="gate-reveal"
                onClick={() => setShowKey((current) => !current)}
                aria-label={showKey ? 'Hide private key' : 'Show private key'}
                aria-pressed={showKey}
                tabIndex={0}
              >
                {showKey ? (
                  <EyeOff size={15} aria-hidden="true" />
                ) : (
                  <Eye size={15} aria-hidden="true" />
                )}
              </button>
            </span>

            {error && (
              <p className="gate-error" id="gift-access-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn-primary gate-submit" disabled={isUnlocking}>
              {isUnlocking ? (
                <LoaderCircle size={16} className="spin" aria-hidden="true" />
              ) : (
                <ArrowRight size={16} aria-hidden="true" />
              )}
              {isUnlocking ? 'Opening your gift…' : 'Unlock our gift'}
            </button>
          </form>

          <p className="gate-note" id="gift-access-note">
            <ShieldCheck size={13} aria-hidden="true" />
            Private by design. Only someone with the key can open this gift.
          </p>
        </div>

        <p className="gate-signature">
          made with love, <span>just for you</span>
        </p>
      </div>
    </main>
  )
}

interface GiftLoadErrorProps {
  message: string
  onRetry: () => void
  onLock?: () => void
}

export function GiftLoadError({ message, onRetry, onLock }: GiftLoadErrorProps) {
  return (
    <main className="access-gate">
      <GateAmbience />
      <div className="gate-frame">
        <div className="gate-card gate-card--error">
          <span className="gate-seal gate-seal--error" aria-hidden="true">
            <WifiOff size={20} strokeWidth={1.5} />
          </span>
          <p className="gate-kicker">a small pause</p>
          <h1 className="gate-title gate-title--small">
            Our little world
            <span> didn’t open.</span>
          </h1>
          <p className="gate-copy" role="alert">
            {message || 'The gift could not be loaded right now.'}
          </p>
          <div className="gate-actions">
            <button type="button" className="btn-primary" onClick={onRetry}>
              <RefreshCw size={15} aria-hidden="true" />
              Try again
            </button>
            {onLock && (
              <button type="button" className="btn-secondary" onClick={onLock}>
                <LockKeyhole size={14} aria-hidden="true" />
                Lock gift
              </button>
            )}
          </div>
          <p className="gate-note">
            <ShieldCheck size={13} aria-hidden="true" />
            Nothing was changed. Your memories are still safe.
          </p>
        </div>
      </div>
    </main>
  )
}
