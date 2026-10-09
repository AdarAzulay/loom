import { BedDouble, Bus, Coffee, Landmark, MapPin, NotebookPen, Plane, Ticket, FerrisWheel } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ItemType } from './domain'

export const itemConfig: Record<ItemType, { label: string; hint: string; icon: LucideIcon; titleLabel: string }> = {
  flight: { label: 'Flight', hint: 'Airports & flight number', icon: Plane, titleLabel: 'Flight title' },
  stay: { label: 'Hotel / Stay', hint: 'Check-in, kind & nights', icon: BedDouble, titleLabel: 'Hotel or stay name' },
  transport: { label: 'Transport', hint: 'From here to there', icon: Bus, titleLabel: 'Journey name' },
  train: { label: 'Train', hint: 'Rail route & reservation', icon: Bus, titleLabel: 'Train journey' },
  carTaxi: { label: 'Car / Taxi', hint: 'Pickup & drop-off', icon: Bus, titleLabel: 'Ride' },
  restaurant: { label: 'Restaurant', hint: 'A table worth saving', icon: Coffee, titleLabel: 'Restaurant name' },
  cafe: { label: 'Cafe', hint: 'Coffee, tea & a pause', icon: Coffee, titleLabel: 'Cafe name' },
  museum: { label: 'Museum', hint: 'Art, history & discovery', icon: Landmark, titleLabel: 'Museum name' },
  show: { label: 'Show', hint: 'Something to look forward to', icon: Ticket, titleLabel: 'Show name' },
  themePark: { label: 'Theme park', hint: 'A day of adventure', icon: FerrisWheel, titleLabel: 'Theme park name' },
  shopping: { label: 'Shopping', hint: 'A market or store', icon: MapPin, titleLabel: 'Shopping spot' },
  tour: { label: 'Tour', hint: 'A guided experience', icon: MapPin, titleLabel: 'Tour name' },
  ticketPass: { label: 'Ticket / Pass', hint: 'Admission or transit pass', icon: Ticket, titleLabel: 'Ticket or pass' },
  document: { label: 'Document', hint: 'A saved travel file', icon: NotebookPen, titleLabel: 'Document title' },
  place: { label: 'Place', hint: 'Somewhere to remember', icon: MapPin, titleLabel: 'Place name' },
  note: { label: 'Note', hint: 'Keep a thought for later', icon: NotebookPen, titleLabel: 'Note title' },
}
