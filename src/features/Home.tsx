import { useState } from 'react'
import { ArrowUpRight, Check, Plus, Search } from 'lucide-react'
import { Button, EmptyState, PageHeading } from '../components/ui'
import { ItemCard } from '../components/ItemCard'
import { dateRange } from '../models/dates'
import type { Item, Library, Trip } from '../models/domain'
import { itemTypes } from '../models/domain'
import { itemConfig } from '../models/itemTypes'
import type { LibraryStore } from '../app/libraryStore'

export function searchItem(item: Item, query: string): boolean {
  const details = 'address' in item ? item.address : 'departure' in item ? `${item.departure} ${item.arrival}` : ''
  return [item.title, item.notes, item.booking.provider, item.booking.reference, details].join(' ').toLocaleLowerCase().includes(query.toLocaleLowerCase())
}

export function Home({ data, trip, store, onSelect, onCreate, onEdit, onDays, onItem }: {
  data: Library; trip?: Trip; store: LibraryStore; onSelect: (id: string) => void; onCreate: () => void; onEdit: () => void; onDays: () => void; onItem: (item: Item) => void
}) {
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [today] = useState(() => Date.now())
  const search = query.trim().toLocaleLowerCase()
  const trips = data.trips.filter(trip => trip.name.toLocaleLowerCase().includes(search))
  const items = search ? data.items.filter(item => searchItem(item, search)) : []
  const selectedDays = data.days.filter(day => day.tripId === trip?.id)
  const selectedItems = data.items.filter(item => item.tripId === trip?.id)
  const visibleSelectedItems = selectedItems.filter(item => typeFilter === 'all' || item.type === typeFilter)
  const cities = [...new Set(selectedDays.map(day => day.city).filter(Boolean))]
  const countdown = trip ? Math.ceil((new Date(`${trip.startDate}T00:00:00`).getTime() - today) / 86400000) : null
  return <>
    <PageHeading eyebrow="Your trip, your space" title={`Hello, ${data.profile.displayName}.`} />
    <label className="search-box glass"><Search size={20} strokeWidth={1.5} /><span className="sr-only">Search trips, places, and bookings</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search trips, places, bookings…" /></label>
    {data.profile.displayName === 'traveler' && <section className="glass welcome-card"><div><p className="eyebrow">A little hello</p><h2>What should we call you?</h2><p className="muted small">Add your name and an avatar from Profile to make Loom feel like yours.</p></div><Button variant="secondary" onClick={() => { window.location.hash = '#profile' }}>Set up profile</Button></section>}
    {data.trips.length === 0 ? <EmptyState spacious title="Plan your next trip here." description="A home for your days, discoveries, and all the little details along the way." action={<Button onClick={onCreate}>Create a trip<Plus size={17} /></Button>} /> : <>
      <div className="section-heading"><h2>{search ? 'Matching trips' : 'Your trips'} <span className="count">{trips.length}</span></h2><Button variant="quiet" onClick={onCreate}><Plus size={17} />New trip</Button></div>
      {trips.length > 0 && <div className="trip-rail" aria-label="Your trips">{trips.map((current, index) => <button type="button" className={`trip-card tone-${index % 3}`} key={current.id} aria-pressed={trip?.id === current.id} onClick={() => onSelect(current.id)}>
        <span className="trip-card-top"><span>TRIP {String(index + 1).padStart(2, '0')}</span><span className="trip-check">{trip?.id === current.id ? <Check size={15} /> : <ArrowUpRight size={16} />}</span></span>
        <span className="trip-card-bottom"><strong>{current.name}</strong><span>{dateRange(current.startDate, current.endDate)}</span></span>
      </button>)}</div>}
      {search ? <section className="stack"><div className="section-heading"><h2>Places & bookings <span className="count">{items.length}</span></h2></div>
        {items.map(item => <div key={item.id}><p className="search-trip-label">{data.trips.find(trip => trip.id === item.tripId)?.name}</p><ItemCard item={item} data={data} store={store} onOpen={onItem} /></div>)}
        {items.length === 0 && <p className="muted">No items match “{query}”. Try a name, address, provider, or booking reference.</p>}
      </section> : trip && <><div className="filter-chips" aria-label="Filter trip items"><button type="button" className={typeFilter === 'all' ? 'active' : ''} onClick={() => setTypeFilter('all')}>All <span>{selectedItems.length}</span></button>{itemTypes.map(itemType => <button type="button" className={typeFilter === itemType ? 'active' : ''} key={itemType} onClick={() => setTypeFilter(itemType)}>{itemConfig[itemType].label} <span>{selectedItems.filter(item => item.type === itemType).length}</span></button>)}</div><section className="glass trip-overview trip-hero">
        <div className="trip-hero-art" aria-hidden="true"><span className="hero-sun" /><span className="hero-hill hill-one" /><span className="hero-hill hill-two" /></div><div className="section-heading"><div><p className="eyebrow">Selected trip</p><h2>{trip.name}</h2><p className="muted small">{dateRange(trip.startDate, trip.endDate)}</p><p className="trip-cities">{cities.length ? cities.join(' · ') : 'Add a day to see your cities'}</p></div><Button variant="quiet" onClick={onEdit}>Edit trip</Button></div>
        <div className="trip-countdown">{countdown !== null && countdown > 0 ? <><strong>in {countdown} days</strong><span>Ready when you are</span></> : <><strong>Day {Math.max(1, selectedDays.findIndex(day => day.date >= new Date().toISOString().slice(0, 10)) + 1)} of {Math.max(selectedDays.length, Math.round((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / 86400000) + 1)}</strong><span>Your trip is in motion</span></>}</div>
        <div className="trip-stats"><div><strong>{selectedDays.length.toString().padStart(2, '0')}</strong><span>Days planned</span></div><div><strong>{visibleSelectedItems.length.toString().padStart(2, '0')}</strong><span>{typeFilter === 'all' ? 'Saved items' : itemConfig[typeFilter as keyof typeof itemConfig].label}</span></div><Button variant="secondary" onClick={onDays}>Explore your days<ArrowUpRight size={16} /></Button></div>
      </section></>}
    </>}
    <p className="page-footnote">Your plans, at your pace. Saved on this device.</p>
  </>
}
