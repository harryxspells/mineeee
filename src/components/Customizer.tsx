import {
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Heart,
  Image as ImageIcon,
  ImagePlus,
  Images,
  LoaderCircle,
  Music2,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react'
import type { CustomizerTab, FloatingPhoto, PhotoMap, SiteContent, ToastMessage } from '../types'
import type { AudioTrack } from '../types'
import {
  ACCEPTED_IMAGE_ACCEPT,
  audioValidationError,
  imageValidationError,
} from '../lib/media'
import { newId } from '../lib/content'
import { Modal } from './ui/Modal'
import coverPlaceholder from '../assets/cover-placeholder.webp'

interface CustomizerProps {
  content: SiteContent
  photos: PhotoMap
  initialTab: CustomizerTab
  track: AudioTrack
  isAudioLoading: boolean
  isCloud: boolean
  onClose: () => void
  onUpdateContent: (updater: (current: SiteContent) => SiteContent) => void
  onUploadCover: (file: File) => Promise<void>
  onRemoveCover: () => Promise<void>
  onUploadFloatingPhoto: (photoId: string, file: File) => Promise<void>
  onRemoveFloatingPhoto: (photoId: string) => Promise<void>
  onUploadTrack: (file: File) => Promise<void>
  onRemoveTrack: () => Promise<void>
  notify: (message: string, tone?: ToastMessage['tone']) => void
}

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
}

function InputField({ label, hint, ...props }: InputFieldProps) {
  return (
    <label className="form-field">
      <span className="form-label">{label}</span>
      <input {...props} />
      {hint && <small className="form-hint">{hint}</small>}
    </label>
  )
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  hint?: string
}

function TextareaField({ label, hint, ...props }: TextareaFieldProps) {
  return (
    <label className="form-field">
      <span className="form-label">{label}</span>
      <textarea {...props} />
      {hint && <small className="form-hint">{hint}</small>}
    </label>
  )
}

function EditorBlock({
  kicker,
  title,
  description,
  children,
}: {
  kicker: string
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="editor-block">
      <div className="editor-block-heading">
        <p>{kicker}</p>
        <h3>{title}</h3>
        {description && <span>{description}</span>}
      </div>
      <div className="editor-block-body">{children}</div>
    </section>
  )
}

interface FloatingPhotoEditorProps {
  photo: FloatingPhoto
  index: number
  total: number
  imageUrl?: string
  onPatch: (patch: Partial<FloatingPhoto>) => void
  onUpload: (file: File) => Promise<void>
  onRemove: () => Promise<void>
  onMove: (direction: -1 | 1) => void
  notify: (message: string, tone?: ToastMessage['tone']) => void
}

function FloatingPhotoEditor({
  photo,
  index,
  total,
  imageUrl,
  onPatch,
  onUpload,
  onRemove,
  onMove,
  notify,
}: FloatingPhotoEditorProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [isBusy, setIsBusy] = useState(false)

  const handleFile = async (file?: File) => {
    if (!file) return
    const validation = imageValidationError(file)
    if (validation) {
      notify(validation, 'error')
      return
    }
    setIsBusy(true)
    try {
      await onUpload(file)
      notify(`Floating photo ${index + 1} is ready.`)
    } catch (error) {
      notify(error instanceof Error ? error.message : 'That photo could not be added.', 'error')
    } finally {
      setIsBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const handleRemove = async () => {
    if (isBusy) return
    setIsBusy(true)
    try {
      await onRemove()
    } catch {
      notify('That photo could not be removed.', 'error')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="floating-editor">
      <div className="floating-editor-thumb">
        {imageUrl ? (
          <img src={imageUrl} alt="" />
        ) : (
          <span>
            <Heart size={18} strokeWidth={1.3} aria-hidden="true" />
          </span>
        )}
        <small>{String(index + 1).padStart(2, '0')}</small>
      </div>

      <div className="floating-editor-content">
        <div className="floating-editor-top">
          <strong>Floating photo {index + 1}</strong>
          <div className="floating-order">
            <button
              type="button"
              className="icon-button icon-button--small"
              onClick={() => onMove(-1)}
              disabled={index === 0 || isBusy}
              aria-label={`Move floating photo ${index + 1} earlier`}
            >
              <ArrowLeft size={13} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="icon-button icon-button--small"
              onClick={() => onMove(1)}
              disabled={index === total - 1 || isBusy}
              aria-label={`Move floating photo ${index + 1} later`}
            >
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>
        </div>

        <InputField
          label="Polaroid caption"
          type="text"
          value={photo.caption}
          maxLength={42}
          placeholder="the loveliest day"
          onChange={(event) => onPatch({ caption: event.target.value })}
        />

        <label className="rotation-field">
          <span>
            Tilt <small>{photo.rotation}°</small>
          </span>
          <input
            type="range"
            min="-14"
            max="14"
            step="1"
            value={photo.rotation}
            onChange={(event) => onPatch({ rotation: Number(event.target.value) })}
            aria-label={`Tilt of floating photo ${index + 1}`}
          />
        </label>

        <div className="floating-editor-actions">
          <button
            type="button"
            className="btn-secondary btn-small"
            onClick={() => fileInput.current?.click()}
            disabled={isBusy}
          >
            {isBusy ? (
              <LoaderCircle size={13} className="spin" aria-hidden="true" />
            ) : imageUrl ? (
              <RotateCcw size={13} aria-hidden="true" />
            ) : (
              <ImagePlus size={13} aria-hidden="true" />
            )}
            {isBusy ? 'Saving…' : imageUrl ? 'Replace' : 'Add photo'}
          </button>
          <button
            type="button"
            className="danger-text-button"
            onClick={handleRemove}
            disabled={isBusy}
          >
            <Trash2 size={13} aria-hidden="true" />
            Remove
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED_IMAGE_ACCEPT}
          className="sr-only"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
      </div>
    </div>
  )
}

const TABS: Array<{ id: CustomizerTab; label: string; icon: typeof Heart }> = [
  { id: 'story', label: 'Birthday details', icon: Heart },
  { id: 'photos', label: 'Cover & photos', icon: Camera },
  { id: 'soundtrack', label: 'Soundtrack', icon: Music2 },
]

export function Customizer({
  content,
  photos,
  initialTab,
  track,
  isAudioLoading,
  isCloud,
  onClose,
  onUpdateContent,
  onUploadCover,
  onRemoveCover,
  onUploadFloatingPhoto,
  onRemoveFloatingPhoto,
  onUploadTrack,
  onRemoveTrack,
  notify,
}: CustomizerProps) {
  const [activeTab, setActiveTab] = useState<CustomizerTab>(initialTab)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const coverInput = useRef<HTMLInputElement>(null)
  const audioInput = useRef<HTMLInputElement>(null)
  const [coverBusy, setCoverBusy] = useState(false)
  const [audioBusy, setAudioBusy] = useState(false)
  const [audioError, setAudioError] = useState('')
  const [floatingBusy, setFloatingBusy] = useState('')

  const update = (patch: Partial<SiteContent>) =>
    onUpdateContent((current) => ({ ...current, ...patch }))

  const updateCover = (patch: Partial<SiteContent['cover']>) =>
    onUpdateContent((current) => ({ ...current, cover: { ...current.cover, ...patch } }))

  const patchFloatingPhoto = (id: string, patch: Partial<FloatingPhoto>) =>
    onUpdateContent((current) => ({
      ...current,
      floatingPhotos: current.floatingPhotos.map((photo) =>
        photo.id === id ? { ...photo, ...patch } : photo,
      ),
    }))

  const moveFloatingPhoto = (id: string, direction: -1 | 1) =>
    onUpdateContent((current) => {
      const next = [...current.floatingPhotos]
      const index = next.findIndex((photo) => photo.id === id)
      const target = index + direction
      if (index < 0 || target < 0 || target >= next.length) return current
      ;[next[index], next[target]] = [next[target], next[index]]
      return { ...current, floatingPhotos: next }
    })

  const addFloatingPhoto = () => {
    if (content.floatingPhotos.length >= 4) return
    const rotations = [-7, 5, 4, -5]
    const next: FloatingPhoto = {
      id: newId(),
      imageId: null,
      caption: '',
      rotation: rotations[content.floatingPhotos.length] ?? 0,
    }
    update({ floatingPhotos: [...content.floatingPhotos, next] })
  }

  const handleCoverUpload = async (file?: File) => {
    if (!file) return
    const validation = imageValidationError(file)
    if (validation) {
      notify(validation, 'error')
      return
    }
    setCoverBusy(true)
    try {
      await onUploadCover(file)
      notify('Your cover photo is in place.')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'The cover photo could not be added.', 'error')
    } finally {
      setCoverBusy(false)
      if (coverInput.current) coverInput.current.value = ''
    }
  }

  const handleCoverRemove = async () => {
    setCoverBusy(true)
    try {
      await onRemoveCover()
      notify('The dreamy placeholder is back.', 'info')
    } catch {
      notify('The cover photo could not be removed.', 'error')
    } finally {
      setCoverBusy(false)
    }
  }

  const handleFloatingUpload = async (id: string, file: File) => {
    setFloatingBusy(id)
    try {
      await onUploadFloatingPhoto(id, file)
    } finally {
      setFloatingBusy('')
    }
  }

  const handleFloatingRemove = async (id: string) => {
    setFloatingBusy(id)
    try {
      await onRemoveFloatingPhoto(id)
      notify('That floating photo was removed.', 'info')
    } finally {
      setFloatingBusy('')
    }
  }

  const handleAudioUpload = async (file?: File) => {
    if (!file) return
    const validation = audioValidationError(file)
    if (validation) {
      setAudioError(validation)
      notify(validation, 'error')
      return
    }
    setAudioBusy(true)
    setAudioError('')
    try {
      await onUploadTrack(file)
      notify('Your song is ready. Press play whenever you like.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'That song could not be added.'
      setAudioError(message)
      notify(message, 'error')
    } finally {
      setAudioBusy(false)
      if (audioInput.current) audioInput.current.value = ''
    }
  }

  const handleAudioRemove = async () => {
    setAudioBusy(true)
    setAudioError('')
    try {
      await onRemoveTrack()
      notify('Back to the original soundtrack.', 'info')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The song could not be removed.'
      setAudioError(message)
      notify(message, 'error')
    } finally {
      setAudioBusy(false)
    }
  }

  const onTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const xdirection = event.key === 'ArrowRight' ? 1 : -1
    const nextIndex = (index + xdirection + TABS.length) % TABS.length
    setActiveTab(TABS[nextIndex].id)
    tabRefs.current[nextIndex]?.focus()
  }

  const coverUrl = content.cover.imageId ? photos[content.cover.imageId] : null
  const currentTabLabel = TABS.find((tab) => tab.id === activeTab)?.label

  return (
    <Modal
      open
      onClose={onClose}
      labelledBy="customizer-title"
      panelClassName="customizer-modal"
      overlayClassName="customizer-overlay"
    >
      <header className="customizer-header">
        <div className="customizer-heading">
          <p className="customizer-kicker">your private editing room</p>
          <h2 id="customizer-title">Make it personal.</h2>
          <p>
            {isCloud
              ? 'Every change saves automatically to your private gift, on every device.'
              : 'Every change saves automatically on this device.'}
          </p>
        </div>
        <span className="customizer-saved">
          <Check size={13} aria-hidden="true" />
          saved
        </span>
      </header>

      <div className="customizer-tabs" role="tablist" aria-label="Personalization sections">
        {TABS.map((tab, index) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              ref={(element) => {
                tabRefs.current[index] = element
              }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              className={`customizer-tab ${activeTab === tab.id ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
              data-autofocus={activeTab === tab.id ? true : undefined}
            >
              <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div
        className="customizer-body"
        id={`panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
        aria-label={`${currentTabLabel} settings`}
      >
        {activeTab === 'story' && (
          <>
            <EditorBlock
              kicker="the birthday star"
              title="Names & the date"
              description="The little details that make this corner of the internet yours."
            >
              <div className="form-grid form-grid--two">
                <InputField
                  label="Her name"
                  value={content.herName}
                  onChange={(event) => update({ herName: event.target.value })}
                  placeholder="Birthday Girl"
                  maxLength={40}
                />
                <InputField
                  label="Your name"
                  value={content.yourName}
                  onChange={(event) => update({ yourName: event.target.value })}
                  placeholder="Your name"
                  maxLength={40}
                  hint="Signs the letter & surprise."
                />
              </div>
              <InputField
                label="Birthday date"
                type="date"
                value={content.birthday}
                onChange={(event) => update({ birthday: event.target.value })}
              />
            </EditorBlock>

            <EditorBlock
              kicker="the opening"
              title="Hero words"
              description="Shown over your cover photo, before anything else."
            >
              <InputField
                label="Opening title"
                value={content.heroTitle}
                onChange={(event) => update({ heroTitle: event.target.value })}
                placeholder="Happy Birthday, Beautiful"
                maxLength={80}
                hint="Add a comma to split the title across two lines."
              />
              <TextareaField
                label="Opening subtitle"
                value={content.heroSubtitle}
                onChange={(event) => update({ heroSubtitle: event.target.value })}
                rows={3}
                maxLength={280}
              />
            </EditorBlock>

            <EditorBlock
              kicker="the birthday letter"
              title="Birthday wish"
              description="Leave a blank line between paragraphs to create breathing room."
            >
              <InputField
                label="Letter heading"
                value={content.wishHeading}
                onChange={(event) => update({ wishHeading: event.target.value })}
                maxLength={60}
              />
              <TextareaField
                label="Your birthday message"
                value={content.wishMessage}
                onChange={(event) => update({ wishMessage: event.target.value })}
                rows={12}
                maxLength={6000}
              />
              <div className="form-grid form-grid--two">
                <InputField
                  label="Signature"
                  value={content.signature}
                  onChange={(event) => update({ signature: event.target.value })}
                  maxLength={60}
                />
                <div className="form-note">
                  <span>{content.wishMessage.length.toLocaleString()} characters</span>
                  <small>Saved as you type.</small>
                </div>
              </div>
            </EditorBlock>

            <EditorBlock
              kicker="the little things"
              title="Reasons to celebrate you"
              description="Change any of these, or make them entirely your own."
            >
              <div className="reason-editors">
                {content.reasons.map((reason, index) => (
                  <div className="reason-editor" key={reason.id}>
                    <span className="reason-editor-number">{String(index + 1).padStart(2, '0')}</span>
                    <textarea
                      value={reason.text}
                      onChange={(event) =>
                        update({
                          reasons: content.reasons.map((item) =>
                            item.id === reason.id ? { ...item, text: event.target.value } : item,
                          ),
                        })
                      }
                      rows={2}
                      maxLength={180}
                      aria-label={`Reason ${index + 1}`}
                    />
                    <button
                      type="button"
                      className="icon-button icon-button--small"
                      onClick={() =>
                        update({
                          reasons: content.reasons.filter((item) => item.id !== reason.id),
                        })
                      }
                      disabled={content.reasons.length <= 1}
                      aria-label={`Remove reason ${index + 1}`}
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="add-reason-button"
                disabled={content.reasons.length >= 12}
                onClick={() =>
                  update({
                    reasons: [
                      ...content.reasons,
                      { id: newId(), text: 'A new reason you deserve to be celebrated…' },
                    ],
                  })
                }
              >
                <Heart size={13} aria-hidden="true" />
                Add another reason
              </button>
            </EditorBlock>

            <EditorBlock
              kicker="the last surprise"
              title="What you’ll reveal at the end"
              description="A final birthday message, waiting behind the surprise button."
            >
              <InputField
                label="Surprise heading"
                value={content.surpriseTitle}
                onChange={(event) => update({ surpriseTitle: event.target.value })}
                maxLength={80}
              />
              <TextareaField
                label="Hidden message"
                value={content.surpriseMessage}
                onChange={(event) => update({ surpriseMessage: event.target.value })}
                rows={8}
                maxLength={3000}
              />
            </EditorBlock>
          </>
        )}

        {activeTab === 'photos' && (
          <>
            <EditorBlock
              kicker="the main photograph"
              title="Your cover photo"
              description="This sits behind everything. Choose a photo that captures a favorite day."
            >
              <div className="cover-editor">
                <div className="cover-preview">
                  <img
                    src={coverUrl ?? coverPlaceholder}
                    alt={coverUrl ? 'Current cover preview' : 'Placeholder cover preview'}
                    style={{
                      objectPosition: `${content.cover.positionX}% ${content.cover.positionY}%`,
                    }}
                  />
                  <span
                    className="cover-preview-overlay"
                    style={{ background: `rgba(9, 5, 4, ${content.cover.overlay / 100})` }}
                    aria-hidden="true"
                  />
                  <span className="cover-preview-label">{coverUrl ? 'your cover' : 'placeholder'}</span>
                  {coverBusy && (
                    <span className="cover-preview-busy">
                      <LoaderCircle size={20} className="spin" aria-hidden="true" />
                    </span>
                  )}
                </div>

                <div className="cover-editor-controls">
                  <button
                    type="button"
                    className="btn-primary btn-small"
                    onClick={() => coverInput.current?.click()}
                    disabled={coverBusy}
                  >
                    {coverBusy ? (
                      <LoaderCircle size={14} className="spin" aria-hidden="true" />
                    ) : (
                      <Upload size={14} aria-hidden="true" />
                    )}
                    {coverUrl ? 'Replace cover photo' : 'Upload cover photo'}
                  </button>
                  {content.cover.imageId && (
                    <button
                      type="button"
                      className="danger-text-button"
                      onClick={() => void handleCoverRemove()}
                      disabled={coverBusy}
                    >
                      <Trash2 size={13} aria-hidden="true" />
                      Remove
                    </button>
                  )}
                  <input
                    ref={coverInput}
                    type="file"
                    accept={ACCEPTED_IMAGE_ACCEPT}
                    className="sr-only"
                    onChange={(event) => void handleCoverUpload(event.target.files?.[0])}
                  />
                  <p className="form-hint">
                    JPG, PNG or WebP · up to 15 MB.{' '}
                    {isCloud ? 'Saved privately to your gift.' : 'It stays on this device.'}
                  </p>
                </div>
              </div>

              <div className="cover-position-grid">
                <label className="range-field">
                  <span>
                    Horizontal focus <small>{content.cover.positionX}%</small>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={content.cover.positionX}
                    onChange={(event) => updateCover({ positionX: Number(event.target.value) })}
                  />
                </label>
                <label className="range-field">
                  <span>
                    Vertical focus <small>{content.cover.positionY}%</small>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={content.cover.positionY}
                    onChange={(event) => updateCover({ positionY: Number(event.target.value) })}
                  />
                </label>
                <label className="range-field">
                  <span>
                    Dreamy overlay <small>{content.cover.overlay}%</small>
                  </span>
                  <input
                    type="range"
                    min="25"
                    max="85"
                    value={content.cover.overlay}
                    onChange={(event) => updateCover({ overlay: Number(event.target.value) })}
                  />
                </label>
                <button
                  type="button"
                  className="reset-focus-button"
                  onClick={() => updateCover({ positionX: 50, positionY: 50 })}
                >
                  <RotateCcw size={12} aria-hidden="true" />
                  Center photo
                </button>
              </div>

              <label className="switch-row">
                <span>
                  <strong>Gentle parallax</strong>
                  <small>The cover drifts softly as the page moves. Turn it off if you prefer stillness.</small>
                </span>
                <span className="switch">
                  <input
                    type="checkbox"
                    checked={content.cover.parallax}
                    onChange={(event) => updateCover({ parallax: event.target.checked })}
                  />
                  <span className="switch-track" aria-hidden="true">
                    <span />
                  </span>
                </span>
              </label>
            </EditorBlock>

            <EditorBlock
              kicker="the scrapbook"
              title="Floating polaroids"
              description="Up to four photos float around your opening words on desktop and settle below them on mobile."
            >
              <div className="floating-editors">
                {content.floatingPhotos.map((photo, index) => (
                  <FloatingPhotoEditor
                    key={photo.id}
                    photo={photo}
                    index={index}
                    total={content.floatingPhotos.length}
                    imageUrl={photo.imageId ? photos[photo.imageId] : undefined}
                    onPatch={(patch) => patchFloatingPhoto(photo.id, patch)}
                    onUpload={(file) => handleFloatingUpload(photo.id, file)}
                    onRemove={() => handleFloatingRemove(photo.id)}
                    onMove={(direction) => moveFloatingPhoto(photo.id, direction)}
                    notify={notify}
                  />
                ))}
              </div>

              {content.floatingPhotos.length < 4 && (
                <button type="button" className="add-floating-button" onClick={addFloatingPhoto}>
                  <ImagePlus size={15} aria-hidden="true" />
                  Add a floating photo
                  <span>{content.floatingPhotos.length}/4</span>
                </button>
              )}
              {content.floatingPhotos.length >= 4 && (
                <p className="editor-footnote">
                  <Images size={13} aria-hidden="true" />
                  All four spots are filled. Remove one to rearrange your little collection.
                </p>
              )}
              {floatingBusy && <span className="sr-only">Saving floating photo…</span>}
            </EditorBlock>

            <EditorBlock
              kicker="more happy moments"
              title="The memories gallery"
              description="Add, caption, replace, and remove gallery photos right from the memories section."
            >
              <a href="#upload-photos" className="editor-link-card" onClick={onClose}>
                <span className="editor-link-icon">
                  <ImageIcon size={16} aria-hidden="true" />
                </span>
                <span>
                  <strong>Go to the gallery upload area</strong>
                  <small>{content.memories.length} memories saved so far</small>
                </span>
                <ArrowRight size={15} aria-hidden="true" />
              </a>
            </EditorBlock>
          </>
        )}

        {activeTab === 'soundtrack' && (
          <>
            <EditorBlock
              kicker="the background score"
              title="A song for this moment"
              description="The built-in melody was made for this little celebration. You can also add a favorite song of your own."
            >
              <div className="audio-current">
                <span className="audio-art" aria-hidden="true">
                  <Music2 size={20} strokeWidth={1.5} />
                </span>
                <div className="audio-current-copy">
                  <p>
            {isAudioLoading
              ? 'Loading your song…'
              : track.isCustom
                ? 'Your song'
                : 'Original soundtrack'}
          </p>
                  <h4>{isAudioLoading ? 'One moment…' : track.name}</h4>
                  <span>
                    {track.isCustom
                      ? isCloud
                        ? 'Saved privately to your gift'
                        : 'Chosen from your device'
                      : 'A gentle music-box melody · loops softly'}
                  </span>
                </div>
                {isAudioLoading ? (
                  <LoaderCircle size={18} className="spin" aria-hidden="true" />
                ) : (
                  <Check size={16} className="audio-ready-icon" aria-hidden="true" />
                )}
              </div>

              <div className="audio-actions">
                <button
                  type="button"
                  className="btn-primary btn-small"
                  onClick={() => audioInput.current?.click()}
                  disabled={audioBusy || isAudioLoading}
                >
                  {audioBusy ? (
                    <LoaderCircle size={14} className="spin" aria-hidden="true" />
                  ) : (
                    <Upload size={14} aria-hidden="true" />
                  )}
                  {audioBusy ? 'Saving your song…' : track.isCustom ? 'Choose a different song' : 'Add your own song'}
                </button>
                {track.isCustom && (
                  <button
                    type="button"
                    className="danger-text-button"
                    onClick={() => void handleAudioRemove()}
                    disabled={audioBusy}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                    Use the built-in melody
                  </button>
                )}
                <input
                  ref={audioInput}
                  type="file"
                  accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm,.aac"
                  className="sr-only"
                  onChange={(event) => void handleAudioUpload(event.target.files?.[0])}
                />
              </div>

              {audioError && (
                <p className="form-error" role="alert">
                  {audioError}
                </p>
              )}

              <div className="audio-notes">
                <p>
                  <strong>No autoplay, ever.</strong> Nothing will start playing until the play
                  button is pressed. The music player rests in the bottom corner, with volume and
                  mute controls.
                </p>
                <p>
                  MP3, M4A, WAV, OGG or WebM · up to 20 MB. Your song is stored privately{' '}
                  {isCloud ? 'in your gift.' : 'in this browser.'}
                </p>
              </div>
            </EditorBlock>

            <div className="editor-quote">
              <span aria-hidden="true">“</span>
              <p>Music is what feelings sound like when words run out.</p>
            </div>
          </>
        )}
      </div>

      <footer className="customizer-footer">
        <span>
          <Check size={12} aria-hidden="true" />
          All changes save automatically
        </span>
        <button type="button" className="btn-primary btn-small" onClick={onClose}>
          Done
        </button>
      </footer>
    </Modal>
  )
}
