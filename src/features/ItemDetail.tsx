import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Copy, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { Button } from '../components/ui'
import { itemContext } from '../components/ItemCard'
import { dateRange } from '../models/dates'
import type { Item, Library } from '../models/domain'
import { itemConfig } from '../models/itemTypes'
import type { LibraryStore } from '../app/libraryStore'

export function ItemDetail({ item, data, store, onEdit, onRemove, onDuplicate, onMove }: { item: Item; data: Library; store: LibraryStore; onEdit: () => void; onRemove: () => void; onDuplicate?: () => void; onMove?: (direction: 'up' | 'down') => void }) {
  const config = itemConfig[item.type]
  const [photos, setPhotos] = useState<Awaited<ReturnType<LibraryStore['loadPhotos']>>>([])
  useEffect(() => {
    let active = true
    void store.loadPhotos(item.photoIds).then(records => { if (active) setPhotos(records) })
    return () => { active = false }
  }, [item.photoIds, store])
  return <div className="item-detail">
    <p className="eyebrow">{config.label} · {data.trips.find(trip => trip.id === item.tripId)?.name}</p>
    <p className="muted">{itemContext(data, item)}{item.time && ` · ${item.time} local time`}</p>
    {item.type === 'flight' && <section className="flight-detail-card"><div className="flight-airline"><span>{item.airline || 'Flight'}</span><span>{item.status}</span></div><div className="flight-route"><div><strong>{item.departureCode || item.departure}</strong><span>{item.departure}</span><small>{item.departureDate ?? ''} {item.time}</small></div><div className="flight-line"><span>✈</span><i /></div><div><strong>{item.arrivalCode || item.arrival}</strong><span>{item.arrival}</span><small>{item.arrivalDate ?? ''} {item.arrivalTime || ''}{item.arrivalDate && item.departureDate && item.arrivalDate !== item.departureDate ? ' +1' : ''}</small></div></div><div className="flight-duration"><span>Local departure</span><i /><span>Local arrival</span></div><div className="flight-meta"><span>Seat {item.seat || '—'}</span><span>Terminal {item.terminal || '—'}</span><span>Gate {item.gate || '—'}</span><span>Ref {item.bookingReference || item.booking.reference || '—'}</span></div>{item.manageBookingUrl && <a className="button secondary external-link" href={item.manageBookingUrl} target="_blank" rel="noopener noreferrer">Manage booking<ExternalLink size={16} /></a>}</section>}
    {'departure' in item && item.type !== 'flight' && <div className="detail-block"><span className="eyebrow">Journey</span><p>{item.departure} → {item.arrival}</p>{item.type === 'train' && <p>{item.operator} {item.trainNumber}</p>}</div>}
    {'address' in item && item.address && <div className="detail-block"><span className="eyebrow">Address</span><p>{item.address}</p></div>}
    {item.type === 'stay' && <section className="hotel-detail-card"><div className="hotel-cover" aria-hidden="true"><span className="hotel-window" /><span className="hotel-sun" /></div><div className="detail-block"><span className="eyebrow">{item.lodgingKind} · {dateRange(item.checkIn, item.checkOut)}</span><p><strong>{item.title}</strong></p><p>{item.checkInTime || 'Check-in'} → {item.checkOutTime || 'Check-out'}</p>{item.roomType && <p className="muted small">{item.roomType}</p>}</div>{item.amenities.length > 0 && <div className="amenity-row">{item.amenities.map(amenity => <span className="badge" key={amenity}>{amenity}</span>)}</div>}{item.phone && <p className="muted small">{item.phone}</p>}</section>}
    {item.notes && <div className="detail-block"><span className="eyebrow">Notes</span><p className="preserve-lines">{item.notes}</p></div>}
    {item.instagramUrl && <a className="button secondary external-link" href={item.instagramUrl} target="_blank" rel="noopener noreferrer">Open Instagram<ExternalLink size={16} /></a>}
    {item.place && <div className="detail-block"><span className="eyebrow">Map place</span><div className="map-preview" aria-label={`Map preview for ${item.place.name}`}><span className="map-road road-one" /><span className="map-road road-two" /><span className="map-pin">●</span></div><p><strong>{item.place.name}</strong></p><p>{item.place.address}</p><p className="muted small">{item.place.country} · {item.place.latitude}, {item.place.longitude}</p><a className="button secondary external-link" href={`https://www.google.com/maps/search/?api=1&query=${item.place.latitude},${item.place.longitude}`} target="_blank" rel="noopener noreferrer">Open in Maps<ExternalLink size={16} /></a></div>}
    {photos.length > 0 && <div className="detail-block photo-gallery"><span className="eyebrow">Photos</span><div className="photo-grid">{photos.map(photo => <PhotoImage key={photo.id} blob={photo.blob} alt={`${item.title} photo`} />)}</div></div>}
    <div className="detail-block"><span className="eyebrow">Booking</span><p>{item.booking.status === 'booked' ? 'Booked' : item.booking.status === 'planned' ? 'To book' : 'No booking'}</p>{item.booking.provider && <p>Provider: {item.booking.provider}</p>}{item.booking.reference && <p>Reference: <strong>{item.booking.reference}</strong></p>}</div>
    {item.websiteUrl && <a className="button secondary external-link" href={item.websiteUrl} target="_blank" rel="noopener noreferrer">Open website or confirmation<ExternalLink size={16} /></a>}
    <div className="form-actions"><Button variant="danger" onClick={onRemove}><Trash2 size={16} />Remove</Button>{onDuplicate && <Button variant="secondary" onClick={onDuplicate}><Copy size={16} />Duplicate</Button>} {onMove && <><Button variant="quiet" onClick={() => onMove('up')} aria-label="Move item up"><ArrowUp size={16} /></Button><Button variant="quiet" onClick={() => onMove('down')} aria-label="Move item down"><ArrowDown size={16} /></Button></>}<Button onClick={onEdit}><Pencil size={16} />Edit item</Button></div>
    <p className="form-note">Removed an item by mistake? Undo is available until dismissed or this page is reloaded.</p>
  </div>
}

function PhotoImage({ blob, alt }: { blob: Blob; alt: string }) {
  const [url] = useState(() => URL.createObjectURL(blob))
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return <img src={url} alt={alt} />
}
