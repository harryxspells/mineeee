export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const ACCEPTED_IMAGE_ACCEPT = ACCEPTED_IMAGE_TYPES.join(',')
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024
export const MAX_MEMORY_FILES = 20
export const MAX_MEMORIES = 60

export interface ProcessedImage {
  blob: Blob
  width: number
  height: number
}

export function imageValidationError(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return `“${file.name}” isn’t a JPG, PNG, or WebP image.`
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `“${file.name}” is over 15 MB. Please choose a smaller photo.`
  }
  if (file.size === 0) {
    return `“${file.name}” is empty. Please try another photo.`
  }
  return null
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('This photo could not be opened.'))
    image.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

export async function processImage(
  file: File,
  options: { maxDimension?: number; quality?: number } = {},
): Promise<ProcessedImage> {
  const validation = imageValidationError(file)
  if (validation) throw new Error(validation)

  const { maxDimension = 2200, quality = 0.84 } = options
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = await loadImage(objectUrl)
    const largestSide = Math.max(image.naturalWidth, image.naturalHeight)
    const scale = largestSide > maxDimension ? maxDimension / largestSide : 1
    const width = Math.max(1, Math.round(image.naturalWidth * scale))
    const height = Math.max(1, Math.round(image.naturalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Your browser could not prepare this photo.')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, 0, 0, width, height)

    let blob = await canvasToBlob(canvas, 'image/webp', quality)
    if (!blob) blob = await canvasToBlob(canvas, 'image/jpeg', 0.88)
    if (!blob) throw new Error('This photo could not be optimized. Please try another one.')

    return { blob, width, height }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

const AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/aac',
]

export function audioValidationError(file: File): string | null {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const acceptedExtension = ['mp3', 'm4a', 'wav', 'ogg', 'oga', 'webm', 'aac'].includes(extension)
  if (!AUDIO_TYPES.includes(file.type) && !acceptedExtension) {
    return 'Please choose an MP3, M4A, WAV, OGG, or WebM audio file.'
  }
  if (file.size > MAX_AUDIO_BYTES) return 'That song is over 20 MB. Please choose a smaller file.'
  return null
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
