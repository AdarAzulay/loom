import { createDay, emptyLibrary, saveItem, saveTrip } from '../models/domain'
import type { Item } from '../models/domain'

// Only tests import this fixture. Production never seeds sample records.
export const trip = { id: 'trip-a', name: '韓国 & 日本', startDate: '2028-02-28', endDate: '2028-03-04' }
export const day = { id: 'day-a', tripId: trip.id, date: '2028-02-29', city: '서울', title: 'A quiet afternoon', notes: '' }
export const item: Item = {
  id: 'item-a', tripId: trip.id, dayId: day.id, type: 'restaurant', title: '저녁 🍜',
  address: 'Seoul', time: '19:30', notes: 'Window table', websiteUrl: 'https://example.com/confirmation',
  booking: { status: 'booked', provider: 'Restaurant', reference: 'SEOUL-123' },
}
export function populatedLibrary() {
  return saveItem(createDay(saveTrip(emptyLibrary(), trip), day).data, item)
}
