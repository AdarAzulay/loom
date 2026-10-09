import { describe, expect, it } from 'vitest'
import { createDay, deleteTrip, emptyLibrary, isSafeUrl, librarySchema, saveItem, saveTrip, updateDay } from './domain'
import { formatDate, isDateOnly } from './dates'
import { day, item, populatedLibrary, trip } from '../test/fixtures'

describe('calendar dates', () => {
  it.each(['2028-02-29', '2000-02-29', '2099-12-31', '0001-01-01', '2031-04-30'])('accepts %s without fixed months/years', date => expect(isDateOnly(date)).toBe(true))
  it.each(['1900-02-29', '2029-02-29', '2031-04-31', '2030-00-01', '0000-01-01', '2028-2-9', '2028-02-29T00:00:00Z'])('rejects %s', date => expect(isDateOnly(date)).toBe(false))
  it('formats a date without shifting it across time zones', () => {
    expect(formatDate('2028-02-29')).toBe('Feb 29, 2028')
    expect(formatDate('0001-01-01')).toBe('Jan 1, 1')
  })
})

describe('library boundaries', () => {
  it('starts with no demonstration trips', () => expect(emptyLibrary().trips).toEqual([]))
  it('rejects reversed dates and shrinking a trip around existing days', () => {
    expect(() => saveTrip(emptyLibrary(), { ...trip, endDate: '2028-01-01' })).toThrow()
    expect(() => saveTrip(populatedLibrary(), { ...trip, startDate: '2028-03-01' })).toThrow('all existing days')
  })
  it('opens an existing date without replacing details or stable IDs', () => {
    const data = populatedLibrary()
    const result = createDay(data, { ...day, id: 'duplicate', title: 'Other title' })
    expect(result.data).toBe(data)
    expect(result.day).toEqual(day)
  })
  it('edits a day while preserving its stable ID and linked items', () => {
    const data = populatedLibrary()
    const updated = updateDay(data, { ...day, city: 'Tokyo', title: 'Updated plan', notes: 'Bring a light jacket.' })
    expect(updated.days).toEqual([{ ...day, city: 'Tokyo', title: 'Updated plan', notes: 'Bring a light jacket.' }])
    expect(updated.items).toEqual([item])
    expect(() => updateDay(data, { ...day, date: '2028-02-30' })).toThrow()
    expect(() => updateDay(data, { ...day, date: '2028-03-01' })).not.toThrow()
    const withSecondDay = createDay(data, { id: 'day-b', tripId: trip.id, date: '2028-03-01', city: 'Busan', title: '', notes: '' }).data
    expect(() => updateDay(withSecondDay, { ...day, date: '2028-03-01' })).toThrow('only one day')
  })
  it('deletes one trip as a validated cascade while preserving another trip', () => {
    const otherTrip = { id: 'trip-b', name: 'Tokyo only', startDate: '2028-04-01', endDate: '2028-04-03' }
    const otherDay = { id: 'day-b', tripId: otherTrip.id, date: '2028-04-01', city: 'Tokyo', title: '', notes: '' }
    const otherItem = { ...item, id: 'item-b', tripId: otherTrip.id, dayId: otherDay.id, title: 'Other trip item' }
    const data = createDay(saveItem(createDay(saveTrip(populatedLibrary(), otherTrip), otherDay).data, otherItem), { ...day, id: 'duplicate-day', tripId: trip.id, date: '2028-03-01', city: 'Seoul', title: '', notes: '' }).data
    const result = deleteTrip(data, trip.id)
    expect(result.trips).toEqual([otherTrip])
    expect(result.days).toEqual([otherDay])
    expect(result.items).toEqual([otherItem])
    expect(result.selectedTripId).toBe(otherTrip.id)
    expect(deleteTrip(result, otherTrip.id).selectedTripId).toBeNull()
  })
  it('rejects out-of-range days and cross-trip day assignment', () => {
    expect(() => createDay(saveTrip(emptyLibrary(), trip), { ...day, date: '2028-03-05' })).toThrow()
    const data = saveTrip(populatedLibrary(), { ...trip, id: 'trip-b' })
    expect(() => saveItem(data, { ...item, tripId: 'trip-b' })).toThrow('same trip')
  })
  it('rejects duplicate entity IDs, unknown variants, and stale fields from other types', () => {
    const data = populatedLibrary()
    expect(() => librarySchema.parse({ ...data, items: [item, item] })).toThrow('Duplicate record')
    expect(() => librarySchema.parse({ ...data, items: [{ ...item, type: 'unknown' }] })).toThrow()
    expect(() => librarySchema.parse({ ...data, items: [{ ...item, flightNumber: 'KE123' }] })).toThrow()
  })
  it('validates stays against trip dates and check-in', () => {
    const { address: _address, ...base } = item as Extract<typeof item, { address: string }>
    void _address
    expect(() => saveItem(populatedLibrary(), { ...base, type: 'stay', address: '', checkIn: '2028-03-02', checkOut: '2028-03-01' })).toThrow('Check-out')
  })
  it.each(['javascript:alert(1)', 'data:text/html,hi', '/relative', 'https://user:pass@example.com', 'file:///tmp/a'])('rejects unsafe link %s', url => expect(isSafeUrl(url)).toBe(false))
  it('accepts deliberate web links and empty optional links', () => {
    expect(isSafeUrl('https://example.com/예약?q=🍜')).toBe(true)
    expect(isSafeUrl('')).toBe(true)
  })
})
