import { MapPin, Pencil, Plus } from 'lucide-react'
import { Button, EmptyState, PageHeading } from '../components/ui'
import { ItemCard } from '../components/ItemCard'
import { formatDate } from '../models/dates'
import { orderedItems, tripDays } from '../models/domain'
import type { Day, Item, Library, Trip } from '../models/domain'
import type { LibraryStore } from '../app/libraryStore'

export function Days({ data, trip, store, selectedDayId, onSelectDay, onCreateDay, onEditDay, onAddItem, onItem }: {
  data: Library; trip: Trip; store: LibraryStore; selectedDayId: string | null; onSelectDay: (id: string) => void; onCreateDay: () => void; onEditDay: (day: Day) => void; onAddItem: (day: Day) => void; onItem: (item: Item) => void
}) {
  const days = tripDays(data, trip.id)
  const day = days.find(day => day.id === selectedDayId) ?? days[0]
  const items = day ? orderedItems(data.items.filter(item => item.dayId === day.id || (item.type === 'stay' && item.checkIn <= day.date && day.date <= item.checkOut)).map(item => {
    if (item.type !== 'stay' || item.dayId === day.id) return item
    const label = item.checkIn === day.date ? `Check-in · ${item.title}` : item.checkOut === day.date ? `Check-out · ${item.title}` : `Staying at ${item.title}`
    return { ...item, dayId: day.id, title: label }
  })) : []
  return <>
    <PageHeading eyebrow={trip.name} title="One day at a time."><Button variant="secondary" onClick={onCreateDay}><Plus size={17} />Add day</Button></PageHeading>
    {!day ? <EmptyState title="Make room for a day." description="Choose a date and a city. Then start bringing your itinerary together." action={<Button onClick={onCreateDay}>Create your first day<Plus size={17} /></Button>} /> : <>
      <div className="day-rail" aria-label="Choose a day">{days.map(current => <button className="glass day-chip" type="button" key={current.id} aria-pressed={day.id === current.id} onClick={() => onSelectDay(current.id)}><strong>{formatDate(current.date, true)}</strong><span>{current.city}</span></button>)}</div>
      <section className="glass day-header"><div><p className="eyebrow">{formatDate(day.date)}</p><h2>{day.title || day.city}</h2><p className="muted city"><MapPin size={15} />{day.city}</p></div><aside className="day-actions"><span className="day-number">{String(days.indexOf(day) + 1).padStart(2, '0')}</span><Button variant="secondary" onClick={() => onEditDay(day)}><Pencil size={16} />Edit day</Button></aside>{day.notes && <p className="day-notes">{day.notes}</p>}</section>
      <div className="section-heading"><h2>Itinerary <span className="count">{items.length}</span></h2><Button variant="quiet" onClick={() => onAddItem(day)}><Plus size={17} />Add item</Button></div>
      {items.length ? <div className="timeline">{items.map(item => <div className="timeline-row" key={`${item.id}-${day.id}`}><span className="time-chip">{item.time || (item.type === 'stay' && item.checkIn === day.date ? 'Check-in' : item.type === 'stay' && item.checkOut === day.date ? 'Check-out' : 'Any time')}</span><div className="timeline-card" draggable onDragStart={event => { event.dataTransfer.setData('text/plain', item.id); event.dataTransfer.effectAllowed = 'move' }} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const sourceId = event.dataTransfer.getData('text/plain'); if (sourceId && sourceId !== item.id) store.update(current => { const source = current.items.find(record => record.id === sourceId); const target = current.items.find(record => record.id === item.id); if (!source || !target) return current; return { ...current, items: current.items.map(record => record.id === source.id ? { ...record, order: target.order } : record.id === target.id ? { ...record, order: source.order } : record) } }) }}><ItemCard item={item} data={data} store={store} onOpen={onItem} /></div></div>)}</div> : <EmptyState title="Leave space for discovery." description="Add a place, a booking, or a note for this day." action={<Button variant="secondary" onClick={() => onAddItem(day)}>Add the first item</Button>} />}
    </>}
  </>
}
