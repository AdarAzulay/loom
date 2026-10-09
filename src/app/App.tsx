import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { CalendarDays, CircleUserRound, Home as HomeIcon, Layers2, Plus, RotateCcw, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button, EmptyState, Modal, SelectField } from '../components/ui'
import { Avatar } from '../components/Avatar'
import { duplicateItem, moveItem } from '../models/domain'
import type { Day, Item } from '../models/domain'
import { Home } from '../features/Home'
import { Days } from '../features/Days'
import { Add } from '../features/Add'
import type { AddContext } from '../features/Add'
import { Items } from '../features/Items'
import { Profile } from '../features/Profile'
import { ItemDetail } from '../features/ItemDetail'
import { DayForm, DownloadDraft, ItemForm } from '../features/forms'
import { TripDialog } from '../features/TripDialog'
import type { LibraryStore } from './libraryStore'
import { navigate, tabs, useTab } from './navigation'
import type { Tab } from './navigation'

const navIcons: Record<Tab, LucideIcon> = { home: HomeIcon, days: CalendarDays, add: Plus, items: Layers2, profile: CircleUserRound }
type Dialog = { kind: 'trip'; id?: string } | { kind: 'day'; id: string } | { kind: 'item'; id: string; edit: boolean }

export function App({ store }: { store: LibraryStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const { data } = state
  const tab = useTab()
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)
  const [addContext, setAddContext] = useState<AddContext>({})
  const [addKey, setAddKey] = useState(0)
  const [showStorageInfo, setShowStorageInfo] = useState(false)
  const main = useRef<HTMLElement>(null)
  const initialTab = useRef(true)
  const trip = data?.trips.find(trip => trip.id === data.selectedTripId) ?? data?.trips[0]
  const item = dialog?.kind === 'item' ? data?.items.find(item => item.id === dialog.id) : undefined
  const editedDay = dialog?.kind === 'day' ? data?.days.find(day => day.id === dialog.id) : undefined
  const removed = state.removed.at(-1)

  useEffect(() => {
    if (data) {
      document.documentElement.dataset.appearance = data.profile.appearance
      document.documentElement.dataset.palette = data.profile.palette
      document.documentElement.dataset.glass = data.profile.glassLevel
    }
  }, [data])

  useEffect(() => {
    if (initialTab.current) { initialTab.current = false; return }
    main.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [tab])

  useEffect(() => {
    if (!state.dirty) return
    const preventLoss = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', preventLoss)
    return () => window.removeEventListener('beforeunload', preventLoss)
  }, [state.dirty])

  const selectTrip = (id: string) => { store.update(data => ({ ...data, selectedTripId: id })); setSelectedDayId(null) }
  const createTrip = () => setDialog({ kind: 'trip' })
  const openItem = (item: Item) => { if (item.tripId !== trip?.id) selectTrip(item.tripId); setDialog({ kind: 'item', id: item.id, edit: false }) }
  const openAdd = (context: AddContext = {}) => { setAddContext(context); setAddKey(key => key + 1); navigate('add') }
  const openDay = (day: Day) => { selectTrip(day.tripId); setSelectedDayId(day.id); navigate('days') }
  const itemSaved = (item: Item) => { setDialog(null); selectTrip(item.tripId); if (item.dayId) { setSelectedDayId(item.dayId); navigate('days') } else navigate('items') }
  const duplicate = (source: Item) => { store.update(data => { const result = duplicateItem(data, source.id); return result.data }); setDialog(null) }
  const move = (source: Item, direction: 'up' | 'down') => store.update(data => moveItem(data, source.id, direction))
  const deleteTrip = (id: string) => {
    store.deleteTrip(id)
    setDialog(null)
    setSelectedDayId(null)
    setAddContext({})
    setAddKey(key => key + 1)
    navigate('home')
  }

  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); main.current?.focus() }}>Skip to content</a>
    <header className="app-header"><a className="brand" href="#home" aria-label="Loom home">Loom<span className="brand-dot">.</span></a><div className="header-right"><button className="save-status" type="button" onClick={() => setShowStorageInfo(true)} aria-label="Explain local save status"><span className={`status-dot ${state.status === 'error' ? 'warning' : ''}`} />{state.status === 'loading' ? 'Opening…' : state.status === 'saving' ? 'Saving…' : state.status === 'error' ? 'Needs attention' : 'Saved'}</button><span className="sr-only" role="status">{state.status === 'error' ? 'Local save needs attention' : 'Saved on this device'}</span>{data ? <button className="avatar-button" type="button" onClick={() => navigate('profile')} aria-label="Open profile"><Avatar name={data.profile.displayName} avatarId={data.profile.avatarId} store={store} /></button> : <Avatar name="L" avatarId={null} store={store} />}</div></header>
    <main id="main-content" tabIndex={-1} ref={main}>
      {state.error && <section className="error-box storage-error" role="alert"><h2>{data ? 'Your edits are still in this tab.' : 'Your library could not be opened.'}</h2><p>{state.error}</p><div className="row"><Button variant="secondary" onClick={() => void store.retry()}>Retry {data ? 'save' : 'loading'}</Button>{data && <DownloadDraft data={data} store={store} />}</div>{data && <p className="small">Keep this tab open until saved, or download your draft before reloading.</p>}</section>}
      {!data ? !state.error && <div className="glass empty-state" role="status"><p>Opening your plans…</p></div> : <>
        {(tab === 'days' || tab === 'items') && data.trips.length > 0 && <div className="trip-selector"><SelectField label="Selected trip" value={trip?.id ?? ''} onChange={event => selectTrip(event.target.value)}>{data.trips.map(trip => <option key={trip.id} value={trip.id}>{trip.name}</option>)}</SelectField></div>}
        {tab === 'home' && <Home data={data} trip={trip} store={store} onSelect={selectTrip} onCreate={createTrip} onEdit={() => setDialog({ kind: 'trip', id: trip?.id })} onDays={() => navigate('days')} onItem={openItem} />}
        {(tab === 'days' || tab === 'items') && !trip && <EmptyState spacious title="Plan your next trip here." description="Your days and saved items will live inside a trip. Start with a name and dates." action={<Button onClick={createTrip}>Create a trip</Button>} />}
        {tab === 'days' && trip && <Days data={data} trip={trip} store={store} selectedDayId={selectedDayId} onSelectDay={setSelectedDayId} onCreateDay={() => openAdd({ tripId: trip.id, type: 'day' })} onEditDay={day => setDialog({ kind: 'day', id: day.id })} onAddItem={day => openAdd({ tripId: trip.id, dayId: day.id })} onItem={openItem} />}
        {tab === 'add' && <Add key={addKey} data={data} store={store} context={addContext} onCreateTrip={createTrip} onDay={openDay} onItem={itemSaved} />}
        {tab === 'items' && trip && <Items key={trip.id} data={data} trip={trip} store={store} onItem={openItem} onAdd={() => openAdd({ tripId: trip.id })} />}
        {tab === 'profile' && <Profile data={data} store={store} />}
      </>}
    </main>
    <nav className="bottom-nav glass" aria-label="Main navigation">{tabs.map(current => {
      const Icon = navIcons[current]
      return <button type="button" key={current} className={`nav-button ${current === 'add' ? 'nav-add' : ''}`} aria-current={tab === current ? 'page' : undefined} onClick={() => current === 'add' ? openAdd() : navigate(current)}><span className="nav-icon"><Icon size={22} strokeWidth={1.6} /></span><span>{current[0]?.toUpperCase()}{current.slice(1)}</span></button>
    })}</nav>
    {removed && <div className="undo-toast glass"><span role="status">Removed “{removed.title}”</span><Button variant="quiet" onClick={store.undoRemove}><RotateCcw size={16} />Undo</Button><Button variant="quiet" aria-label="Dismiss undo" onClick={store.dismissUndo}><X size={16} /></Button></div>}
    {data && dialog?.kind === 'trip' && <TripDialog data={data} store={store} trip={data.trips.find(trip => trip.id === dialog.id)} onClose={() => setDialog(null)} onDelete={deleteTrip} />}
    {data && editedDay && <Modal title="Edit day" onClose={() => setDialog(null)}><DayForm store={store} trip={data.trips.find(trip => trip.id === editedDay.tripId)!} day={editedDay} onDone={() => setDialog(null)} onSaved={day => { setDialog(null); setSelectedDayId(day.id) }} /></Modal>}
    {data && item && dialog?.kind === 'item' && <Modal title={dialog.edit ? 'Edit item' : item.title} onClose={() => setDialog(null)}>{dialog.edit ? <ItemForm store={store} data={data} trip={data.trips.find(trip => trip.id === item.tripId)!} type={item.type} item={item} onDone={() => setDialog({ ...dialog, edit: false })} onSaved={() => setDialog({ ...dialog, edit: false })} /> : <ItemDetail item={item} data={data} store={store} onEdit={() => setDialog({ ...dialog, edit: true })} onDuplicate={() => duplicate(item)} onMove={direction => move(item, direction)} onRemove={() => { store.removeItem(item.id); setDialog(null) }} />}</Modal>}
    {showStorageInfo && <Modal title="Saved on this device" onClose={() => setShowStorageInfo(false)}><div className="item-detail"><p>Your plans are stored locally in this browser or Home Screen app. Nothing is sent to a Loom account.</p><p className="muted small">{state.status === 'error' ? 'The latest change needs attention. Keep this tab open and retry.' : data?.profile.lastBackupAt ? `Last backup: ${new Date(data.profile.lastBackupAt).toLocaleString()}.` : 'No backup yet. Keep one before clearing browser data or switching devices.'}</p><Button onClick={() => setShowStorageInfo(false)}>Got it</Button></div></Modal>}
  </div>
}
