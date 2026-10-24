import { useState } from 'react'
import {
  ChevronDown,
  LoaderCircle,
  Music2,
  Pause,
  Play,
  Upload,
  Volume1,
  Volume2,
  VolumeX,
} from 'lucide-react'
import type { AudioTrack } from '../types'

interface MusicDockProps {
  track: AudioTrack
  isPlaying: boolean
  isBusy: boolean
  isMuted: boolean
  volume: number
  onTogglePlayback: () => Promise<void>
  onToggleMuted: () => void
  onVolumeChange: (value: number) => void
  onChangeTrack: () => void
  onError: (message: string) => void
}

export function MusicDock({
  track,
  isPlaying,
  isBusy,
  isMuted,
  volume,
  onTogglePlayback,
  onToggleMuted,
  onVolumeChange,
  onChangeTrack,
  onError,
}: MusicDockProps) {
  const [expanded, setExpanded] = useState(false)

  const handlePlayback = async () => {
    try {
      await onTogglePlayback()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'The music could not start.')
    }
  }

  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2

  return (
    <aside className={`music-dock ${expanded ? 'is-expanded' : ''}`} aria-label="Music player">
      {expanded && (
        <div className="music-panel" id="music-controls">
          <div className="music-panel-heading">
            <span className="music-orbit" aria-hidden="true">
              <Music2 size={17} strokeWidth={1.6} />
            </span>
            <div>
              <p className="music-kicker">{track.isCustom ? 'Our song' : 'Original soundtrack'}</p>
              <p className="music-title">{track.name}</p>
            </div>
          </div>

          <div className="music-equalizer-row">
            <div className={`music-equalizer ${isPlaying && !isMuted ? 'is-playing' : ''}`} aria-hidden="true">
              {Array.from({ length: 17 }, (_, index) => (
                <span key={index} style={{ animationDelay: `${index * -0.09}s` }} />
              ))}
            </div>
            <span className="music-status">{isPlaying ? (isMuted ? 'Muted' : 'Playing softly') : 'Ready when you are'}</span>
          </div>

          <label className="music-volume">
            <VolumeIcon size={15} aria-hidden="true" />
            <span className="sr-only">Music volume</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={(event) => onVolumeChange(Number(event.target.value))}
              aria-label="Music volume"
            />
            <span className="music-volume-value" aria-hidden="true">
              {Math.round((isMuted ? 0 : volume) * 100)}
            </span>
          </label>

          <button type="button" className="music-upload-link" onClick={onChangeTrack}>
            <Upload size={13} strokeWidth={1.8} aria-hidden="true" />
            {track.isCustom ? 'Change our song' : 'Use a song that’s ours'}
          </button>
          <p className="music-note">It only starts when you press play. Promise.</p>
        </div>
      )}

      <div className="music-bar">
        <button
          type="button"
          className="music-play"
          onClick={handlePlayback}
          disabled={isBusy}
          aria-label={isPlaying ? 'Pause background music' : 'Play background music'}
        >
          {isBusy ? (
            <LoaderCircle size={17} className="spin" aria-hidden="true" />
          ) : isPlaying ? (
            <Pause size={16} fill="currentColor" aria-hidden="true" />
          ) : (
            <Play size={16} fill="currentColor" aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          className="music-meta"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls="music-controls"
          aria-label={expanded ? 'Collapse music player' : 'Expand music player'}
        >
          <span className={`music-mini-bars ${isPlaying && !isMuted ? 'is-playing' : ''}`} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="music-meta-copy">
            <span>{track.name}</span>
            <small>{isPlaying ? 'now playing' : 'our little soundtrack'}</small>
          </span>
          <ChevronDown size={14} className={expanded ? 'is-flipped' : ''} aria-hidden="true" />
        </button>

        <button
          type="button"
          className="music-mute"
          onClick={onToggleMuted}
          aria-label={isMuted ? 'Unmute music' : 'Mute music'}
          aria-pressed={isMuted}
        >
          <VolumeIcon size={16} strokeWidth={1.7} aria-hidden="true" />
        </button>
      </div>
    </aside>
  )
}
