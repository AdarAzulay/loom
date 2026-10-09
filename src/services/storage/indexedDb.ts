import { librarySchema } from '../../models/domain'
import type { Library } from '../../models/domain'
import { readEnvelope, StorageConflictError } from './repository'
import type { Envelope, LibraryRepository } from './repository'

const storeName = 'library'
const key = 'current'

export class IndexedDbRepository implements LibraryRepository {
  // Preserve pre-Loom data; branding must not change the database identity.
  constructor(private readonly name = 'roam-library') {}

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.name, 1)
      request.onupgradeneeded = () => request.result.createObjectStore(storeName)
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
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly')
      const request = transaction.objectStore(storeName).get(key)
      transaction.oncomplete = () => {
        db.close()
        try { resolve(request.result === undefined ? null : readEnvelope(request.result)) }
        catch (error) { reject(error) }
      }
      transaction.onabort = transaction.onerror = () => {
        db.close()
        reject(new Error('Local data could not be read. Please retry.'))
      }
    })
  }

  async save(data: Library, expectedRevision: number): Promise<Envelope> {
    const validData = librarySchema.parse(data)
    const db = await this.open()
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.get(key)
      const envelope: Envelope = { schemaVersion: 1, revision: expectedRevision + 1, data: validData }
      let failure: Error | undefined
      request.onsuccess = () => {
        try {
          const current = request.result === undefined ? null : readEnvelope(request.result)
          if ((current?.revision ?? 0) !== expectedRevision) throw new StorageConflictError()
          store.put(envelope, key)
        } catch (error) {
          failure = error instanceof Error ? error : new Error('Saved data could not be checked.')
          transaction.abort()
        }
      }
      transaction.oncomplete = () => { db.close(); resolve(envelope) }
      transaction.onabort = transaction.onerror = () => {
        db.close()
        reject(failure ?? new Error('Local save failed. Your edits are kept in this tab. Retry or download your draft.'))
      }
    })
  }
}
