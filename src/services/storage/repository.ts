import { z } from 'zod'
import { legacyLibrarySchema, librarySchema, migrateV1Library, migrateV2Library } from '../../models/domain'
import type { Library } from '../../models/domain'
import type { PhotoRecord } from './photos'

const envelopeSchema = z.object({
  schemaVersion: z.literal(3), revision: z.number().int().nonnegative(), data: librarySchema,
}).strict()
export type Envelope = z.infer<typeof envelopeSchema>

const v2EnvelopeSchema = z.object({
  schemaVersion: z.literal(2), revision: z.number().int().nonnegative(), data: z.unknown(),
}).strict()
export type V2Envelope = z.infer<typeof v2EnvelopeSchema>

const legacyEnvelopeSchema = z.object({
  schemaVersion: z.literal(1), revision: z.number().int().nonnegative(), data: legacyLibrarySchema,
}).strict()
export type LegacyEnvelope = z.infer<typeof legacyEnvelopeSchema>

export function readEnvelope(value: unknown): Envelope {
  const result = envelopeSchema.safeParse(value)
  const version = z.object({ schemaVersion: z.number() }).safeParse(value)
  if (!result.success && version.success && version.data.schemaVersion !== 3) {
    throw new Error('This library uses a different Loom version. Stored data has not been changed.')
  }
  if (!result.success) throw new Error('Saved data could not be validated. Stored data has not been changed.')
  return result.data
}

export function readLegacyEnvelope(value: unknown): LegacyEnvelope {
  const result = legacyEnvelopeSchema.safeParse(value)
  if (!result.success) throw new Error('Saved v1 data could not be validated. Stored data has not been changed.')
  return result.data
}

export function migrateV1Envelope(value: unknown): Envelope {
  const legacy = readLegacyEnvelope(value)
  return envelopeSchema.parse({ schemaVersion: 3, revision: legacy.revision, data: migrateV1Library(legacy.data) })
}

export function readV2Envelope(value: unknown): V2Envelope {
  const result = v2EnvelopeSchema.safeParse(value)
  if (!result.success) throw new Error('Saved v2 data could not be validated. Stored data has not been changed.')
  return result.data
}

export function migrateV2Envelope(value: unknown): Envelope {
  const previous = readV2Envelope(value)
  return envelopeSchema.parse({ schemaVersion: 3, revision: previous.revision, data: migrateV2Library(previous.data) })
}

/** Repositories confirm durable writes and reject a stale expected revision. */
export interface LibraryRepository {
  load(): Promise<Envelope | null>
  save(data: Library, expectedRevision: number, photos?: readonly PhotoRecord[]): Promise<Envelope>
  loadPhotos?(ids: readonly string[]): Promise<PhotoRecord[]>
  loadAllPhotos?(): Promise<PhotoRecord[]>
}

export class StorageConflictError extends Error {
  constructor() { super('Another tab saved newer changes. Download your draft, then reload to review the saved version.') }
}
