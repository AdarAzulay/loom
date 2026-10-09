import { ArrowUpRight, Check } from 'lucide-react'
import { formatDate } from '../models/dates'
import type { Item, Library } from '../models/domain'
import { itemConfig } from '../models/itemTypes'

export function itemContext(data: Library, item: Item): string {
  const day = data.days.find(day => day.id === item.dayId)
  return day ? `${formatDate(day.date)} · ${day.city}` : 'Unscheduled'
}

export function ItemCard({ item, data, onOpen }: { item: Item; data: Library; onOpen: (item: Item) => void }) {
  const { icon: Icon, label } = itemConfig[item.type]
  return <button type="button" className="glass item-card" onClick={() => onOpen(item)}>
    <span className="item-icon"><Icon size={21} strokeWidth={1.5} /></span>
    <span className="item-copy"><span className="eyebrow">{label}{item.time ? ` · ${item.time}` : ''}</span><strong>{item.title}</strong><span className="muted small">{itemContext(data, item)}</span></span>
    <span className="item-end">{item.booking.status === 'booked' ? <span className="badge"><Check size={12} />Booked</span> : <ArrowUpRight size={18} />}</span>
  </button>
}
