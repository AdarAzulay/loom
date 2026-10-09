import { Button, Field, Form, SelectField, TextField, value } from '../components/ui'
import { createDay, isVenueType, profileSchema, saveItem, saveTrip, tripDays, updateDay } from '../models/domain'
import type { Day, Item, ItemType, Library, Trip } from '../models/domain'
import { formatDate } from '../models/dates'
import { itemConfig } from '../models/itemTypes'
import type { LibraryStore } from '../app/libraryStore'

interface FormProps { store: LibraryStore; onDone: () => void }

export function TripForm({ store, trip, onDone }: FormProps & { trip?: Trip }) {
  return <Form onCancel={onDone} submitLabel={trip ? 'Save trip' : 'Create trip'} onSave={form => {
    store.update(data => saveTrip(data, {
      id: trip?.id ?? crypto.randomUUID(), name: value(form, 'name'), startDate: value(form, 'startDate'), endDate: value(form, 'endDate'),
    }))
    onDone()
  }}>
    <TextField label="Trip name" name="name" defaultValue={trip?.name} placeholder="Where are you headed?" required maxLength={100} autoFocus />
    <div className="form-grid">
      <TextField label="Start date" name="startDate" type="date" defaultValue={trip?.startDate} required min="0001-01-01" max="9999-12-31" />
      <TextField label="End date" name="endDate" type="date" defaultValue={trip?.endDate} required min="0001-01-01" max="9999-12-31" />
    </div>
    <p className="form-note">{trip ? 'Existing days and stays must remain within your trip dates.' : 'Start with a name and dates. Your trip will be ready for its first day.'}</p>
  </Form>
}

export function DayForm({ store, trip, day, onDone, onSaved }: FormProps & { trip: Trip; day?: Day; onSaved: (day: Day) => void }) {
  return <Form onCancel={onDone} submitLabel={day ? 'Save day changes' : 'Save day'} onSave={form => {
    let savedDay: Day | undefined
    store.update(data => {
      const input = { id: day?.id ?? crypto.randomUUID(), tripId: trip.id, date: value(form, 'date'), city: value(form, 'city'), title: value(form, 'title'), notes: value(form, 'notes') }
      const result = day ? { data: updateDay(data, input), day: input } : createDay(data, input)
      savedDay = result.day
      return result.data
    })
    if (savedDay) onSaved(savedDay)
  }}>
    <TextField label="Date" name="date" type="date" min={trip.startDate} max={trip.endDate} defaultValue={day?.date ?? trip.startDate} required />
    <TextField label="City" name="city" placeholder="City or travel route" maxLength={100} defaultValue={day?.city} required />
    <TextField label="Day title (optional)" name="title" placeholder="A slow start, a new neighborhood…" maxLength={200} defaultValue={day?.title} />
    <Field label="Notes (optional)"><textarea name="notes" rows={3} maxLength={2000} defaultValue={day?.notes} /></Field>
    <p className="form-note">{day ? 'Choose a date within this trip that is not used by another day. Your linked items move with this day; their local times and any stay check-in/check-out dates remain as entered.' : 'One day per date. If this date already exists, we’ll open that day and keep its details.'}</p>
  </Form>
}

export function ItemForm({ store, data, trip, type, item, dayId, onDone, onSaved }: FormProps & {
  data: Library; trip: Trip; type: ItemType; item?: Item; dayId?: string; onSaved: (item: Item) => void
}) {
  const config = itemConfig[type]
  const days = tripDays(data, trip.id)
  return <Form onCancel={onDone} submitLabel={item ? 'Save changes' : 'Add item'} onSave={form => {
    const base = {
      id: item?.id ?? crypto.randomUUID(), tripId: trip.id,
      dayId: value(form, 'dayId') || null, title: value(form, 'title'), time: value(form, 'time'),
      websiteUrl: value(form, 'websiteUrl'), notes: value(form, 'notes'),
      booking: { status: value(form, 'bookingStatus') as Item['booking']['status'], provider: value(form, 'provider'), reference: value(form, 'reference') },
    }
    let next: Item
    if (type === 'flight') next = { ...base, type, departure: value(form, 'departure'), arrival: value(form, 'arrival'), flightNumber: value(form, 'flightNumber') }
    else if (type === 'transport') next = { ...base, type, departure: value(form, 'departure'), arrival: value(form, 'arrival') }
    else if (type === 'stay') next = { ...base, type, address: value(form, 'address'), checkIn: value(form, 'checkIn'), checkOut: value(form, 'checkOut') }
    else if (isVenueType(type)) next = { ...base, type, address: value(form, 'address') }
    else next = { ...base, type: 'note' }
    store.update(current => saveItem(current, next))
    onSaved(next)
  }}>
    <TextField label={config.titleLabel} name="title" defaultValue={item?.title} maxLength={100} required autoFocus />
    <SelectField label="Day" name="dayId" defaultValue={item?.dayId ?? dayId ?? ''}>
      <option value="">Unscheduled · save for later</option>
      {days.map(day => <option key={day.id} value={day.id}>{formatDate(day.date)} · {day.city}</option>)}
    </SelectField>
    {(type === 'flight' || type === 'transport') && <>
      <div className="form-grid">
        <TextField label={type === 'flight' ? 'Departure airport' : 'From'} name="departure" required maxLength={100} defaultValue={item && 'departure' in item ? item.departure : ''} />
        <TextField label={type === 'flight' ? 'Arrival airport' : 'To'} name="arrival" required maxLength={100} defaultValue={item && 'arrival' in item ? item.arrival : ''} />
      </div>
      {type === 'flight' && <TextField label="Flight number (optional)" name="flightNumber" maxLength={200} defaultValue={item?.type === 'flight' ? item.flightNumber : ''} />}
      {type === 'flight' && <p className="form-note">This is a simple itinerary entry. Keep full flight dates, time zones, and arrival details in your notes or confirmation link.</p>}
    </>}
    {(type === 'stay' || isVenueType(type)) && <TextField label="Address (optional)" name="address" maxLength={200} defaultValue={item && 'address' in item ? item.address : ''} />}
    {type === 'stay' && <div className="form-grid">
      <TextField label="Check-in date" name="checkIn" type="date" required min={trip.startDate} max={trip.endDate} defaultValue={item?.type === 'stay' ? item.checkIn : trip.startDate} />
      <TextField label="Check-out date" name="checkOut" type="date" required min={trip.startDate} max={trip.endDate} defaultValue={item?.type === 'stay' ? item.checkOut : trip.endDate} />
    </div>}
    <TextField label={type === 'flight' || type === 'transport' ? 'Departure local time (optional)' : 'Local time (optional)'} hint="Recorded as entered; no time-zone conversion." name="time" type="time" defaultValue={item?.time} />
    <Field label="Notes (optional)"><textarea name="notes" rows={3} maxLength={2000} defaultValue={item?.notes} /></Field>
    <TextField label="Website or confirmation link (optional)" name="websiteUrl" type="url" placeholder="https://" maxLength={2000} defaultValue={item?.websiteUrl} />
    <fieldset className="booking-fields"><legend>Booking details</legend>
      <SelectField label="Booking status" name="bookingStatus" defaultValue={item?.booking.status ?? 'none'}>
        <option value="none">No booking</option><option value="planned">To book</option><option value="booked">Booked</option>
      </SelectField>
      <div className="form-grid">
        <TextField label="Provider (optional)" name="provider" maxLength={200} defaultValue={item?.booking.provider} />
        <TextField label="Reference (optional)" name="reference" maxLength={200} defaultValue={item?.booking.reference} />
      </div>
    </fieldset>
  </Form>
}

export function ProfileForm({ data, store }: { data: Library; store: LibraryStore }) {
  return <Form submitLabel="Save profile" onSave={form => {
    const profile = profileSchema.parse({ displayName: value(form, 'displayName'), appearance: value(form, 'appearance') })
    store.update(current => ({ ...current, profile }))
  }}>
    <TextField label="Display name" name="displayName" defaultValue={data.profile.displayName} autoComplete="given-name" maxLength={60} required />
    <SelectField label="Appearance" name="appearance" defaultValue={data.profile.appearance}>
      <option value="system">Follow device</option><option value="light">Light</option><option value="dark">Dark</option>
    </SelectField>
  </Form>
}

export function DownloadDraft({ data }: { data: Library }) {
  return <Button variant="secondary" onClick={() => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ schemaVersion: 1, revision: 0, data }, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'loom-draft.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }}>Download draft</Button>
}
