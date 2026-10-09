import { describe, expect, it, vi } from 'vitest'
import { LibraryStore } from './libraryStore'
import { IndexedDbRepository } from '../services/storage/indexedDb'
import type { Envelope, LibraryRepository } from '../services/storage/repository'
import { createDay, emptyLibrary, saveItem, saveTrip } from '../models/domain'
import { day, item, populatedLibrary, trip } from '../test/fixtures'

const settled = async (store: LibraryStore) => vi.waitFor(() => expect(store.getSnapshot().status).toBe('ready'))

describe('hydration and saving', () => {
  it('does not save or allow edits before hydration finishes', async () => {
    let resolve!: (value: Envelope | null) => void
    const repository: LibraryRepository = { load: () => new Promise(done => { resolve = done }), save: vi.fn() }
    const store = new LibraryStore(repository)
    const loading = store.load()
    expect(() => store.update(() => emptyLibrary())).toThrow('load')
    expect(repository.save).not.toHaveBeenCalled()
    resolve({ schemaVersion: 1, revision: 8, data: populatedLibrary() })
    await loading
    expect(store.getSnapshot().data?.trips).toEqual([trip])
    expect(repository.save).not.toHaveBeenCalled()
  })
  it('keeps failed hydration blocked and retries without saving an empty library', async () => {
    const repository = { load: vi.fn().mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValue(null), save: vi.fn() }
    const store = new LibraryStore(repository)
    await store.load()
    expect(store.getSnapshot().data).toBeNull()
    expect(store.getSnapshot().error).toBe('Unavailable')
    await store.retry()
    expect(store.getSnapshot().data).toEqual(emptyLibrary())
    expect(repository.save).not.toHaveBeenCalled()
  })
  it('serializes writes and keeps edits made during a pending save', async () => {
    let resolve!: (value: Envelope) => void
    const save = vi.fn<LibraryRepository['save']>()
      .mockImplementationOnce(() => new Promise(done => { resolve = done }))
      .mockImplementation(async (data, revision) => ({ data, revision: revision + 1, schemaVersion: 1 }))
    const store = new LibraryStore({ load: async () => null, save })
    await store.load()
    store.update(data => saveTrip(data, trip))
    const first = store.getSnapshot().data!
    store.update(data => createDay(data, day).data)
    store.update(data => saveItem(data, item))
    expect(save).toHaveBeenCalledTimes(1)
    resolve({ schemaVersion: 1, revision: 1, data: first })
    await settled(store)
    expect(save).toHaveBeenCalledTimes(2)
    expect(save.mock.calls[1]?.[0].items).toEqual([item])
    expect(save.mock.calls[1]?.[1]).toBe(1)
  })
  it('preserves edits on write failure, including newer edits, then retries the latest draft', async () => {
    const save = vi.fn<LibraryRepository['save']>().mockRejectedValueOnce(new Error('Disk full')).mockImplementation(async (data, revision) => ({ data, revision: revision + 1, schemaVersion: 1 }))
    const store = new LibraryStore({ load: async () => null, save })
    await store.load()
    store.update(() => populatedLibrary())
    await vi.waitFor(() => expect(store.getSnapshot().status).toBe('error'))
    store.update(data => saveItem(data, { ...item, title: 'Updated dinner' }))
    expect(store.getSnapshot().dirty).toBe(true)
    expect(store.getSnapshot().data?.items[0]?.title).toBe('Updated dinner')
    await store.retry()
    expect(save.mock.calls.at(-1)?.[0].items[0]?.title).toBe('Updated dinner')
    expect(store.getSnapshot().dirty).toBe(false)
  })
  it('creates trip → day → item, edits, reloads, removes, undoes and reloads again', async () => {
    const repository = new IndexedDbRepository(crypto.randomUUID())
    const store = new LibraryStore(repository)
    await store.load()
    store.update(data => saveTrip(data, trip))
    store.update(data => createDay(data, day).data)
    store.update(data => saveItem(data, item))
    store.update(data => saveItem(data, { ...item, title: 'Updated dinner' }))
    await settled(store)
    const reopened = new LibraryStore(repository)
    await reopened.load()
    expect(reopened.getSnapshot().data?.items[0]?.title).toBe('Updated dinner')
    reopened.removeItem(item.id)
    await settled(reopened)
    expect((await repository.load())?.data.items).toHaveLength(0)
    reopened.undoRemove()
    await settled(reopened)
    expect((await repository.load())?.data.items[0]).toMatchObject({ id: item.id, dayId: day.id, title: 'Updated dinner' })
  })
  it('deletes a trip cascade and clears undo entries owned by that trip', async () => {
    const otherTrip = { id: 'trip-b', name: 'Other trip', startDate: '2028-04-01', endDate: '2028-04-03' }
    const otherDay = { id: 'day-b', tripId: otherTrip.id, date: '2028-04-01', city: 'Tokyo', title: '', notes: '' }
    const otherItem = { ...item, id: 'item-b', tripId: otherTrip.id, dayId: otherDay.id, title: 'Other trip item' }
    const repository = new IndexedDbRepository(crypto.randomUUID())
    const store = new LibraryStore(repository)
    await store.load()
    store.update(() => createDay(saveItem(createDay(saveTrip(populatedLibrary(), otherTrip), otherDay).data, otherItem), { ...day, id: 'day-c', date: '2028-03-01', city: 'Seoul', title: '', notes: '' }).data)
    store.removeItem(item.id)
    store.deleteTrip(trip.id)
    await settled(store)
    expect(store.getSnapshot().data?.trips).toEqual([otherTrip])
    expect(store.getSnapshot().data?.items).toEqual([otherItem])
    expect(store.getSnapshot().removed).toEqual([])
    store.undoRemove()
    await settled(store)
    expect(store.getSnapshot().data?.items).toEqual([otherItem])
    const lastTrip = new LibraryStore(repository)
    await lastTrip.load()
    lastTrip.deleteTrip(otherTrip.id)
    await settled(lastTrip)
    expect(lastTrip.getSnapshot().data).toMatchObject({ trips: [], days: [], items: [], selectedTripId: null })
  })
})
