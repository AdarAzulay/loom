import { useState } from 'react'
import { Button, EmptyState, PageHeading, SelectField, TextField } from '../components/ui'
import { ItemCard } from '../components/ItemCard'
import { itemTypes, orderedItems } from '../models/domain'
import type { Item, Library, Trip } from '../models/domain'
import { itemConfig } from '../models/itemTypes'
import { searchItem } from './Home'
import type { LibraryStore } from '../app/libraryStore'

export function Items({ data, trip, store, onItem, onAdd }: { data: Library; trip: Trip; store: LibraryStore; onItem: (item: Item) => void; onAdd: () => void }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [booking, setBooking] = useState('all')
  const all = data.items.filter(item => item.tripId === trip.id)
  const items = orderedItems(all.filter(item => searchItem(item, query.trim()) && (type === 'all' || item.type === type) && (booking === 'all' || item.booking.status === booking)))
  return <>
    <PageHeading eyebrow={trip.name} title="All the little details."><Button variant="secondary" onClick={onAdd}>Add item</Button></PageHeading>
    <div className="glass filters"><TextField label="Search this trip" type="search" placeholder="Name, address, booking reference…" value={query} onChange={event => setQuery(event.target.value)} /><div className="form-grid">
      <SelectField label="Item type" value={type} onChange={event => setType(event.target.value)}><option value="all">All types</option>{itemTypes.map(type => <option key={type} value={type}>{itemConfig[type].label}</option>)}</SelectField>
      <SelectField label="Booking" value={booking} onChange={event => setBooking(event.target.value)}><option value="all">All items</option><option value="booked">Booked</option><option value="planned">To book</option><option value="none">No booking</option></SelectField>
    </div></div>
    <div className="section-heading"><h2>Saved items <span className="count">{items.length}</span></h2></div>
    {items.length ? <div className="stack">{items.map(item => <ItemCard key={item.id} item={item} data={data} store={store} onOpen={onItem} />)}</div> : <EmptyState title={all.length ? 'Nothing matches just yet.' : 'Keep it all together.'} description={all.length ? 'Try a different search or filter.' : 'Save places, transport, bookings, and notes. Assign a day whenever you’re ready.'} action={!all.length && <Button onClick={onAdd}>Add your first item</Button>} />}
  </>
}
