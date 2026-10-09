import { HardDrive, ShieldCheck } from 'lucide-react'
import { PageHeading } from '../components/ui'
import type { Library } from '../models/domain'
import type { LibraryStore } from '../app/libraryStore'
import { DownloadDraft, ProfileForm } from './forms'

export function Profile({ data, store }: { data: Library; store: LibraryStore }) {
  return <>
    <PageHeading eyebrow="Your corner of the world" title="A personal touch." />
    <div className="profile-layout"><section className="glass form-panel"><div className="profile-intro"><span className="avatar large">{data.profile.displayName.slice(0, 1).toUpperCase()}</span><div><h2>Your profile</h2><p className="muted small">Make yourself at home.</p></div></div><ProfileForm data={data} store={store} /></section>
      <div className="stack"><section className="glass info-card"><HardDrive size={23} strokeWidth={1.5} /><h2>Saved on this device</h2><p className="muted">Your trips are stored in this browser. GitHub and cloud saving are not connected.</p><p className="muted small">Clearing browser data removes local plans. Keep a draft download before switching browsers or devices. In-app restore comes in a later step.</p><DownloadDraft data={data} /></section>
      <section className="glass info-card"><ShieldCheck size={23} strokeWidth={1.5} /><h2>Just your plans</h2><p className="muted">No accounts, live providers, or background connections in this first version.</p><span className="eyebrow">Loom · Foundation 0.1</span></section></div>
    </div>
  </>
}
