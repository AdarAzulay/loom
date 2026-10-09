import { z } from 'zod'
import { isDateOnly } from './dates'

const id = z.string().min(1).max(100)
const title = z.string().trim().min(1, 'Enter a name.').max(100)
const text = z.string().trim().max(2000)
const shortText = z.string().trim().max(200)
const date = z.string().refine(isDateOnly, 'Enter a valid calendar date.')
const time = z.string().regex(/^$|^(?:[01]\d|2[0-3]):[0-5]\d$/, 'Use a valid local time.')

export function isSafeUrl(value: string): boolean {
  if (!value) return true
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
  } catch { return false }
}

export const profileSchema = z.object({
  displayName: z.string().trim().min(1, 'Enter your name.').max(60),
  appearance: z.enum(['system', 'light', 'dark']),
}).strict()

export const tripSchema = z.object({ id, name: title, startDate: date, endDate: date }).strict()
  .refine(trip => trip.startDate <= trip.endDate, { message: 'End date must be on or after start date.', path: ['endDate'] })

export const daySchema = z.object({
  id, tripId: id, date, city: title, title: shortText, notes: text,
}).strict()

export const itemTypes = ['flight', 'stay', 'transport', 'restaurant', 'museum', 'show', 'themePark', 'place', 'note'] as const
export type ItemType = typeof itemTypes[number]
export type VenueType = 'restaurant' | 'museum' | 'show' | 'themePark' | 'place'
export const isVenueType = (type: ItemType): type is VenueType =>
  type === 'restaurant' || type === 'museum' || type === 'show' || type === 'themePark' || type === 'place'

const itemBase = {
  id, tripId: id, dayId: id.nullable(), title,
  time, notes: text,
  websiteUrl: z.string().trim().max(2000).refine(isSafeUrl, 'Use a full http:// or https:// link without sign-in details.'),
  booking: z.object({
    status: z.enum(['none', 'planned', 'booked']), provider: shortText, reference: shortText,
  }).strict(),
}

// Variants own their fields. A note cannot silently acquire flight/stay properties.
export const itemSchema = z.discriminatedUnion('type', [
  z.object({ ...itemBase, type: z.literal('flight'), departure: title, arrival: title, flightNumber: shortText }).strict(),
  z.object({ ...itemBase, type: z.literal('stay'), address: shortText, checkIn: date, checkOut: date }).strict(),
  z.object({ ...itemBase, type: z.literal('transport'), departure: title, arrival: title }).strict(),
  z.object({ ...itemBase, type: z.enum(['restaurant', 'museum', 'show', 'themePark', 'place']), address: shortText }).strict(),
  z.object({ ...itemBase, type: z.literal('note') }).strict(),
])

export type Profile = z.infer<typeof profileSchema>
export type Trip = z.infer<typeof tripSchema>
export type Day = z.infer<typeof daySchema>
export type Item = z.infer<typeof itemSchema>

export const librarySchema = z.object({
  profile: profileSchema, selectedTripId: id.nullable(),
  trips: z.array(tripSchema), days: z.array(daySchema), items: z.array(itemSchema),
}).strict().superRefine((data, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message })
  for (const records of [data.trips, data.days, data.items]) {
    if (new Set(records.map(record => record.id)).size !== records.length) issue('Duplicate record IDs are not allowed.')
  }
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
    if (item.dayId && !data.days.some(day => day.id === item.dayId && day.tripId === item.tripId)) {
      issue('Choose a day from the same trip as this item.')
    }
    if (item.type === 'stay') {
      if (item.checkOut <= item.checkIn) issue('Check-out must be after check-in.')
      if (trip && (item.checkIn < trip.startDate || item.checkOut > trip.endDate)) issue('Stay dates must fit within the trip dates.')
    }
  }
})

export type Library = z.infer<typeof librarySchema>
export const emptyLibrary = (): Library => ({
  profile: { displayName: 'traveler', appearance: 'system' },
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
  return librarySchema.parse({
    ...data, trips,
    selectedTripId: data.selectedTripId === tripId ? trips[0]?.id ?? null : data.selectedTripId,
    days: data.days.filter(day => day.tripId !== tripId),
    items: data.items.filter(item => item.tripId !== tripId),
  })
}

export function createDay(data: Library, input: Day): { data: Library; day: Day } {
  const day = daySchema.parse(input)
  const existing = data.days.find(current => current.tripId === day.tripId && current.date === day.date)
  if (existing) return { data, day: existing }
  return { data: librarySchema.parse({ ...data, days: [...data.days, day] }), day }
}

export function updateDay(data: Library, input: Day): Library {
  const day = daySchema.parse(input)
  if (!data.days.some(current => current.id === day.id && current.tripId === day.tripId)) {
    throw new Error('This day could not be found in the trip.')
  }
  return librarySchema.parse({ ...data, days: upsert(data.days, day) })
}

export function saveItem(data: Library, input: Item): Library {
  const item = itemSchema.parse(input)
  return librarySchema.parse({ ...data, items: upsert(data.items, item) })
}

function upsert<T extends { id: string }>(records: T[], record: T): T[] {
  return records.some(current => current.id === record.id)
    ? records.map(current => current.id === record.id ? record : current)
    : [...records, record]
}

export const tripDays = (data: Library, tripId: string) =>
  data.days.filter(day => day.tripId === tripId).sort((a, b) => a.date.localeCompare(b.date))

export function orderedItems(items: Item[]): Item[] {
  return [...items].sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99') || a.title.localeCompare(b.title))
}
