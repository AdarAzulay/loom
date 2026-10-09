import { useEffect, useState } from 'react'
import { ArrowUpRight, Check } from 'lucide-react'
import { formatDate } from '../models/dates'
import type { Item, Library } from '../models/domain'
import { itemConfig } from '../models/itemTypes'
import type { LibraryStore } from '../app/libraryStore'

export function itemContext(data: Library, item: Item): string {
  const day = data.days.find(day => day.id === item.dayId)
  return day ? `${formatDate(day.date)} · ${day.city}` : 'Unscheduled'
}

export function ItemCard({ item, data, store, onOpen }: { item: Item; data: Library; store: LibraryStore; onOpen: (item: Item) => void }) {
  const { icon: Icon, label } = itemConfig[item.type]
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    let url: string | undefined
    void store.loadPhotos(item.photoIds.slice(0, 1)).then(photos => {
      if (!active || !photos[0]) return
      url = URL.createObjectURL(photos[0].blob)
      setThumbnail(url)
    })
    return () => { active = false; if (url) URL.revokeObjectURL(url) }
  }, [item.photoIds, store])
  return <button type="button" className="glass item-card" onClick={() => onOpen(item)}>
    {thumbnail ? <img className="item-thumb" src={thumbnail} alt="" /> : <span className="item-icon"><Icon size={21} strokeWidth={1.5} /></span>}
    <span className="item-copy">{item.type === 'flight' ? <><span className="eyebrow">{item.airline || label}{item.flightNumber ? ` · ${item.flightNumber}` : ''}</span><strong className="flight-card-route"><span>{item.departureCode || item.departure}</span><i>→</i><span>{item.arrivalCode || item.arrival}</span></strong><span className="muted small">{item.departure} · {item.time || 'Local time'} → {item.arrival} {item.arrivalDate && item.departureDate && item.arrivalDate !== item.departureDate ? '+1' : ''}</span><span className="flight-card-strip">Seat {item.seat || '—'} · Terminal {item.terminal || '—'} · Gate {item.gate || '—'}</span></> : <><span className="eyebrow">{label}{item.time ? ` · ${item.time}` : ''}</span><strong>{item.title}</strong><span className="muted small">{itemContext(data, item)}</span></>}</span>
    <span className="item-end">{item.booking.status === 'booked' ? <span className="badge"><Check size={12} />Booked</span> : <ArrowUpRight size={18} />}{item.photoIds.length > 0 && <span className="muted small">{item.photoIds.length} photo{item.photoIds.length === 1 ? '' : 's'}</span>}</span>
  </button>
}
