import { ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { Button } from '../components/ui'
import { itemContext } from '../components/ItemCard'
import { dateRange } from '../models/dates'
import type { Item, Library } from '../models/domain'
import { itemConfig } from '../models/itemTypes'

export function ItemDetail({ item, data, onEdit, onRemove }: { item: Item; data: Library; onEdit: () => void; onRemove: () => void }) {
  const config = itemConfig[item.type]
  return <div className="item-detail">
    <p className="eyebrow">{config.label} · {data.trips.find(trip => trip.id === item.tripId)?.name}</p>
    <p className="muted">{itemContext(data, item)}{item.time && ` · ${item.time} local time`}</p>
    {'departure' in item && <div className="detail-block"><span className="eyebrow">Journey</span><p>{item.departure} → {item.arrival}</p>{item.type === 'flight' && item.flightNumber && <p>{item.flightNumber}</p>}</div>}
    {'address' in item && item.address && <div className="detail-block"><span className="eyebrow">Address</span><p>{item.address}</p></div>}
    {item.type === 'stay' && <div className="detail-block"><span className="eyebrow">Check-in → Check-out</span><p>{dateRange(item.checkIn, item.checkOut)}</p></div>}
    {item.notes && <div className="detail-block"><span className="eyebrow">Notes</span><p className="preserve-lines">{item.notes}</p></div>}
    <div className="detail-block"><span className="eyebrow">Booking</span><p>{item.booking.status === 'booked' ? 'Booked' : item.booking.status === 'planned' ? 'To book' : 'No booking'}</p>{item.booking.provider && <p>Provider: {item.booking.provider}</p>}{item.booking.reference && <p>Reference: <strong>{item.booking.reference}</strong></p>}</div>
    {item.websiteUrl && <a className="button secondary external-link" href={item.websiteUrl} target="_blank" rel="noopener noreferrer">Open website or confirmation<ExternalLink size={16} /></a>}
    <div className="form-actions"><Button variant="danger" onClick={onRemove}><Trash2 size={16} />Remove</Button><Button onClick={onEdit}><Pencil size={16} />Edit item</Button></div>
    <p className="form-note">Removed an item by mistake? Undo is available until dismissed or this page is reloaded.</p>
  </div>
}
