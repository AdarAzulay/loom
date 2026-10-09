import { librarySchema } from '../../models/domain'
import type { Library } from '../../models/domain'
import { migrateV1Envelope, migrateV2Envelope, readEnvelope, readLegacyEnvelope, readV2Envelope, StorageConflictError } from './repository'
import type { Envelope, LegacyEnvelope, LibraryRepository, V2Envelope } from './repository'
import { PhotoBlobStorageError, readStoredPhoto, toBinaryPhoto, validatePhotoRecord } from './photos'
import type { PhotoRecord } from './photos'

const databaseVersion = 3
const storeName = 'library'
const photoStoreName = 'photos'
const legacyStoreName = 'library-v1'
const v2StoreName = 'library-v2'
const key = 'current'
const pendingMigrationKey = 'migration-v3'

export class IndexedDbRepository implements LibraryRepository {
  // Preserve pre-Loom data; branding must not change the database identity.
  constructor(private readonly name = 'roam-library') {}

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, databaseVersion)
      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName)
        if (!database.objectStoreNames.contains(photoStoreName)) database.createObjectStore(photoStoreName, { keyPath: 'id' })
        if (!database.objectStoreNames.contains(legacyStoreName)) database.createObjectStore(legacyStoreName)
        if (!database.objectStoreNames.contains(v2StoreName)) database.createObjectStore(v2StoreName)
      }
      request.onerror = () => reject(new Error('Local storage could not be opened. Check browser storage permissions.'))
      request.onblocked = () => reject(new Error('Close other Loom tabs and retry opening local storage.'))
      request.onsuccess = () => {
        const db = request.result
        db.onversionchange = () => db.close()
        resolve(db)
      }
    })
  }

  async load(): Promise<Envelope | null> {
    const db = await this.open()
    try {
      const raw = await this.readCurrent(db)
      if (raw === undefined) return null
      const version = typeof raw === 'object' && raw !== null && 'schemaVersion' in raw ? raw.schemaVersion : undefined
      if (version === 1) return await this.migrateCurrent(db, raw, legacyStoreName, migrateV1Envelope, readLegacyEnvelope)
      if (version === 2) return await this.migrateCurrent(db, raw, v2StoreName, migrateV2Envelope, readV2Envelope)
      return readEnvelope(raw)
    } finally { db.close() }
  }

  async save(data: Library, expectedRevision: number, photos: readonly PhotoRecord[] = []): Promise<Envelope> {
    const validData = librarySchema.parse(data)
    const validPhotos = photos.map(validatePhotoRecord)
    try {
      return await this.saveEnvelope(validData, expectedRevision, validPhotos)
    } catch (error) {
      // WebKit automation (and some Safari storage modes) rejects Blob values
      // in IndexedDB. Keep the same binary photo API and transparently store an
      // ArrayBuffer fallback for that browser instead of losing the item save.
      if (!(error instanceof PhotoBlobStorageError) || !validPhotos.length) throw error
      const binaryPhotos = await Promise.all(validPhotos.map(toBinaryPhoto))
      return this.saveEnvelope(validData, expectedRevision, binaryPhotos)
    }
  }

  private async saveEnvelope(data: Library, expectedRevision: number, photos: readonly PhotoRecord[] | readonly (Omit<PhotoRecord, 'blob'> & { blob: ArrayBuffer })[]): Promise<Envelope> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName, photoStoreName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const photoStore = transaction.objectStore(photoStoreName)
      const request = store.get(key)
      const envelope: Envelope = { schemaVersion: 3, revision: expectedRevision + 1, data }
      let failure: Error | undefined
      request.onsuccess = () => {
        try {
          const current = request.result === undefined ? null : this.readCurrentEnvelope(request.result)
          if ((current?.revision ?? 0) !== expectedRevision) throw new StorageConflictError()
          for (const photo of photos) {
            const photoRequest = photoStore.put(photo)
            photoRequest.onerror = () => {
              failure = new PhotoBlobStorageError()
              transaction.abort()
            }
          }
          store.put(envelope, key)
        } catch (error) {
          failure = error instanceof Error ? error : new Error('Saved data could not be checked.')
          transaction.abort()
        }
      }
      transaction.oncomplete = () => { db.close(); resolve(envelope) }
      transaction.onabort = transaction.onerror = () => {
        db.close()
        reject(failure ?? new Error(`Local save failed${transaction.error?.message ? `: ${transaction.error.message}` : ''}. Your edits are kept in this tab. Retry or download your draft.`))
      }
    })
  }

  async loadPhotos(ids: readonly string[]): Promise<PhotoRecord[]> {
    if (!ids.length) return []
    const wanted = new Set(ids)
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(photoStoreName, 'readonly')
      const request = transaction.objectStore(photoStoreName).openCursor()
      const records: PhotoRecord[] = []
      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) return
        if (wanted.has(String(cursor.key))) {
          try { records.push(readStoredPhoto(cursor.value)) }
          catch (error) { transaction.abort(); reject(error); return }
        }
        cursor.continue()
      }
      transaction.oncomplete = () => { db.close(); resolve(ids.flatMap(id => records.filter(record => record.id === id))) }
      transaction.onabort = transaction.onerror = () => { db.close(); reject(new Error('Photos could not be read. Please retry.')) }
    })
  }

  async loadAllPhotos(): Promise<PhotoRecord[]> {
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(photoStoreName, 'readonly')
      const request = transaction.objectStore(photoStoreName).openCursor()
      const records: PhotoRecord[] = []
      request.onsuccess = () => {
        const cursor = request.result
        if (!cursor) return
        try { records.push(readStoredPhoto(cursor.value)) }
        catch (error) { transaction.abort(); reject(error); return }
        cursor.continue()
      }
      transaction.oncomplete = () => { db.close(); resolve(records) }
      transaction.onabort = transaction.onerror = () => { db.close(); reject(new Error('Photos could not be read. Please retry.')) }
    })
  }

  private readCurrent(db: IDBDatabase): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly')
      const request = transaction.objectStore(storeName).get(key)
      transaction.oncomplete = () => resolve(request.result)
      transaction.onabort = transaction.onerror = () => reject(new Error('Local data could not be read. Please retry.'))
    })
  }

  private readCurrentEnvelope(value: unknown): Envelope | LegacyEnvelope | V2Envelope {
    const version = typeof value === 'object' && value !== null && 'schemaVersion' in value ? value.schemaVersion : undefined
    return version === 1 ? readLegacyEnvelope(value) : version === 2 ? readV2Envelope(value) : readEnvelope(value)
  }

  private migrateCurrent(db: IDBDatabase, raw: unknown, preservationStoreName: string, migrate: (value: unknown) => Envelope, readPrevious: (value: unknown) => unknown): Promise<Envelope> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName, preservationStoreName], 'readwrite')
      const store = transaction.objectStore(storeName)
      const legacyStore = transaction.objectStore(preservationStoreName)
      const request = store.get(key)
      let migrated: Envelope | undefined
      let failure: Error | undefined
      request.onsuccess = () => {
        try {
          // Re-read inside the write transaction. The v1 record remains current until
          // the verified v2 record and its preserved legacy copy commit together.
          const current = request.result === undefined ? raw : request.result
          migrated = migrate(current)
          store.put(migrated, pendingMigrationKey)
          const verify = store.get(pendingMigrationKey)
          verify.onsuccess = () => {
            try {
              const verified = readEnvelope(verify.result)
              readPrevious(current)
              legacyStore.put(current, key)
              store.put(verified, key)
              store.delete(pendingMigrationKey)
              migrated = verified
            } catch (error) {
              failure = error instanceof Error ? error : new Error('Saved data could not be migrated.')
              transaction.abort()
            }
          }
        } catch (error) {
          failure = error instanceof Error ? error : new Error('Saved data could not be migrated.')
          transaction.abort()
        }
      }
      transaction.oncomplete = () => { if (migrated) resolve(migrated); else reject(new Error('Saved data could not be migrated.')) }
      transaction.onabort = transaction.onerror = () => reject(failure ?? new Error('Saved data could not be migrated. Stored data has not been changed.'))
    })
  }
}
