import { useRef, useState, type DragEvent } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  Images,
  PencilLine,
  Plus,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import type { Memory, PhotoMap, SiteContent, ToastMessage } from '../types'
import { formatReadableDate } from '../lib/content'
import {
  ACCEPTED_IMAGE_ACCEPT,
  MAX_MEMORIES,
  MAX_MEMORY_FILES,
  imageValidationError,
} from '../lib/media'
import { Modal } from './ui/Modal'
import { AddMemoriesDialog, EditMemoryDialog } from './memories/MemoryDialogs'

interface MemoriesSectionProps {
  content: SiteContent
  photos: PhotoMap
  addPhoto: (file: File) => Promise<{ id: string }>
  isCloud: boolean
  onAddMemories: (memories: Array<Pick<Memory, 'imageId' | 'caption' | 'date'>>) => void
  onUpdateMemory: (id: string, patch: Pick<Memory, 'imageId' | 'caption' | 'date'>) => void
  onDeleteMemory: (id: string) => void
  notify: (message: string, tone?: ToastMessage['tone']) => void
}

interface LightboxProps {
  memories: Memory[]
  photos: PhotoMap
  index: number
  onIndexChange: (index: number) => void
  onClose: () => void
  onEdit: (memory: Memory) => void
  onDelete: (memory: Memory) => void
}

function Lightbox({
  memories,
  photos,
  index,
  onIndexChange,
  onClose,
  onEdit,
  onDelete,
}: LightboxProps) {
  const memory = memories[index]
  if (!memory) return null
  const imageUrl = photos[memory.imageId]
  const date = formatReadableDate(memory.date)
  const total = memories.length
  const goTo = (nextIndex: number) => onIndexChange((nextIndex + total) % total)

  return (
    <Modal
      open
      onClose={onClose}
      labelledBy="lightbox-caption"
      panelClassName="lightbox"
      closeLabel="Close memory"
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          goTo(index - 1)
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault()
          goTo(index + 1)
        }
      }}
    >
      <div className="lightbox-layout">
        <div className="lightbox-image-wrap">
          {imageUrl ? (
            <img src={imageUrl} alt={memory.caption || 'A favorite memory'} />
          ) : (
            <div className="lightbox-missing">
              <Heart size={34} strokeWidth={1.2} aria-hidden="true" />
              <p>This photo isn’t available right now.</p>
            </div>
          )}
          {total > 1 && (
            <>
              <button
                type="button"
                className="lightbox-arrow lightbox-arrow--prev"
                onClick={() => goTo(index - 1)}
                aria-label="Previous memory"
              >
                <ChevronLeft size={20} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="lightbox-arrow lightbox-arrow--next"
                onClick={() => goTo(index + 1)}
                aria-label="Next memory"
              >
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        <div className="lightbox-meta">
          <p className="lightbox-count">
            memory {String(index + 1).padStart(2, '0')} <span>/</span>{' '}
            {String(total).padStart(2, '0')}
          </p>
          <h2 id="lightbox-caption">{memory.caption || 'A memory worth keeping.'}</h2>
          {date && (
            <p className="lightbox-date">
              <CalendarDays size={14} aria-hidden="true" />
              {date}
            </p>
          )}
          <div className="lightbox-actions">
            <button type="button" className="btn-secondary btn-small" onClick={() => onEdit(memory)}>
              <PencilLine size={14} aria-hidden="true" />
              Edit memory
            </button>
            <button
              type="button"
              className="lightbox-delete"
              onClick={() => onDelete(memory)}
              aria-label="Delete this memory"
            >
              <Trash2 size={15} aria-hidden="true" />
            </button>
          </div>
          <p className="lightbox-hint">Use ← → to wander through the memories</p>
        </div>
      </div>
    </Modal>
  )
}

interface EmptyMemoryStateProps {
  onChoose: () => void
}

function EmptyMemoryState({ onChoose }: EmptyMemoryStateProps) {
  return (
    <div className="memory-empty">
      <div className="empty-photo-stack" aria-hidden="true">
        <span className="empty-photo-stack-card empty-photo-stack-card--back">
          <span />
        </span>
        <span className="empty-photo-stack-card empty-photo-stack-card--middle">
          <span />
        </span>
        <span className="empty-photo-stack-card empty-photo-stack-card--front">
          <Heart size={22} strokeWidth={1.2} />
          <small>the memories start here</small>
        </span>
      </div>
      <div>
        <h3>Your first memory belongs here.</h3>
        <p>
          Choose a photo that makes you smile — a favorite day, a spontaneous adventure, or a
          moment you never want to forget.
        </p>
        <button type="button" className="text-button memory-empty-button" onClick={onChoose}>
          <ImageIcon size={14} aria-hidden="true" />
          Choose the first photo
        </button>
      </div>
    </div>
  )
}

export function MemoriesSection({
  content,
  photos,
  addPhoto,
  isCloud,
  onAddMemories,
  onUpdateMemory,
  onDeleteMemory,
  notify,
}: MemoriesSectionProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null)
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null)
  const [deletingMemory, setDeletingMemory] = useState<Memory | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const openFilePicker = () => fileInput.current?.click()

  const handleFiles = (files: File[]) => {
    if (!files.length) return
    const available = MAX_MEMORIES - content.memories.length
    if (available <= 0) {
      notify(
        `Your gallery is full at ${MAX_MEMORIES} photos. Remove one before adding another.`,
        'error',
      )
      return
    }

    const roomThisTime = Math.min(available, MAX_MEMORY_FILES)
    const valid: File[] = []
    let firstError = ''

    for (const file of files) {
      const error = imageValidationError(file)
      if (error) {
        if (!firstError) firstError = error
        continue
      }
      if (valid.length < roomThisTime) valid.push(file)
    }

    if (files.length > roomThisTime && !firstError) {
      firstError = `You can add up to ${roomThisTime} more ${
        roomThisTime === 1 ? 'memory' : 'memories'
      } at a time.`
    }

    if (firstError) notify(firstError, valid.length ? 'info' : 'error')
    if (valid.length) setPendingFiles(valid)
  }

  const handleInputChange = (files: FileList | null) => {
    handleFiles(Array.from(files ?? []))
    if (fileInput.current) fileInput.current.value = ''
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    handleFiles(Array.from(event.dataTransfer.files))
  }

  const handleDelete = () => {
    if (!deletingMemory) return
    onDeleteMemory(deletingMemory.id)
    if (
      lightboxIndex !== null &&
      content.memories[lightboxIndex]?.id === deletingMemory.id
    ) {
      setLightboxIndex(null)
    }
    setDeletingMemory(null)
    notify('That memory has been tucked away.')
  }

  const lightboxMemory = lightboxIndex !== null ? content.memories[lightboxIndex] : undefined

  return (
    <section id="memories" data-nav="memories" className="memories-section" aria-labelledby="memories-title">
      <div className="section-glow section-glow--right" aria-hidden="true" />
      <div className="page-shell">
        <div className="chapter-head">
          <p className="eyebrow">
            <span className="eyebrow-number">02</span>
            <span className="eyebrow-line" aria-hidden="true" />
            the moments worth keeping
          </p>
          <span className="memory-count">
            {String(content.memories.length).padStart(2, '0')}{' '}
            {content.memories.length === 1 ? 'memory' : 'memories'}
          </span>
        </div>

        <div className="memories-heading">
          <h2 id="memories-title" className="section-title">
            Our Beautiful <span className="script-word">Memories</span>
          </h2>
          <p>
            Every picture holds a little piece of the story — the laughs, the adventures, and all
            the good times in between. There’s always room for more.
          </p>
        </div>

        <div
          id="upload-photos"
          data-nav="upload-photos"
          className={`memory-upload-panel ${isDragging ? 'is-dragging' : ''}`}
          onDragEnter={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false)
          }}
          onDrop={handleDrop}
        >
          <div className="memory-upload-mark" aria-hidden="true">
            <Images size={21} strokeWidth={1.4} />
          </div>
          <div className="memory-upload-copy">
            <p className="memory-upload-kicker">grow the birthday gallery</p>
            <h3>{isDragging ? 'Drop them right here.' : 'A home for every happy memory.'}</h3>
            <p>Choose several photos at once, preview them, then add your own words and dates.</p>
          </div>
          <div className="memory-upload-actions">
            <button type="button" className="btn-primary" onClick={openFilePicker}>
              <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
              Add Our Memories +
            </button>
            <span className="memory-upload-hint">
              <UploadCloud size={13} aria-hidden="true" />
              JPG, PNG or WebP · up to 15 MB each
            </span>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED_IMAGE_ACCEPT}
            multiple
            className="sr-only"
            onChange={(event) => handleInputChange(event.target.files)}
          />
        </div>

        {content.memories.length ? (
          <div className="memory-grid">
            {content.memories.map((memory, index) => {
              const imageUrl = photos[memory.imageId]
              const date = formatReadableDate(memory.date)
              return (
                <article className="memory-card" key={memory.id}>
                  <button
                    type="button"
                    className="memory-photo-button"
                    onClick={() => setLightboxIndex(index)}
                    aria-label={`Open memory ${index + 1}: ${memory.caption || 'a favorite memory'}`}
                  >
                    {imageUrl ? (
                      <img src={imageUrl} alt="" loading="lazy" />
                    ) : (
                      <span className="memory-image-missing">
                        <Heart size={24} strokeWidth={1.2} aria-hidden="true" />
                      </span>
                    )}
                    <span className="memory-card-shade" aria-hidden="true" />
                    <span className="memory-open-hint" aria-hidden="true">
                      <span>revisit this moment</span>
                      <span className="memory-open-icon">
                        <ImageIcon size={14} />
                      </span>
                    </span>
                  </button>
                  <div className="memory-card-body">
                    <div className="memory-card-copy">
                      <p>{memory.caption || 'A memory worth keeping.'}</p>
                      {date && (
                        <span className="memory-card-date">
                          <CalendarDays size={12} strokeWidth={1.7} aria-hidden="true" />
                          {date}
                        </span>
                      )}
                    </div>
                    <div className="memory-card-actions">
                      <button
                        type="button"
                        className="memory-card-action"
                        onClick={() => setEditingMemory(memory)}
                        aria-label={`Edit memory ${index + 1}`}
                      >
                        <PencilLine size={14} strokeWidth={1.8} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="memory-card-action memory-card-action--delete"
                        onClick={() => setDeletingMemory(memory)}
                        aria-label={`Delete memory ${index + 1}`}
                      >
                        <Trash2 size={14} strokeWidth={1.8} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}

            {content.memories.length < MAX_MEMORIES && (
              <button type="button" className="memory-add-tile" onClick={openFilePicker}>
                <span className="memory-add-tile-icon">
                  <Plus size={20} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span>Add another little moment</span>
                <small>more memories are always welcome</small>
              </button>
            )}
          </div>
        ) : (
          <EmptyMemoryState onChoose={openFilePicker} />
        )}

      </div>

      {pendingFiles && (
        <AddMemoriesDialog
          files={pendingFiles}
          onClose={() => setPendingFiles(null)}
          addPhoto={addPhoto}
          notify={notify}
          isCloud={isCloud}
          onAdd={onAddMemories}
        />
      )}

      {editingMemory && (
        <EditMemoryDialog
          memory={editingMemory}
          imageUrl={photos[editingMemory.imageId]}
          onClose={() => setEditingMemory(null)}
          addPhoto={addPhoto}
          notify={notify}
          isCloud={isCloud}
          onSave={(patch) => onUpdateMemory(editingMemory.id, patch)}
        />
      )}

      {lightboxMemory && lightboxIndex !== null && (
        <Lightbox
          memories={content.memories}
          photos={photos}
          index={lightboxIndex}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onEdit={(memory) => {
            setLightboxIndex(null)
            setEditingMemory(memory)
          }}
          onDelete={(memory) => {
            setLightboxIndex(null)
            setDeletingMemory(memory)
          }}
        />
      )}

      <Modal
        open={Boolean(deletingMemory)}
        onClose={() => setDeletingMemory(null)}
        labelledBy="delete-memory-title"
        panelClassName="confirm-dialog"
      >
        <span className="confirm-icon" aria-hidden="true">
          <Trash2 size={20} strokeWidth={1.5} />
        </span>
        <h2 id="delete-memory-title">Let this one go?</h2>
        <p>
          This will remove “{deletingMemory?.caption || 'this memory'}” from your gallery. It can’t
          be undone.
        </p>
        <div className="confirm-actions">
          <button type="button" className="btn-secondary" onClick={() => setDeletingMemory(null)}>
            Keep it
          </button>
          <button type="button" className="btn-danger" onClick={handleDelete}>
            <Trash2 size={14} aria-hidden="true" />
            Delete memory
          </button>
        </div>
      </Modal>
    </section>
  )
}
