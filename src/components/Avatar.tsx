import { useEffect, useState } from 'react'
import type { LibraryStore } from '../app/libraryStore'

export function Avatar({ name, avatarId, store, large = false }: { name: string; avatarId: string | null; store: LibraryStore; large?: boolean }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    let objectUrl: string | undefined
    if (avatarId) void store.loadPhotos([avatarId]).then(records => {
      if (!active || !records[0]) return
      objectUrl = URL.createObjectURL(records[0].blob)
      setUrl(objectUrl)
    })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [avatarId, store])
  return <span className={`avatar ${large ? 'large' : ''}`}>{url ? <img src={url} alt="" /> : name.slice(0, 1).toUpperCase()}</span>
}
