import { useCallback, useEffect, useState } from 'react'
import type { CustomizerTab, GiftMode, Memory, SiteContent } from './types'
import { isPhotoReferenced, newId } from './lib/content'
import { useCloudAccess } from './hooks/useCloudAccess'
import { useSiteContent } from './hooks/useSiteContent'
import { usePhotoLibrary } from './hooks/usePhotoLibrary'
import { useAudioLibrary } from './hooks/useAudioLibrary'
import { useSoundtrack } from './hooks/useSoundtrack'
import { useToasts } from './hooks/useToasts'
import { NavBar } from './components/NavBar'
import { Hero } from './components/Hero'
import { WishesSection } from './components/WishesSection'
import { MemoriesSection } from './components/MemoriesSection'
import { ReasonsSection } from './components/ReasonsSection'
import { Footer } from './components/Footer'
import { MusicDock } from './components/MusicDock'
import { Customizer } from './components/Customizer'
import { ToastViewport } from './components/ui/ToastViewport'
import { GiftAccessGate, GiftBootScreen, GiftLoadError } from './components/AccessGate'

function ScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0)
    }
    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div className="scroll-progress" aria-hidden="true">
      <span style={{ transform: `scaleX(${progress})` }} />
    </div>
  )
}

interface GiftExperienceProps {
  mode: GiftMode
  onLock?: () => Promise<void>
}

function GiftExperience({ mode, onLock }: GiftExperienceProps) {
  const { toasts, notify, dismissToast } = useToasts()
  const { content, updateContent, isReady, loadError, retryLoad } = useSiteContent(
    mode,
    notify,
  )
  const { photos, addPhoto, removePhoto } = usePhotoLibrary(mode, notify)
  const { track, isLoading: isAudioLoading, uploadTrack, removeTrack } = useAudioLibrary(
    mode,
    notify,
  )
  const soundtrack = useSoundtrack(track)
  const [customizerTab, setCustomizerTab] = useState<CustomizerTab | null>(null)
  const isCloud = mode === 'cloud'

  const openCustomizer = (tab: CustomizerTab = 'story') => setCustomizerTab(tab)
  const closeCustomizer = () => setCustomizerTab(null)

  const cleanupPhotoIfUnused = useCallback(
    async (imageId: string | null | undefined, nextContent: SiteContent) => {
      if (!imageId || isPhotoReferenced(imageId, nextContent)) return
      try {
        await removePhoto(imageId)
      } catch (error) {
        console.warn('The old photo could not be cleared from storage.', error)
      }
    },
    [removePhoto],
  )

  const handleUploadCover = useCallback(
    async (file: File) => {
      const oldImageId = content.cover.imageId
      const photo = await addPhoto(file, { maxDimension: 2800 })
      const nextContent: SiteContent = {
        ...content,
        cover: { ...content.cover, imageId: photo.id },
      }
      updateContent((current) => ({
        ...current,
        cover: { ...current.cover, imageId: photo.id },
      }))
      await cleanupPhotoIfUnused(oldImageId, nextContent)
    },
    [addPhoto, cleanupPhotoIfUnused, content, updateContent],
  )

  const handleRemoveCover = useCallback(async () => {
    const oldImageId = content.cover.imageId
    const nextContent: SiteContent = {
      ...content,
      cover: { ...content.cover, imageId: null },
    }
    updateContent((current) => ({
      ...current,
      cover: { ...current.cover, imageId: null },
    }))
    await cleanupPhotoIfUnused(oldImageId, nextContent)
  }, [cleanupPhotoIfUnused, content, updateContent])

  const handleUploadFloatingPhoto = useCallback(
    async (photoId: string, file: File) => {
      const oldImageId = content.floatingPhotos.find((photo) => photo.id === photoId)?.imageId
      const photo = await addPhoto(file, { maxDimension: 1600 })
      const nextPhotos = content.floatingPhotos.map((item) =>
        item.id === photoId ? { ...item, imageId: photo.id } : item,
      )
      const nextContent: SiteContent = { ...content, floatingPhotos: nextPhotos }
      updateContent((current) => ({
        ...current,
        floatingPhotos: current.floatingPhotos.map((item) =>
          item.id === photoId ? { ...item, imageId: photo.id } : item,
        ),
      }))
      await cleanupPhotoIfUnused(oldImageId, nextContent)
    },
    [addPhoto, cleanupPhotoIfUnused, content, updateContent],
  )

  const handleRemoveFloatingPhoto = useCallback(
    async (photoId: string) => {
      const existing = content.floatingPhotos.find((photo) => photo.id === photoId)
      const nextPhotos = content.floatingPhotos.filter((photo) => photo.id !== photoId)
      const nextContent: SiteContent = { ...content, floatingPhotos: nextPhotos }
      updateContent((current) => ({
        ...current,
        floatingPhotos: current.floatingPhotos.filter((photo) => photo.id !== photoId),
      }))
      await cleanupPhotoIfUnused(existing?.imageId, nextContent)
    },
    [cleanupPhotoIfUnused, content, updateContent],
  )

  const handleAddMemories = useCallback(
    (drafts: Array<Pick<Memory, 'imageId' | 'caption' | 'date'>>) => {
      const created = drafts.map((draft, index) => ({
        ...draft,
        id: newId(),
        createdAt: Date.now() + index,
      }))
      updateContent((current) => ({
        ...current,
        memories: [...current.memories, ...created],
      }))
    },
    [updateContent],
  )

  const handleUpdateMemory = useCallback(
    (id: string, patch: Pick<Memory, 'imageId' | 'caption' | 'date'>) => {
      const existing = content.memories.find((memory) => memory.id === id)
      const nextMemories = content.memories.map((memory) =>
        memory.id === id ? { ...memory, ...patch } : memory,
      )
      const nextContent: SiteContent = { ...content, memories: nextMemories }
      updateContent((current) => ({
        ...current,
        memories: current.memories.map((memory) =>
          memory.id === id ? { ...memory, ...patch } : memory,
        ),
      }))
      if (existing && existing.imageId !== patch.imageId) {
        void cleanupPhotoIfUnused(existing.imageId, nextContent)
      }
    },
    [cleanupPhotoIfUnused, content, updateContent],
  )

  const handleDeleteMemory = useCallback(
    (id: string) => {
      const existing = content.memories.find((memory) => memory.id === id)
      const nextContent: SiteContent = {
        ...content,
        memories: content.memories.filter((memory) => memory.id !== id),
      }
      updateContent((current) => ({
        ...current,
        memories: current.memories.filter((memory) => memory.id !== id),
      }))
      if (existing) void cleanupPhotoIfUnused(existing.imageId, nextContent)
    },
    [cleanupPhotoIfUnused, content, updateContent],
  )

  const handleUploadTrack = useCallback(
    async (file: File) => {
      await uploadTrack(file)
    },
    [uploadTrack],
  )

  const handleRemoveTrack = useCallback(async () => {
    await removeTrack()
  }, [removeTrack])

  if (isCloud && !isReady) {
    return loadError ? (
      <GiftLoadError
        message={loadError}
        onRetry={retryLoad}
        onLock={onLock ? () => void onLock() : undefined}
      />
    ) : (
      <GiftBootScreen message="Gathering your memories…" />
    )
  }

  return (
    <div className="site-root">
      <a className="skip-link" href="#main-content">
        Skip to the celebration
      </a>
      <ScrollProgress />
      <NavBar herName={content.herName} onPersonalize={() => openCustomizer('story')} />

      <main id="main-content">
        <Hero
          content={content}
          photos={photos}
          onOpenPhotoEditor={() => openCustomizer('photos')}
        />
        <WishesSection content={content} onEdit={() => openCustomizer('story')} />
        <MemoriesSection
          content={content}
          photos={photos}
          addPhoto={addPhoto}
          isCloud={isCloud}
          onAddMemories={handleAddMemories}
          onUpdateMemory={handleUpdateMemory}
          onDeleteMemory={handleDeleteMemory}
          notify={notify}
        />
        <ReasonsSection content={content} onEdit={() => openCustomizer('story')} />
      </main>

      <Footer
        content={content}
        isCloud={isCloud}
        onPersonalize={() => openCustomizer('story')}
        onLock={onLock ? () => void onLock() : undefined}
      />

      <MusicDock
        track={track}
        isPlaying={soundtrack.isPlaying}
        isBusy={soundtrack.isBusy}
        isMuted={soundtrack.isMuted}
        volume={soundtrack.volume}
        onTogglePlayback={soundtrack.togglePlayback}
        onToggleMuted={soundtrack.toggleMuted}
        onVolumeChange={soundtrack.setVolume}
        onChangeTrack={() => openCustomizer('soundtrack')}
        onError={(message) => notify(message, 'error')}
      />

      <ToastViewport toasts={toasts} onDismiss={dismissToast} />

      {customizerTab && (
        <Customizer
          content={content}
          photos={photos}
          initialTab={customizerTab}
          track={track}
          isAudioLoading={isAudioLoading}
          isCloud={isCloud}
          onClose={closeCustomizer}
          onUpdateContent={updateContent}
          onUploadCover={handleUploadCover}
          onRemoveCover={handleRemoveCover}
          onUploadFloatingPhoto={handleUploadFloatingPhoto}
          onRemoveFloatingPhoto={handleRemoveFloatingPhoto}
          onUploadTrack={handleUploadTrack}
          onRemoveTrack={handleRemoveTrack}
          notify={notify}
        />
      )}
    </div>
  )
}

function App() {
  const access = useCloudAccess()

  if (access.status === 'detecting') return <GiftBootScreen />
  if (access.status === 'locked') {
    return (
      <GiftAccessGate
        onUnlock={access.unlock}
        isUnlocking={access.isUnlocking}
        error={access.error}
      />
    )
  }

  return (
    <GiftExperience
      key={access.mode}
      mode={access.mode}
      onLock={access.mode === 'cloud' ? access.lock : undefined}
    />
  )
}

export default App
