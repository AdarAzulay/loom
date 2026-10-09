import { z } from 'zod'
import { isDateOnly } from './dates'

const id = z.string().min(1).max(100)
const title = z.string().trim().min(1, 'Enter a name.').max(100)
const text = z.string().trim().max(2000)
const shortText = z.string().trim().max(200)
const date = z.string().refine(isDateOnly, 'Enter a valid calendar date.')
const time = z.string().regex(/^$|^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Use a valid local time.')
const photoIdList = z.array(id).max(24, 'Keep up to 24 photos on an item.').default([])
const status = z.enum(['planned', 'booked', 'done']).default('planned')
const priceSchema = z.object({ amount: z.number().finite().nonnegative(), currency: shortText }).strict().nullable().default(null)
const placeSchema = z.object({
  name: shortText, address: shortText,
  latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180),
  country: shortText,
}).strict().nullable().default(null)
const bookingSchema = z.object({
  status: z.enum(['none', 'planned', 'booked']), provider: shortText, reference: shortText,
}).strict()

export function isSafeUrl(value: string): boolean {
  if (!value) return true
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
  } catch { return false }
}

export const profileSchema = z.object({
  id: id.default('profile'),
  displayName: z.string().trim().min(1, 'Enter your name.').max(60),
  avatarId: id.nullable().default(null),
  lastBackupAt: z.string().datetime().nullable().default(null),
  appearance: z.enum(['system', 'light', 'dark']).default('system'),
  glassLevel: z.enum(['clear', 'soft', 'solid']).default('soft'),
  palette: z.enum(['sky', 'blush', 'sand']).default('sky'),
}).strict()

export const tripSchema = z.object({ id, name: title, startDate: date, endDate: date }).strict()
  .refine(trip => trip.startDate <= trip.endDate, { message: 'End date must be on or after start date.', path: ['endDate'] })

export const daySchema = z.object({
  id, tripId: id, date, city: title, title: shortText, notes: text,
  country: shortText.default(''), timeZone: shortText.default(''), currency: z.enum(['', 'KRW', 'JPY']).default(''),
}).strict()

export const itemTypes = ['flight', 'stay', 'transport', 'train', 'carTaxi', 'restaurant', 'cafe', 'museum', 'show', 'themePark', 'shopping', 'tour', 'ticketPass', 'document', 'place', 'note'] as const
export type ItemType = typeof itemTypes[number]
export type VenueType = 'restaurant' | 'cafe' | 'museum' | 'show' | 'themePark' | 'shopping' | 'tour' | 'place'
export const isVenueType = (type: ItemType): type is VenueType =>
  type === 'restaurant' || type === 'cafe' || type === 'museum' || type === 'show' || type === 'themePark' || type === 'shopping' || type === 'tour' || type === 'place'

const itemBase = {
  id, tripId: id, dayId: id.nullable(), title,
  time, notes: text,
  websiteUrl: z.string().trim().max(2000).refine(isSafeUrl, 'Use a full http:// or https:// link without sign-in details.'),
  instagramUrl: z.string().trim().max(2000).refine(isSafeUrl, 'Use a full http:// or https:// Instagram link without sign-in details.'),
  place: placeSchema,
  photoIds: photoIdList,
  status,
  order: z.number().int().nonnegative().default(0),
  price: priceSchema,
  booking: bookingSchema,
}

const venueVariants = z.object({ ...itemBase, type: z.enum(['restaurant', 'cafe', 'museum', 'show', 'themePark', 'shopping', 'tour', 'place']), address: shortText }).strict()

// Variants own their fields. A note cannot silently acquire flight/stay properties.
export const itemSchema = z.discriminatedUnion('type', [
  z.object({ ...itemBase, type: z.literal('flight'), departure: title, arrival: title, flightNumber: shortText,
    airline: shortText.default(''), departureCode: shortText.default(''), arrivalCode: shortText.default(''),
    departureDate: date.nullable().default(null), arrivalDate: date.nullable().default(null), arrivalTime: time.default(''),
    departureTimeZone: shortText.default(''), arrivalTimeZone: shortText.default(''), terminal: shortText.default(''), gate: shortText.default(''),
    seat: shortText.default(''), cabin: shortText.default(''), baggage: shortText.default(''), bookingReference: shortText.default(''),
    ticketNumber: shortText.default(''), passengers: z.array(shortText).max(12).default([]),
    manageBookingUrl: z.string().trim().max(2000).refine(isSafeUrl, 'Use a full http:// or https:// link without sign-in details.').default(''),
  }).strict(),
  z.object({ ...itemBase, type: z.literal('stay'), address: shortText, checkIn: date, checkOut: date,
    lodgingKind: z.enum(['hotel', 'hostel', 'ryokan', 'apartment', 'other']).default('other'), checkInTime: time.default(''), checkOutTime: time.default(''),
    roomType: shortText.default(''), phone: shortText.default(''), amenities: z.array(shortText).max(16).default([]), cancellationNotes: text.default(''),
  }).strict(),
  z.object({ ...itemBase, type: z.literal('transport'), departure: title, arrival: title }).strict(),
  z.object({ ...itemBase, type: z.literal('train'), operator: shortText.default(''), trainNumber: shortText.default(''), departure: title, arrival: title,
    departureTime: time.default(''), arrivalTime: time.default(''), car: shortText.default(''), seat: shortText.default(''), reservationNumber: shortText.default(''), passUsed: shortText.default('') }).strict(),
  z.object({ ...itemBase, type: z.literal('carTaxi'), provider: shortText.default(''), pickup: shortText.default(''), dropoff: shortText.default(''), pickupTime: time.default(''), dropoffTime: time.default(''), confirmation: shortText.default('') }).strict(),
  venueVariants,
  z.object({ ...itemBase, type: z.literal('ticketPass'), ticketKind: shortText.default(''), validFrom: date.nullable().default(null), validUntil: date.nullable().default(null) }).strict(),
  z.object({ ...itemBase, type: z.literal('document'), documentKind: shortText.default(''), documentUrl: z.string().trim().max(2000).refine(isSafeUrl, 'Use a full http:// or https:// link without sign-in details.').default('') }).strict(),
  z.object({ ...itemBase, type: z.literal('note') }).strict(),
])

export type Profile = z.infer<typeof profileSchema>
export type Trip = z.infer<typeof tripSchema>
export type Day = z.infer<typeof daySchema>
export type Item = z.infer<typeof itemSchema>
export type DayInput = z.input<typeof daySchema>
export type ItemInput = z.input<typeof itemSchema>

// Version 1 is kept as an explicit input shape for the non-destructive migration.
const legacyItemBase = {
  id, tripId: id, dayId: id.nullable(), title, time, notes: text,
  websiteUrl: z.string().trim().max(2000).refine(isSafeUrl, 'Use a full http:// or https:// link without sign-in details.'), booking: bookingSchema,
}
const legacyItemSchema = z.discriminatedUnion('type', [
  z.object({ ...legacyItemBase, type: z.literal('flight'), departure: title, arrival: title, flightNumber: shortText }).strict(),
  z.object({ ...legacyItemBase, type: z.literal('stay'), address: shortText, checkIn: date, checkOut: date }).strict(),
  z.object({ ...legacyItemBase, type: z.literal('transport'), departure: title, arrival: title }).strict(),
  z.object({ ...legacyItemBase, type: z.enum(['restaurant', 'museum', 'show', 'themePark', 'place']), address: shortText }).strict(),
  z.object({ ...legacyItemBase, type: z.literal('note') }).strict(),
])

export const librarySchema = z.object({
  profile: profileSchema, selectedTripId: id.nullable(), trips: z.array(tripSchema), days: z.array(daySchema), items: z.array(itemSchema),
}).strict().superRefine(validateLibraryRelations)
export type Library = z.infer<typeof librarySchema>

export const legacyLibrarySchema = z.object({
  profile: profileSchema, selectedTripId: id.nullable(), trips: z.array(tripSchema), days: z.array(daySchema), items: z.array(legacyItemSchema),
}).strict().superRefine(validateLibraryRelations)
export type LegacyLibrary = z.infer<typeof legacyLibrarySchema>

function validateLibraryRelations(data: { trips: Array<{ id: string; startDate: string; endDate: string }>; days: Array<{ id: string; tripId: string; date: string }>; items: Array<{ id: string; tripId: string; dayId: string | null; type: string; checkIn?: string; checkOut?: string }>; selectedTripId: string | null }, ctx: z.RefinementCtx) {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message })
  for (const records of [data.trips, data.days, data.items]) if (new Set(records.map(record => record.id)).size !== records.length) issue('Duplicate record IDs are not allowed.')
  if (data.selectedTripId && !data.trips.some(trip => trip.id === data.selectedTripId)) issue('Selected trip was not found.')
  const dates = new Set<string>()
  for (const day of data.days) {
    const trip = data.trips.find(trip => trip.id === day.tripId)
    if (!trip) issue('Every day must belong to an existing trip.')
    else if (day.date < trip.startDate || day.date > trip.endDate) issue('Trip dates must include all existing days.')
    const key = `${day.tripId}:${day.date}`
    if (dates.has(key)) issue('A trip can have only one day per date.')
    dates.add(key)
  }
  for (const item of data.items) {
    const trip = data.trips.find(trip => trip.id === item.tripId)
    if (!trip) issue('Every item must belong to an existing trip.')
    if (item.dayId && !data.days.some(day => day.id === item.dayId && day.tripId === item.tripId)) issue('Choose a day from the same trip as this item.')
    if (item.type === 'stay' && item.checkIn && item.checkOut) {
      if (item.checkOut <= item.checkIn) issue('Check-out must be after check-in.')
      if (trip && (item.checkIn < trip.startDate || item.checkOut > trip.endDate)) issue('Stay dates must fit within the trip dates.')
    }
  }
}

export function migrateV1Library(value: unknown): Library {
  const legacy = legacyLibrarySchema.parse(value)
  return librarySchema.parse({ ...legacy, items: legacy.items.map(item => ({ ...item, instagramUrl: '', place: null, photoIds: [], status: item.booking.status === 'booked' ? 'booked' : 'planned', order: 0, price: null })) })
}

export function migrateV2Library(value: unknown): Library { return librarySchema.parse(value) }

export const emptyLibrary = (): Library => ({
  profile: { id: 'profile', displayName: 'traveler', avatarId: null, lastBackupAt: null, appearance: 'system', glassLevel: 'soft', palette: 'sky' },
  selectedTripId: null, trips: [], days: [], items: [],
})

export function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? 'Please check the form.'
  return error instanceof Error ? error.message : 'Something went wrong. Your changes are still here.'
}

export function saveTrip(data: Library, input: Trip): Library {
  const trip = tripSchema.parse(input)
  return librarySchema.parse({ ...data, selectedTripId: trip.id, trips: upsert(data.trips, trip) })
}

export function deleteTrip(data: Library, tripId: string): Library {
  if (!data.trips.some(trip => trip.id === tripId)) throw new Error('This trip could not be found.')
  const trips = data.trips.filter(trip => trip.id !== tripId)
  return librarySchema.parse({ ...data, trips, selectedTripId: data.selectedTripId === tripId ? trips[0]?.id ?? null : data.selectedTripId, days: data.days.filter(day => day.tripId !== tripId), items: data.items.filter(item => item.tripId !== tripId) })
}

export function createDay(data: Library, input: DayInput): { data: Library; day: Day } {
  const day = daySchema.parse(input)
  const existing = data.days.find(current => current.tripId === day.tripId && current.date === day.date)
  if (existing) return { data, day: existing }
  return { data: librarySchema.parse({ ...data, days: [...data.days, day] }), day }
}

export function updateDay(data: Library, input: DayInput): Library {
  const day = daySchema.parse(input)
  if (!data.days.some(current => current.id === day.id && current.tripId === day.tripId)) throw new Error('This day could not be found in the trip.')
  return librarySchema.parse({ ...data, days: upsert(data.days, day) })
}

/** New-item creation always allocates a fresh ID; editing is the only path that may reuse one. */
export function createItem(data: Library, input: ItemInput & { id?: string }): { data: Library; item: Item } {
  const requestedId = input.id
  const idToUse = requestedId && !data.items.some(current => current.id === requestedId) ? requestedId : crypto.randomUUID()
  const item = itemSchema.parse({ ...input, id: idToUse })
  return { data: librarySchema.parse({ ...data, items: [...data.items, item] }), item }
}

export function saveItem(data: Library, input: ItemInput): Library {
  const item = itemSchema.parse(input)
  return librarySchema.parse({ ...data, items: upsert(data.items, item) })
}

export function deleteItem(data: Library, itemId: string): Library {
  if (!data.items.some(item => item.id === itemId)) throw new Error('This item could not be found.')
  return librarySchema.parse({ ...data, items: data.items.filter(item => item.id !== itemId) })
}

export function duplicateItem(data: Library, itemId: string): { data: Library; item: Item } {
  const source = data.items.find(item => item.id === itemId)
  if (!source) throw new Error('This item could not be found.')
  return createItem(data, { ...source, title: `${source.title} copy`, order: source.order + 1 })
}

export function moveItem(data: Library, itemId: string, direction: 'up' | 'down'): Library {
  const target = data.items.find(item => item.id === itemId)
  if (!target) throw new Error('This item could not be found.')
  const siblings = orderedItems(data.items.filter(item => item.dayId === target.dayId && item.tripId === target.tripId))
  const index = siblings.findIndex(item => item.id === target.id)
  const swap = siblings[index + (direction === 'up' ? -1 : 1)]
  if (!swap) return data
  const next = data.items.map(item => item.id === target.id ? { ...item, order: swap.order } : item.id === swap.id ? { ...item, order: target.order } : item)
  return librarySchema.parse({ ...data, items: next })
}

function upsert<T extends { id: string }>(records: T[], record: T): T[] { return records.some(current => current.id === record.id) ? records.map(current => current.id === record.id ? record : current) : [...records, record] }
export const tripDays = (data: Library, tripId: string) => data.days.filter(day => day.tripId === tripId).sort((a, b) => a.date.localeCompare(b.date))
export function orderedItems(items: Item[]): Item[] { return [...items].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99') || a.order - b.order || a.title.localeCompare(b.title)) }
