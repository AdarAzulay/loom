import { BedDouble, Bus, Coffee, Landmark, MapPin, NotebookPen, Plane, Ticket, FerrisWheel } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ItemType } from './domain'

export const itemConfig: Record<ItemType, { label: string; hint: string; icon: LucideIcon; titleLabel: string }> = {
  flight: { label: 'Flight', hint: 'Airports & flight number', icon: Plane, titleLabel: 'Flight title' },
  stay: { label: 'Stay', hint: 'Check-in & check-out', icon: BedDouble, titleLabel: 'Stay name' },
  transport: { label: 'Transport', hint: 'From here to there', icon: Bus, titleLabel: 'Journey name' },
  restaurant: { label: 'Restaurant', hint: 'A table worth saving', icon: Coffee, titleLabel: 'Restaurant name' },
  museum: { label: 'Museum', hint: 'Art, history & discovery', icon: Landmark, titleLabel: 'Museum name' },
  show: { label: 'Show', hint: 'Something to look forward to', icon: Ticket, titleLabel: 'Show name' },
  themePark: { label: 'Theme park', hint: 'A day of adventure', icon: FerrisWheel, titleLabel: 'Theme park name' },
  place: { label: 'Place', hint: 'Somewhere to remember', icon: MapPin, titleLabel: 'Place name' },
  note: { label: 'Note', hint: 'Keep a thought for later', icon: NotebookPen, titleLabel: 'Note title' },
}
