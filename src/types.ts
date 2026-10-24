export type GiftMode = 'local' | 'cloud'

export interface FloatingPhoto {
  id: string
  imageId: string | null
  caption: string
  rotation: number
}

export interface Memory {
  id: string
  imageId: string
  caption: string
  date: string
  createdAt: number
}

export interface CoverSettings {
  imageId: string | null
  positionX: number
  positionY: number
  overlay: number
  parallax: boolean
}

export interface Reason {
  id: string
  text: string
}

export interface SiteContent {
  herName: string
  yourName: string
  birthday: string
  heroTitle: string
  heroSubtitle: string
  cover: CoverSettings
  floatingPhotos: FloatingPhoto[]
  wishHeading: string
  wishMessage: string
  signature: string
  reasons: Reason[]
  surpriseTitle: string
  surpriseMessage: string
  memories: Memory[]
}

export type PhotoMap = Record<string, string>

export type CustomizerTab = 'story' | 'photos' | 'soundtrack'

export interface StoredAudio {
  id: string
  name: string
  type: string
  blob: Blob
  createdAt: number
}

export interface AudioTrack {
  name: string
  url: string
  isCustom: boolean
}

export interface ToastMessage {
  id: number
  message: string
  tone: 'success' | 'error' | 'info'
}
