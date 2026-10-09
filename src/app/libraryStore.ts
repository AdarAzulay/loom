import { deleteTrip, emptyLibrary, errorMessage, librarySchema, saveItem } from '../models/domain'
import type { Item, Library } from '../models/domain'
import type { LibraryRepository } from '../services/storage/repository'

export interface LibrarySnapshot {
  data: Library | null
  status: 'loading' | 'ready' | 'saving' | 'error'
  error: string | null
  dirty: boolean
  removed: Item[]
}

/** One owner for hydration and serialized saves; React never writes from effects. */
export class LibraryStore {
  private snapshot: LibrarySnapshot = { data: null, status: 'loading', error: null, dirty: false, removed: [] }
  private listeners = new Set<() => void>()
  private revision = 0
  private writing = false
  private loading: Promise<void> | null = null

  constructor(private readonly repository: LibraryRepository) {}

  getSnapshot = () => this.snapshot
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }

  private publish(patch: Partial<LibrarySnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch }
    this.listeners.forEach(listener => listener())
  }

  load(): Promise<void> {
    if (this.snapshot.data) return Promise.resolve()
    if (this.loading) return this.loading
    this.publish({ status: 'loading', error: null })
    this.loading = this.repository.load().then(envelope => {
      this.revision = envelope?.revision ?? 0
      this.publish({ data: envelope?.data ?? emptyLibrary(), status: 'ready' })
    }).catch(error => {
      this.publish({ status: 'error', error: errorMessage(error) })
    }).finally(() => { this.loading = null })
    return this.loading
  }

  update(change: (data: Library) => Library): void {
    if (!this.snapshot.data) throw new Error('Wait for your saved library to load.')
    this.commit(change(this.snapshot.data))
  }

  private commit(draft: Library, removed = this.snapshot.removed) {
    const data = librarySchema.parse(draft)
    this.publish({ data, removed, dirty: true })
    if (!this.snapshot.error) void this.flush()
  }

  deleteTrip(id: string) {
    if (!this.snapshot.data) throw new Error('Wait for your saved library to load.')
    // Publish the cascade and undo cleanup together; persist one complete snapshot.
    this.commit(deleteTrip(this.snapshot.data, id), this.snapshot.removed.filter(item => item.tripId !== id))
  }

  removeItem(id: string) {
    const item = this.snapshot.data?.items.find(item => item.id === id)
    if (!item) return
    this.update(data => ({ ...data, items: data.items.filter(current => current.id !== id) }))
    this.publish({ removed: [...this.snapshot.removed, item] })
  }

  undoRemove = () => {
    const item = this.snapshot.removed.at(-1)
    if (!item) return
    this.update(data => saveItem(data, item))
    this.publish({ removed: this.snapshot.removed.slice(0, -1) })
  }

  dismissUndo = () => this.publish({ removed: [] })

  retry = async () => {
    if (!this.snapshot.data) return this.load()
    this.publish({ error: null })
    await this.flush()
  }

  private async flush() {
    if (this.writing) return
    this.writing = true
    try {
      while (this.snapshot.dirty && this.snapshot.data) {
        const data = this.snapshot.data
        this.publish({ status: 'saving' })
        const saved = await this.repository.save(data, this.revision)
        this.revision = saved.revision
        // Edits made during this write are retained and written next.
        this.publish({ dirty: this.snapshot.data !== data })
      }
      this.publish({ status: 'ready', error: null })
    } catch (error) {
      this.publish({ status: 'error', error: errorMessage(error) })
    } finally { this.writing = false }
  }
}
