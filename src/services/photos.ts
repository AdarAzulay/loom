import type { PhotoRecord } from './storage/photos'

export const maxPhotoDimension = 1200

type EncodedPhoto = { blob: Blob; width: number; height: number }

async function encodePhoto(file: File, maxDimension = maxPhotoDimension): Promise<EncodedPhoto> {
  if (typeof createImageBitmap === 'function' && typeof document !== 'undefined') {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const encoded = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(result => result ? resolve(result) : reject(new Error('This photo could not be compressed.')), 'image/jpeg', 0.82)
    })
    return { blob: new Blob([encoded], { type: 'image/jpeg' }), width, height }
  }
  // Tests and older browsers can still persist the original image safely. The
  // normal phone path above resizes it before it reaches IndexedDB.
  return { blob: new Blob([file], { type: file.type }), width: 0, height: 0 }
}

export async function preparePhotoRecords(itemId: string, files: readonly File[], maxDimension = maxPhotoDimension): Promise<PhotoRecord[]> {
  const records: PhotoRecord[] = []
  for (const file of files) {
    if (!file.type.startsWith('image/')) throw new Error('Choose image files only.')
    const encoded = await encodePhoto(file, maxDimension)
    records.push({
      id: crypto.randomUUID(), itemId, mimeType: encoded.blob.type || file.type,
      width: encoded.width, height: encoded.height, bytes: encoded.blob.size,
      createdAt: Date.now(), blob: encoded.blob,
    })
  }
  return records
}

export function photoPayloadBytes(photos: readonly PhotoRecord[]): number {
  // Backup step 2 will add the JSON envelope and base64/file packaging. This
  // reports the durable image bytes so that backup sizing is measurable now.
  return photos.reduce((total, photo) => total + photo.bytes, 0)
}
