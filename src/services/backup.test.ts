import { describe, expect, it } from 'vitest'
import { createBackup, parseBackup } from './backup'
import { item, populatedLibrary } from '../test/fixtures'

describe('backup round trip', () => {
  it('keeps library Unicode, item references, and photo bytes', async () => {
    const blob = new Blob([new Uint8Array(1024)], { type: 'image/jpeg' })
    const text = await createBackup({ ...populatedLibrary(), items: [{ ...item, photoIds: ['photo-a'] }] }, [{ id: 'photo-a', itemId: item.id, mimeType: 'image/jpeg', width: 16, height: 16, bytes: 1024, createdAt: 1, blob }])
    const restored = parseBackup(text)
    expect(restored.data.items[0]?.title).toContain('저녁')
    expect(restored.data.items[0]?.photoIds).toEqual(['photo-a'])
    expect(restored.photos[0]?.blob.size).toBe(1024)
  })
})
