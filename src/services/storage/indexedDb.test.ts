import { describe, expect, it } from 'vitest'
import { IndexedDbRepository } from './indexedDb'
import { migrateV1Library } from '../../models/domain'
import { readEnvelope, readLegacyEnvelope, StorageConflictError } from './repository'
import { populatedLibrary, item, trip, day } from '../../test/fixtures'
import type { PhotoRecord } from './photos'
import { photoPayloadBytes } from '../photos'

const legacySample = {
  profile: { displayName: 'Ada', appearance: 'light' as const },
  selectedTripId: trip.id,
  trips: [trip], days: [day],
  items: [{
    id: item.id, tripId: item.tripId, dayId: item.dayId, type: item.type, title: item.title,
    address: 'address' in item ? item.address : '', time: item.time, notes: item.notes, websiteUrl: item.websiteUrl,
    booking: item.booking,
  }],
}

const v2Sample = (() => {
  const source = populatedLibrary()
  const profile = { displayName: source.profile.displayName, appearance: source.profile.appearance }
  const days = source.days.map(dayRecord => Object.fromEntries(Object.entries(dayRecord).filter(([key]) => !['country', 'timeZone', 'currency'].includes(key))))
  const items = source.items.map(itemRecord => Object.fromEntries(Object.entries(itemRecord).filter(([key]) => !['status', 'order', 'price'].includes(key))))
  return { profile, selectedTripId: source.selectedTripId, trips: source.trips, days, items }
})()

function seedV1(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('library')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction('library', 'readwrite')
      transaction.objectStore('library').put({ schemaVersion: 1, revision: 4, data: legacySample }, 'current')
      transaction.oncomplete = () => { db.close(); resolve() }
      transaction.onabort = () => reject(transaction.error)
    }
  })
}

function seedV2(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1)
    request.onupgradeneeded = () => request.result.createObjectStore('library')
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction('library', 'readwrite')
      transaction.objectStore('library').put({ schemaVersion: 2, revision: 7, data: v2Sample }, 'current')
      transaction.oncomplete = () => { db.close(); resolve() }
      transaction.onabort = () => reject(transaction.error)
    }
  })
}

function readRaw(name: string, storeName: string, recordKey: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 3)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(storeName, 'readonly')
      const read = transaction.objectStore(storeName).get(recordKey)
      transaction.oncomplete = () => { db.close(); resolve(read.result) }
      transaction.onabort = () => reject(transaction.error)
    }
  })
}

describe('IndexedDB repository', () => {
  it('opens data from the legacy database name after the Loom rename', async () => {
    const legacy = new IndexedDbRepository('roam-library')
    const saved = await legacy.save(populatedLibrary(), 0)
    expect(await new IndexedDbRepository().load()).toEqual(saved)
  })

  it('round-trips Unicode, date-only values, and a versioned v3 envelope', async () => {
    const repository = new IndexedDbRepository(crypto.randomUUID())
    expect(await repository.load()).toBeNull()
    const saved = await repository.save(populatedLibrary(), 0)
    expect(saved.revision).toBe(1)
    expect(saved.schemaVersion).toBe(3)
    expect(await repository.load()).toEqual(saved)
  })

  it('migrates a realistic v1 sample without destroying the original snapshot', async () => {
    const name = crypto.randomUUID()
    await seedV1(name)
    const repository = new IndexedDbRepository(name)
    const migrated = await repository.load()
    expect(migrated?.schemaVersion).toBe(3)
    expect(migrated?.revision).toBe(4)
    expect(migrated?.data.items[0]).toMatchObject({ instagramUrl: '', place: null, photoIds: [] })
    const preserved = await readRaw(name, 'library-v1', 'current')
    expect(preserved).toEqual({ schemaVersion: 1, revision: 4, data: legacySample })
    expect(readEnvelope(await readRaw(name, 'library', 'current'))).toEqual(migrated)
    expect(migrateV1Library(legacySample).items[0]?.photoIds).toEqual([])
  })

  it('migrates a v2 record while preserving the source snapshot', async () => {
    const name = crypto.randomUUID()
    await seedV2(name)
    const migrated = await new IndexedDbRepository(name).load()
    expect(migrated?.schemaVersion).toBe(3)
    expect(migrated?.revision).toBe(7)
    expect(migrated?.data.profile.palette).toBe('sky')
    expect(await readRaw(name, 'library-v2', 'current')).toEqual({ schemaVersion: 2, revision: 7, data: v2Sample })
  })

  it('saves and loads about 20 photo blobs separately from the library JSON', async () => {
    const repository = new IndexedDbRepository(crypto.randomUUID())
    const photos: PhotoRecord[] = Array.from({ length: 20 }, (_, index) => {
      const blob = new Blob([new Uint8Array(64 * 1024)], { type: 'image/jpeg' })
      return { id: `photo-${index}`, itemId: item.id, mimeType: blob.type, width: 1200, height: 900, bytes: blob.size, createdAt: index, blob }
    })
    const data = { ...populatedLibrary(), items: [{ ...item, photoIds: photos.map(photo => photo.id) }] }
    await repository.save(data, 0, photos)
    const loaded = await repository.load()
    const loadedPhotos = await repository.loadPhotos!(loaded?.data.items[0]?.photoIds ?? [])
    expect(loaded?.data.items[0]?.photoIds).toHaveLength(20)
    expect(loadedPhotos).toHaveLength(20)
    expect(loadedPhotos.every(photo => photo.blob instanceof Blob)).toBe(true)
    expect(photoPayloadBytes(loadedPhotos)).toBe(20 * 64 * 1024)
  })

  it('atomically rejects a stale tab instead of replacing newer edits', async () => {
    const name = crypto.randomUUID()
    const a = new IndexedDbRepository(name)
    const b = new IndexedDbRepository(name)
    const data = populatedLibrary()
    const results = await Promise.allSettled([a.save(data, 0), b.save(data, 0)])
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.find(result => result.status === 'rejected')
    expect(rejected?.status === 'rejected' && rejected.reason).toBeInstanceOf(StorageConflictError)
    expect((await a.load())?.revision).toBe(1)
  })

  it('rejects corrupt and future schemas, leaving originals untouched', async () => {
    expect(() => readEnvelope({ schemaVersion: 4, data: populatedLibrary(), revision: 1 })).toThrow('different Loom version')
    expect(() => readEnvelope({ schemaVersion: 1, data: {}, revision: 1 })).toThrow('different Loom version')
    expect(() => readLegacyEnvelope({ schemaVersion: 1, data: {}, revision: 1 })).toThrow('could not be validated')
    const repository = new IndexedDbRepository(crypto.randomUUID())
    await repository.save(populatedLibrary(), 0)
    await expect(repository.save(populatedLibrary(), 0)).rejects.toThrow()
    expect((await repository.load())?.data).toEqual(populatedLibrary())
  })
})
