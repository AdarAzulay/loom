import { describe, expect, it } from 'vitest'
import { IndexedDbRepository } from './indexedDb'
import { readEnvelope, StorageConflictError } from './repository'
import { populatedLibrary } from '../../test/fixtures'

describe('IndexedDB repository', () => {
  it('opens existing plans from the legacy database after the Loom rename', async () => {
    const legacy = new IndexedDbRepository('roam-library')
    const saved = await legacy.save(populatedLibrary(), 0)
    expect(await new IndexedDbRepository().load()).toEqual(saved)
  })
  it('round-trips Unicode, date-only values, and a versioned envelope', async () => {
    const repository = new IndexedDbRepository(crypto.randomUUID())
    expect(await repository.load()).toBeNull()
    const saved = await repository.save(populatedLibrary(), 0)
    expect(saved.revision).toBe(1)
    expect(saved.schemaVersion).toBe(1)
    expect(await repository.load()).toEqual(saved)
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
    expect(() => readEnvelope({ schemaVersion: 2, data: populatedLibrary(), revision: 1 })).toThrow('different Loom version')
    expect(() => readEnvelope({ schemaVersion: 1, data: {}, revision: 1 })).toThrow('could not be validated')
    const repository = new IndexedDbRepository(crypto.randomUUID())
    await repository.save(populatedLibrary(), 0)
    await expect(repository.save(populatedLibrary(), 0)).rejects.toThrow()
    expect((await repository.load())?.data).toEqual(populatedLibrary())
  })
})
