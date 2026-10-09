import { MapPin, Pencil, Plus } from 'lucide-react'
import { Button, EmptyState, PageHeading } from '../components/ui'
import { ItemCard } from '../components/ItemCard'
import { formatDate } from '../models/dates'
import { orderedItems, tripDays } from '../models/domain'
import type { Day, Item, Library, Trip } from '../models/domain'

export function Days({ data, trip, selectedDayId, onSelectDay, onCreateDay, onEditDay, onAddItem, onItem }: {
  data: Library; trip: Trip; selectedDayId: string | null; onSelectDay: (id: string) => void; onCreateDay: () => void; onEditDay: (day: Day) => void; onAddItem: (day: Day) => void; onItem: (item: Item) => void
}) {
  const days = tripDays(data, trip.id)
  const day = days.find(day => day.id === selectedDayId) ?? days[0]
  const items = day ? orderedItems(data.items.filter(item => item.dayId === day.id)) : []
  return <>
    <PageHeading eyebrow={trip.name} title="One day at a time."><Button variant="secondary" onClick={onCreateDay}><Plus size={17} />Add day</Button></PageHeading>
    {!day ? <EmptyState title="Make room for a day." description="Choose a date and a city. Then start bringing your itinerary together." action={<Button onClick={onCreateDay}>Create your first day<Plus size={17} /></Button>} /> : <>
      <div className="day-rail" aria-label="Choose a day">{days.map(current => <button className="glass day-chip" type="button" key={current.id} aria-pressed={day.id === current.id} onClick={() => onSelectDay(current.id)}><strong>{formatDate(current.date, true)}</strong><span>{current.city}</span></button>)}</div>
      <section className="glass day-header"><div><p className="eyebrow">{formatDate(day.date)}</p><h2>{day.title || day.city}</h2><p className="muted city"><MapPin size={15} />{day.city}</p></div><aside className="day-actions"><span className="day-number">{String(days.indexOf(day) + 1).padStart(2, '0')}</span><Button variant="secondary" onClick={() => onEditDay(day)}><Pencil size={16} />Edit day</Button></aside>{day.notes && <p className="day-notes">{day.notes}</p>}</section>
      <div className="section-heading"><h2>Itinerary <span className="count">{items.length}</span></h2><Button variant="quiet" onClick={() => onAddItem(day)}><Plus size={17} />Add item</Button></div>
      {items.length ? <div className="stack">{items.map(item => <ItemCard key={item.id} item={item} data={data} onOpen={onItem} />)}</div> : <EmptyState title="Leave space for discovery." description="Add a place, a booking, or a note for this day." action={<Button variant="secondary" onClick={() => onAddItem(day)}>Add the first item</Button>} />}
    </>}
  </>
}
