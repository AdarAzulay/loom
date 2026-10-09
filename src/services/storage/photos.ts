import { z } from 'zod'

const photoId = z.string().min(1).max(100)

export const photoRecordSchema = z.object({
  id: photoId,
  itemId: photoId,
  mimeType: z.string().regex(/^image\//, 'Photos must be images.'),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  bytes: z.number().int().nonnegative(),
  createdAt: z.number().int().nonnegative(),
  blob: z.instanceof(Blob),
}).strict()

export type PhotoRecord = z.infer<typeof photoRecordSchema>

const storedPhotoRecordSchema = z.object({
  id: photoId,
  itemId: photoId,
  mimeType: z.string().regex(/^image\//),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  bytes: z.number().int().nonnegative(),
  createdAt: z.number().int().nonnegative(),
  blob: z.unknown(),
}).strict()

export class PhotoBlobStorageError extends Error {
  constructor() { super('This browser cannot store Blob values in IndexedDB directly.') }
}

export function validatePhotoRecord(value: unknown): PhotoRecord {
  return photoRecordSchema.parse(value)
}

export function readStoredPhoto(value: unknown): PhotoRecord {
  const record = storedPhotoRecordSchema.parse(value)
  if (record.blob instanceof Blob) return photoRecordSchema.parse(record)
  if (record.blob instanceof ArrayBuffer) return photoRecordSchema.parse({ ...record, blob: new Blob([record.blob], { type: record.mimeType }) })
  throw new Error('Saved photo data could not be validated.')
}

export async function toBinaryPhoto(photo: PhotoRecord): Promise<Omit<PhotoRecord, 'blob'> & { blob: ArrayBuffer }> {
  return { ...photo, blob: await photo.blob.arrayBuffer() }
}
