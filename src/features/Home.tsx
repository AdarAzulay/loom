import { useState } from 'react'
import { ArrowUpRight, Check, Plus, Search } from 'lucide-react'
import { Button, EmptyState, PageHeading } from '../components/ui'
import { ItemCard } from '../components/ItemCard'
import { dateRange } from '../models/dates'
import type { Item, Library, Trip } from '../models/domain'

export function searchItem(item: Item, query: string): boolean {
  const details = 'address' in item ? item.address : 'departure' in item ? `${item.departure} ${item.arrival}` : ''
  return [item.title, item.notes, item.booking.provider, item.booking.reference, details].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase())
}

export function Home({ data, trip, onSelect, onCreate, onEdit, onDays, onItem }: {
  data: Library; trip?: Trip; onSelect: (id: string) => void; onCreate: () => void; onEdit: () => void; onDays: () => void; onItem: (item: Item) => void
}) {
  const [query, setQuery] = useState('')
  const search = query.trim().toLocaleLowerCase()
  const trips = data.trips.filter(trip => trip.name.toLocaleLowerCase().includes(search))
  const items = search ? data.items.filter(item => searchItem(item, search)) : []
  const selectedDays = data.days.filter(day => day.tripId === trip?.id)
  const selectedItems = data.items.filter(item => item.tripId === trip?.id)
  return <>
    <PageHeading eyebrow="Your trip, your space" title={`Hello, ${data.profile.displayName}.`} />
    <label className="search-box glass"><Search size={20} strokeWidth={1.5} /><span className="sr-only">Search trips, places, and bookings</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search trips, places, bookings…" /></label>
    {data.trips.length === 0 ? <EmptyState spacious title="Plan your next trip here." description="A home for your days, discoveries, and all the little details along the way." action={<Button onClick={onCreate}>Create a trip<Plus size={17} /></Button>} /> : <>
      <div className="section-heading"><h2>{search ? 'Matching trips' : 'Your trips'} <span className="count">{trips.length}</span></h2><Button variant="quiet" onClick={onCreate}><Plus size={17} />New trip</Button></div>
      {trips.length > 0 && <div className="trip-rail" aria-label="Your trips">{trips.map((current, index) => <button type="button" className={`trip-card tone-${index % 3}`} key={current.id} aria-pressed={trip?.id === current.id} onClick={() => onSelect(current.id)}>
        <span className="trip-card-top"><span>TRIP {String(index + 1).padStart(2, '0')}</span><span className="trip-check">{trip?.id === current.id ? <Check size={15} /> : <ArrowUpRight size={16} />}</span></span>
        <span className="trip-card-bottom"><strong>{current.name}</strong><span>{dateRange(current.startDate, current.endDate)}</span></span>
      </button>)}</div>}
      {search ? <section className="stack"><div className="section-heading"><h2>Places & bookings <span className="count">{items.length}</span></h2></div>
        {items.map(item => <div key={item.id}><p className="search-trip-label">{data.trips.find(trip => trip.id === item.tripId)?.name}</p><ItemCard item={item} data={data} onOpen={onItem} /></div>)}
        {items.length === 0 && <p className="muted">No items match “{query}”. Try a name, address, provider, or booking reference.</p>}
      </section> : trip && <section className="glass trip-overview">
        <div className="section-heading"><div><p className="eyebrow">Selected trip</p><h2>{trip.name}</h2><p className="muted small">{dateRange(trip.startDate, trip.endDate)}</p></div><Button variant="quiet" onClick={onEdit}>Edit trip</Button></div>
        <div className="trip-stats"><div><strong>{selectedDays.length.toString().padStart(2, '0')}</strong><span>Days planned</span></div><div><strong>{selectedItems.length.toString().padStart(2, '0')}</strong><span>Saved items</span></div><Button variant="secondary" onClick={onDays}>Explore your days<ArrowUpRight size={16} /></Button></div>
      </section>}
    </>}
    <p className="page-footnote">Your plans, at your pace. Saved on this device.</p>
  </>
}
