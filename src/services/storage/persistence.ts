export async function requestPersistentStorage(): Promise<'granted' | 'already' | 'unavailable' | 'denied'> {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return 'unavailable'
  if (navigator.storage.persisted && await navigator.storage.persisted()) return 'already'
  return await navigator.storage.persist() ? 'granted' : 'denied'
}
