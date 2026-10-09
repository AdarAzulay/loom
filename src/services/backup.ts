import { librarySchema } from '../models/domain'
import type { Library } from '../models/domain'
import type { PhotoRecord } from './storage/photos'

type EncodedPhoto = Omit<PhotoRecord, 'blob'> & { blob: string }
export type BackupPayload = { schemaVersion: 3; revision: number; exportedAt: string; data: Library; photos: EncodedPhoto[] }

function bytesToBase64(bytes: ArrayBuffer): string {
  const values = new Uint8Array(bytes)
  let binary = ''
  for (let index = 0; index < values.length; index += 0x8000) binary += String.fromCharCode(...values.subarray(index, index + 0x8000))
  return btoa(binary)
}

function base64ToArrayBuffer(value: string): ArrayBuffer {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes.buffer
}

export async function createBackup(data: Library, photos: readonly PhotoRecord[]): Promise<string> {
  const encoded = await Promise.all(photos.map(async photo => ({ ...photo, blob: bytesToBase64(await photo.blob.arrayBuffer()) })))
  return JSON.stringify({ schemaVersion: 3, revision: 0, exportedAt: new Date().toISOString(), data: librarySchema.parse(data), photos: encoded } satisfies BackupPayload)
}

export function parseBackup(text: string): { data: Library; photos: PhotoRecord[] } {
  const payload = JSON.parse(text) as Partial<BackupPayload>
  if (payload.schemaVersion !== 3 || !payload.data) throw new Error('This is not a supported Loom backup.')
  const data = librarySchema.parse(payload.data)
  const photos = (payload.photos ?? []).map(photo => ({ ...photo, blob: new Blob([base64ToArrayBuffer(photo.blob)], { type: photo.mimeType }) })) as PhotoRecord[]
  return { data, photos }
}
