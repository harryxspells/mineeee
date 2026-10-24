import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CalendarDays, ImagePlus, LoaderCircle, Trash2 } from 'lucide-react'
import type { Memory, ToastMessage } from '../../types'
import { newId } from '../../lib/content'
import { ACCEPTED_IMAGE_ACCEPT, imageValidationError } from '../../lib/media'
import { Modal } from '../ui/Modal'

interface CommonDialogProps {
  onClose: () => void
  addPhoto: (file: File) => Promise<{ id: string }>
  notify: (message: string, tone?: ToastMessage['tone']) => void
  isCloud: boolean
}

interface AddMemoriesDialogProps extends CommonDialogProps {
  files: File[]
  onAdd: (memories: Array<Pick<Memory, 'imageId' | 'caption' | 'date'>>) => void
}

interface AddItem {
  key: string
  file: File
  previewUrl: string
  caption: string
  date: string
}

export function AddMemoriesDialog({ files, onClose, addPhoto, onAdd, notify }: AddMemoriesDialogProps) {
  const [items, setItems] = useState<AddItem[]>(() =>
    files.map((file) => ({
      key: newId(),
      file,
      previewUrl: URL.createObjectURL(file),
      caption: '',
      date: '',
    })),
  )
  const createdUrls = useRef(new Set(items.map((item) => item.previewUrl)))
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const submittingRef = useRef(false)

  useEffect(() => {
    const urls = createdUrls.current
    return () => {
      for (const url of urls) URL.revokeObjectURL(url)
    }
  }, [])

  const removeItem = (key: string) => {
    setItems((current) => {
      const target = current.find((item) => item.key === key)
      if (target) {
        URL.revokeObjectURL(target.previewUrl)
        createdUrls.current.delete(target.previewUrl)
      }
      return current.filter((item) => item.key !== key)
    })
  }

  const updateItem = (key: string, patch: Partial<Pick<AddItem, 'caption' | 'date'>>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (submittingRef.current || !items.length) return
    submittingRef.current = true
    setIsSaving(true)
    setError('')

    const saved: Array<Pick<Memory, 'imageId' | 'caption' | 'date'>> = []
    const failed: AddItem[] = []
    let firstError = ''

    for (const item of items) {
      try {
        const { id } = await addPhoto(item.file)
        saved.push({ imageId: id, caption: item.caption.trim(), date: item.date })
        URL.revokeObjectURL(item.previewUrl)
        createdUrls.current.delete(item.previewUrl)
      } catch (uploadError) {
        failed.push(item)
        if (!firstError) {
          firstError =
            uploadError instanceof Error ? uploadError.message : 'One photo could not be saved.'
        }
      }
    }

    if (saved.length) onAdd(saved)

    if (failed.length) {
      setItems(failed)
      setError(
        `${firstError}${saved.length ? ` The other ${saved.length === 1 ? 'memory was' : 'memories were'} added.` : ''}`,
      )
      if (saved.length) notify('A few memories were added — one needs another try.', 'info')
      setIsSaving(false)
      submittingRef.current = false
      return
    }

    notify(
      saved.length === 1
        ? 'One beautiful memory has been added.'
        : `${saved.length} beautiful memories have been added.`,
    )
    setIsSaving(false)
    submittingRef.current = false
    onClose()
  }

  return (
    <Modal
      open
      onClose={isSaving ? () => undefined : onClose}
      labelledBy="add-memories-title"
      panelClassName="memory-dialog"
    >
      <div className="dialog-kicker">
        <span />
        a new page in our story
      </div>
      <h2 id="add-memories-title" className="dialog-title">
        Let’s keep this moment.
      </h2>
      <p className="dialog-copy">
        Add a little note and a date to each memory — or leave them quiet and let the photos speak.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="memory-preview-list">
          {items.map((item, index) => (
            <div className="memory-preview" key={item.key}>
              <div className="memory-preview-image">
                <img src={item.previewUrl} alt={`Preview of ${item.file.name}`} />
                <span>{String(index + 1).padStart(2, '0')}</span>
              </div>
              <div className="memory-preview-fields">
                <label>
                  <span>Caption</span>
                  <input
                    type="text"
                    value={item.caption}
                    onChange={(event) => updateItem(item.key, { caption: event.target.value })}
                    placeholder="The way you laughed right after this…"
                    maxLength={140}
                    data-autofocus={index === 0 ? true : undefined}
                  />
                </label>
                <label>
                  <span>Date</span>
                  <span className="input-with-icon">
                    <CalendarDays size={14} aria-hidden="true" />
                    <input
                      type="date"
                      value={item.date}
                      onChange={(event) => updateItem(item.key, { date: event.target.value })}
                    />
                  </span>
                </label>
              </div>
              <button
                type="button"
                className="icon-button memory-preview-remove"
                onClick={() => removeItem(item.key)}
                aria-label={`Remove ${item.file.name} from this upload`}
                disabled={isSaving}
              >
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>

        {!items.length && (
          <p className="dialog-empty">
            Every photo has been removed. Close this window and choose your memories again.
          </p>
        )}

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="dialog-actions">
          <p className="dialog-note">{items.length} photo{items.length === 1 ? '' : 's'} ready</p>
          <div className="dialog-action-buttons">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSaving || !items.length}
            >
              {isSaving && <LoaderCircle size={15} className="spin" aria-hidden="true" />}
              {isSaving
                ? 'Adding our memories…'
                : `Add ${items.length === 1 ? 'this memory' : `${items.length} memories`}`}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

interface EditMemoryDialogProps extends CommonDialogProps {
  memory: Memory
  imageUrl?: string
  onSave: (patch: Pick<Memory, 'imageId' | 'caption' | 'date'>) => void
}

export function EditMemoryDialog({
  memory,
  imageUrl,
  onClose,
  addPhoto,
  onSave,
  notify,
  isCloud,
}: EditMemoryDialogProps) {
  const [caption, setCaption] = useState(memory.caption)
  const [date, setDate] = useState(memory.date)
  const [replacement, setReplacement] = useState<File | null>(null)
  const [replacementUrl, setReplacementUrl] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const createdUrl = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (createdUrl.current) URL.revokeObjectURL(createdUrl.current)
    }
  }, [])

  const chooseReplacement = (file?: File) => {
    if (!file) return
    const validation = imageValidationError(file)
    setError(validation ?? '')
    if (validation) return
    if (createdUrl.current) URL.revokeObjectURL(createdUrl.current)
    const url = URL.createObjectURL(file)
    createdUrl.current = url
    setReplacement(file)
    setReplacementUrl(url)
  }

  const cancelReplacement = () => {
    if (createdUrl.current) URL.revokeObjectURL(createdUrl.current)
    createdUrl.current = null
    setReplacement(null)
    setReplacementUrl(null)
    if (fileInput.current) fileInput.current.value = ''
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (isSaving) return
    setIsSaving(true)
    setError('')
    try {
      let imageId = memory.imageId
      if (replacement) {
        const photo = await addPhoto(replacement)
        imageId = photo.id
      }
      onSave({ imageId, caption: caption.trim(), date })
      notify(replacement ? 'The memory and its photo were updated.' : 'Your memory was updated.')
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'This memory could not be updated.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={isSaving ? () => undefined : onClose}
      labelledBy="edit-memory-title"
      panelClassName="memory-dialog memory-dialog--edit"
    >
      <div className="dialog-kicker">
        <span />
        a memory worth keeping
      </div>
      <h2 id="edit-memory-title" className="dialog-title">
        Keep it exactly how it felt.
      </h2>

      <form onSubmit={handleSubmit}>
        <div className="memory-edit-layout">
          <div className="memory-edit-photo">
            <img
              src={replacementUrl ?? imageUrl}
              alt={caption ? `Memory: ${caption}` : 'Our memory'}
            />
            <div className="memory-edit-photo-actions">
              <button
                type="button"
                className="btn-secondary btn-small"
                onClick={() => fileInput.current?.click()}
                disabled={isSaving}
              >
                <ImagePlus size={14} aria-hidden="true" />
                {replacement ? 'Choose another' : 'Replace photo'}
              </button>
              {replacement && (
                <button
                  type="button"
                  className="text-button text-button--light"
                  onClick={cancelReplacement}
                  disabled={isSaving}
                >
                  Keep original
                </button>
              )}
            </div>
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPTED_IMAGE_ACCEPT}
              className="sr-only"
              onChange={(event) => chooseReplacement(event.target.files?.[0])}
            />
            {replacement && <p className="memory-edit-replacement">New photo ready — save to keep it.</p>}
          </div>

          <div className="memory-edit-fields">
            <label>
              <span>Caption</span>
              <input
                type="text"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                placeholder="A little note about this moment"
                maxLength={140}
                data-autofocus
              />
            </label>
            <label>
              <span>Date</span>
              <span className="input-with-icon">
                <CalendarDays size={14} aria-hidden="true" />
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </span>
            </label>
            <p className="field-hint">
              JPG, PNG, or WebP · up to 15 MB ·{' '}
              {isCloud ? 'saved privately to your gift.' : 'photos stay in this browser.'}
            </p>
          </div>
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="dialog-actions">
          <span className="dialog-note">
            {isCloud ? 'Saved privately, just for us.' : 'Saved locally, just for us.'}
          </span>
          <div className="dialog-action-buttons">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving && <LoaderCircle size={15} className="spin" aria-hidden="true" />}
              {isSaving ? 'Saving…' : 'Save this memory'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
