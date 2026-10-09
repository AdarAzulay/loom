import { useState } from 'react'
import { ArrowLeft, ArrowUpRight, CalendarDays } from 'lucide-react'
import { Button, EmptyState, PageHeading } from '../components/ui'
import { dateRange } from '../models/dates'
import type { Day, Item, ItemType, Library } from '../models/domain'
import { itemConfig } from '../models/itemTypes'
import type { LibraryStore } from '../app/libraryStore'
import { DayForm, ItemForm } from './forms'

export interface AddContext { tripId?: string; dayId?: string; type?: 'day' }

const typeGroups: Array<{ label: string; types: ItemType[] }> = [
  { label: 'Travel', types: ['flight', 'train', 'carTaxi', 'transport'] },
  { label: 'Stay', types: ['stay'] },
  { label: 'Eat & drink', types: ['restaurant', 'cafe'] },
  { label: 'Do', types: ['museum', 'show', 'themePark', 'tour'] },
  { label: 'Shop', types: ['shopping'] },
  { label: 'Other', types: ['place', 'ticketPass', 'document', 'note'] },
]

export function Add({ data, store, context, onCreateTrip, onDay, onItem }: {
  data: Library; store: LibraryStore; context: AddContext; onCreateTrip: () => void; onDay: (day: Day) => void; onItem: (item: Item) => void
}) {
  const [tripId, setTripId] = useState(context.tripId ?? '')
  const [type, setType] = useState<ItemType | 'day' | null>(context.type ?? null)
  const trip = data.trips.find(trip => trip.id === tripId)
  const changeTrip = () => { setTripId(''); setType(null) }
  return <>
    <PageHeading eyebrow="Make it your own" title={!trip ? 'First, choose a trip.' : type ? `Add ${type === 'day' ? 'a day' : `a ${itemConfig[type].label.toLowerCase()}`}.` : 'What’s the plan?'} />
    <div className="steps" aria-label="Add progress"><span className={!trip ? 'active' : ''}>01 · Trip</span><span className={trip && !type ? 'active' : ''}>02 · Type</span><span className={trip && type ? 'active' : ''}>03 · Details</span></div>
    {!trip ? data.trips.length ? <div className="stack">{data.trips.map(current => <button type="button" className="glass trip-option" key={current.id} onClick={() => { setTripId(current.id); store.update(data => ({ ...data, selectedTripId: current.id })) }}><span><strong>{current.name}</strong><span className="muted small">{dateRange(current.startDate, current.endDate)}</span></span><ArrowUpRight size={18} /></button>)}<Button variant="quiet" onClick={onCreateTrip}>Create another trip</Button></div> : <EmptyState title="Every plan starts with a trip." description="Give your trip a name and dates, then add your days and discoveries." action={<Button onClick={onCreateTrip}>Create a trip</Button>} /> : <>
      <div className="context-bar"><div><span className="eyebrow">Adding to</span><strong>{trip.name}</strong></div><Button variant="quiet" onClick={changeTrip}>Change trip</Button></div>
      {!type ? <div className="add-type-groups"><section className="type-group"><h2>Calendar</h2><div className="type-grid"><button type="button" className="glass type-card" onClick={() => setType('day')}><CalendarDays size={22} strokeWidth={1.5} /><strong>Day</strong><span>A date, city & fresh start</span></button></div></section>{typeGroups.map(group => <section className="type-group" key={group.label}><h2>{group.label}</h2><div className="type-grid">{group.types.map(type => {
        const { icon: Icon, label, hint } = itemConfig[type]
        return <button type="button" className="glass type-card" key={type} onClick={() => setType(type)}><Icon size={22} strokeWidth={1.5} /><strong>{label}</strong><span>{hint}</span></button>
      })}</div></section>)}</div> : <div className="glass form-panel"><Button variant="quiet" onClick={() => setType(null)}><ArrowLeft size={16} />Choose another type</Button>
        {type === 'day' ? <DayForm store={store} trip={trip} onDone={() => setType(null)} onSaved={onDay} /> : <ItemForm store={store} data={data} trip={trip} type={type} dayId={trip.id === context.tripId ? context.dayId : undefined} onDone={() => setType(null)} onSaved={onItem} />}
      </div>}
    </>}
  </>
}
