import { HardDrive, ShieldCheck } from 'lucide-react'
import { Button, PageHeading } from '../components/ui'
import type { Library } from '../models/domain'
import type { LibraryStore } from '../app/libraryStore'
import { DownloadDraft, ProfileForm, RestoreBackup } from './forms'
import { Avatar } from '../components/Avatar'
import { requestPersistentStorage } from '../services/storage/persistence'
import { useState } from 'react'

export function Profile({ data, store }: { data: Library; store: LibraryStore }) {
  const [storageMessage, setStorageMessage] = useState('')
  return <>
    <PageHeading eyebrow="Your corner of the world" title="A personal touch." />
    <div className="profile-layout"><section className="glass form-panel"><div className="profile-intro"><Avatar name={data.profile.displayName} avatarId={data.profile.avatarId} store={store} large /><div><h2>Your profile</h2><p className="muted small">Make yourself at home.</p></div></div><ProfileForm data={data} store={store} /></section>
      <div className="stack"><section className="glass info-card"><HardDrive size={23} strokeWidth={1.5} /><h2>Saved on this device</h2><p className="muted">Your trips are stored in this browser. GitHub and cloud saving are not connected.</p><p className="muted small">Backups include item photos and your avatar. Restore validates the entire file before replacing local data.</p><DownloadDraft data={data} store={store} /><RestoreBackup store={store} /><Button variant="quiet" onClick={async () => { const result = await requestPersistentStorage(); setStorageMessage(result === 'granted' || result === 'already' ? 'Browser storage protection is enabled.' : result === 'denied' ? 'The browser declined persistent storage; keep a backup.' : 'Persistent storage is not available here.') }}>Protect local storage</Button>{storageMessage && <p className="form-note" role="status">{storageMessage}</p>}</section>
      <section className="glass info-card"><ShieldCheck size={23} strokeWidth={1.5} /><h2>Just your plans</h2><p className="muted">No accounts, live providers, or background connections in this first version.</p><span className="eyebrow">Loom · Foundation 0.1</span></section></div>
    </div>
  </>
}
