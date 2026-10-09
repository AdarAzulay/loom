import { z } from 'zod'
import { librarySchema } from '../../models/domain'
import type { Library } from '../../models/domain'

const envelopeSchema = z.object({
  schemaVersion: z.literal(1), revision: z.number().int().nonnegative(), data: librarySchema,
}).strict()
export type Envelope = z.infer<typeof envelopeSchema>

export function readEnvelope(value: unknown): Envelope {
  const version = z.object({ schemaVersion: z.number() }).safeParse(value)
  if (version.success && version.data.schemaVersion !== 1) {
    throw new Error('This library uses a different Loom version. Stored data has not been changed.')
  }
  const result = envelopeSchema.safeParse(value)
  if (!result.success) throw new Error('Saved data could not be validated. Stored data has not been changed.')
  return result.data
}

/** Repositories confirm durable writes and reject a stale expected revision. */
export interface LibraryRepository {
  load(): Promise<Envelope | null>
  save(data: Library, expectedRevision: number): Promise<Envelope>
}

export class StorageConflictError extends Error {
  constructor() { super('Another tab saved newer changes. Download your draft, then reload to review the saved version.') }
}
