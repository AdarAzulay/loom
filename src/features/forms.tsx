import { Button, Field, Form, SelectField, TextField, value } from '../components/ui'
import { createDay, createItem, isVenueType, itemSchema, profileSchema, saveItem, saveTrip, tripDays, updateDay } from '../models/domain'
import type { Day, Item, ItemType, Library, Trip } from '../models/domain'
import { formatDate } from '../models/dates'
import { itemConfig } from '../models/itemTypes'
import type { LibraryStore } from '../app/libraryStore'
import { preparePhotoRecords } from '../services/photos'
import { createBackup, parseBackup } from '../services/backup'

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
      const input = { id: day?.id ?? crypto.randomUUID(), tripId: trip.id, date: value(form, 'date'), city: value(form, 'city'), title: value(form, 'title'), notes: value(form, 'notes'), country: value(form, 'country'), timeZone: value(form, 'timeZone'), currency: value(form, 'currency') as '' | 'KRW' | 'JPY' }
      const result = day ? { data: updateDay(data, input), day: input } : createDay(data, input)
      savedDay = result.day
      return result.data
    })
    if (savedDay) onSaved(savedDay)
  }}>
    <TextField label="Date" name="date" type="date" min={trip.startDate} max={trip.endDate} defaultValue={day?.date ?? trip.startDate} required />
    <TextField label="City" name="city" placeholder="City or travel route" maxLength={100} defaultValue={day?.city} required />
    <div className="form-grid"><TextField label="Country (optional)" name="country" maxLength={200} defaultValue={day?.country} /><TextField label="IANA time zone (optional)" name="timeZone" placeholder="Asia/Seoul" maxLength={100} defaultValue={day?.timeZone} /></div>
    <SelectField label="Currency label" name="currency" defaultValue={day?.currency ?? ''}><option value="">Not set</option><option value="KRW">KRW · Korean won</option><option value="JPY">JPY · Japanese yen</option></SelectField>
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
  return <Form onCancel={onDone} submitLabel={item ? 'Save changes' : 'Add item'} onSave={async form => {
    const placeName = value(form, 'placeName')
    const placeAddress = value(form, 'placeAddress')
    const placeCountry = value(form, 'placeCountry')
    const latitudeValue = value(form, 'latitude')
    const longitudeValue = value(form, 'longitude')
    const hasPlace = [placeName, placeAddress, placeCountry, latitudeValue, longitudeValue].some(Boolean)
    if (hasPlace && (!placeName || !placeAddress || !placeCountry || !latitudeValue || !longitudeValue || !Number.isFinite(Number(latitudeValue)) || !Number.isFinite(Number(longitudeValue)))) {
      throw new Error('Complete the place name, address, country, latitude, and longitude together.')
    }
    const place = hasPlace ? {
      name: placeName, address: placeAddress, country: placeCountry,
      latitude: Number(latitudeValue), longitude: Number(longitudeValue),
    } : null
    const base = {
      id: item?.id ?? crypto.randomUUID(), tripId: trip.id,
      dayId: value(form, 'dayId') || null, title: value(form, 'title'), time: value(form, 'time'),
      websiteUrl: value(form, 'websiteUrl'), notes: value(form, 'notes'),
      instagramUrl: value(form, 'instagramUrl'), place, photoIds: item?.photoIds ?? [],
      status: (value(form, 'status') || item?.status || 'planned') as 'planned' | 'booked' | 'done', order: item?.order ?? 0,
      price: value(form, 'priceAmount') ? { amount: Number(value(form, 'priceAmount')), currency: value(form, 'priceCurrency') } : null,
      booking: { status: value(form, 'bookingStatus') as Item['booking']['status'], provider: value(form, 'provider'), reference: value(form, 'reference') },
    }
    let next = {} as Record<string, unknown>
    if (type === 'flight') next = { ...base, type, departure: value(form, 'departure'), arrival: value(form, 'arrival'), flightNumber: value(form, 'flightNumber'), airline: value(form, 'airline'), departureCode: value(form, 'departureCode'), arrivalCode: value(form, 'arrivalCode'), departureDate: value(form, 'departureDate') || null, arrivalDate: value(form, 'arrivalDate') || null, arrivalTime: value(form, 'arrivalTime'), departureTimeZone: value(form, 'departureTimeZone'), arrivalTimeZone: value(form, 'arrivalTimeZone'), terminal: value(form, 'terminal'), gate: value(form, 'gate'), seat: value(form, 'seat'), cabin: value(form, 'cabin'), baggage: value(form, 'baggage'), bookingReference: value(form, 'bookingReference'), ticketNumber: value(form, 'ticketNumber'), passengers: value(form, 'passengers').split(',').map(passenger => passenger.trim()).filter(Boolean), manageBookingUrl: value(form, 'manageBookingUrl') }
    else if (type === 'transport') next = { ...base, type, departure: value(form, 'departure'), arrival: value(form, 'arrival') }
    else if (type === 'stay') next = { ...base, type, address: value(form, 'address'), checkIn: value(form, 'checkIn'), checkOut: value(form, 'checkOut'), lodgingKind: value(form, 'lodgingKind') || 'hotel', checkInTime: value(form, 'checkInTime'), checkOutTime: value(form, 'checkOutTime'), roomType: value(form, 'roomType'), phone: value(form, 'phone'), amenities: value(form, 'amenities').split(',').map(amenity => amenity.trim()).filter(Boolean), cancellationNotes: value(form, 'cancellationNotes') }
    else if (type === 'train') next = { ...base, type, operator: value(form, 'operator'), trainNumber: value(form, 'trainNumber'), departure: value(form, 'departure'), arrival: value(form, 'arrival'), departureTime: value(form, 'departureTime'), arrivalTime: value(form, 'arrivalTime'), car: value(form, 'car'), seat: value(form, 'seat'), reservationNumber: value(form, 'reservationNumber'), passUsed: value(form, 'passUsed') }
    else if (type === 'carTaxi') next = { ...base, type, provider: value(form, 'rideProvider'), pickup: value(form, 'pickup'), dropoff: value(form, 'dropoff'), pickupTime: value(form, 'pickupTime'), dropoffTime: value(form, 'dropoffTime'), confirmation: value(form, 'confirmation') }
    else if (type === 'ticketPass') next = { ...base, type, ticketKind: value(form, 'ticketKind'), validFrom: value(form, 'validFrom') || null, validUntil: value(form, 'validUntil') || null }
    else if (type === 'document') next = { ...base, type, documentKind: value(form, 'documentKind'), documentUrl: value(form, 'documentUrl') }
    else if (isVenueType(type)) next = { ...base, type, address: value(form, 'address') }
    else next = { ...base, type: 'note' }
    const files = form.getAll('photos').filter(entry => typeof File !== 'undefined' && entry instanceof File && entry.size > 0) as File[]
    const photos = await preparePhotoRecords(String(next.id), files)
    const parsedNext = itemSchema.parse({ ...next, photoIds: [...((next.photoIds as string[] | undefined) ?? []), ...photos.map(photo => photo.id)] })
    let savedItem: Item = parsedNext
    store.update(current => {
      if (item) return saveItem(current, parsedNext)
      const result = createItem(current, parsedNext)
      savedItem = result.item
      return result.data
    }, photos)
    onSaved(savedItem)
  }}>
    <TextField label={config.titleLabel} name="title" defaultValue={item?.title} maxLength={100} required autoFocus />
    <SelectField label="Day" name="dayId" defaultValue={item?.dayId ?? dayId ?? ''}>
      <option value="">Unscheduled · save for later</option>
      {days.map(day => <option key={day.id} value={day.id}>{formatDate(day.date)} · {day.city}</option>)}
    </SelectField>
    <div className="form-grid"><SelectField label="Status" name="status" defaultValue={item?.status ?? 'planned'}><option value="planned">Planned</option><option value="booked">Booked</option><option value="done">Done</option></SelectField><TextField label="Price amount (optional)" name="priceAmount" type="number" min="0" step="0.01" defaultValue={item?.price?.amount} /><TextField label="Price currency" name="priceCurrency" placeholder="KRW / JPY" maxLength={12} defaultValue={item?.price?.currency} /></div>
    {(type === 'flight' || type === 'transport' || type === 'train') && <>
      <div className="form-grid">
        <TextField label={type === 'flight' ? 'Departure airport' : 'From'} name="departure" required maxLength={100} defaultValue={item && 'departure' in item ? item.departure : ''} />
        <TextField label={type === 'flight' ? 'Arrival airport' : 'To'} name="arrival" required maxLength={100} defaultValue={item && 'arrival' in item ? item.arrival : ''} />
      </div>
      {type === 'flight' && <TextField label="Flight number (optional)" name="flightNumber" maxLength={200} defaultValue={item?.type === 'flight' ? item.flightNumber : ''} />}
      {type === 'flight' && <><div className="form-grid"><TextField label="Airline (text)" name="airline" defaultValue={item?.type === 'flight' ? item.airline : ''} /><TextField label="Booking reference" name="bookingReference" defaultValue={item?.type === 'flight' ? item.bookingReference : ''} /></div><div className="form-grid"><TextField label="Departure airport code" name="departureCode" placeholder="ICN" defaultValue={item?.type === 'flight' ? item.departureCode : ''} /><TextField label="Arrival airport code" name="arrivalCode" placeholder="NRT" defaultValue={item?.type === 'flight' ? item.arrivalCode : ''} /></div><div className="form-grid"><TextField label="Departure date" name="departureDate" type="date" defaultValue={item?.type === 'flight' ? item.departureDate ?? '' : ''} /><TextField label="Arrival date" name="arrivalDate" type="date" defaultValue={item?.type === 'flight' ? item.arrivalDate ?? '' : ''} /></div><div className="form-grid"><TextField label="Arrival local time" name="arrivalTime" type="time" defaultValue={item?.type === 'flight' ? item.arrivalTime : ''} /><TextField label="Departure time zone" name="departureTimeZone" placeholder="Asia/Seoul" defaultValue={item?.type === 'flight' ? item.departureTimeZone : ''} /></div><div className="form-grid"><TextField label="Arrival time zone" name="arrivalTimeZone" placeholder="Asia/Tokyo" defaultValue={item?.type === 'flight' ? item.arrivalTimeZone : ''} /><TextField label="Terminal / gate" name="terminal" defaultValue={item?.type === 'flight' ? item.terminal : ''} /></div><div className="form-grid"><TextField label="Seat / cabin" name="seat" defaultValue={item?.type === 'flight' ? item.seat : ''} /><TextField label="Baggage" name="baggage" defaultValue={item?.type === 'flight' ? item.baggage : ''} /></div><TextField label="Manage booking link" name="manageBookingUrl" type="url" defaultValue={item?.type === 'flight' ? item.manageBookingUrl : ''} /></>}
      {type === 'train' && <div className="form-grid"><TextField label="Operator" name="operator" defaultValue={item?.type === 'train' ? item.operator : ''} /><TextField label="Train number" name="trainNumber" defaultValue={item?.type === 'train' ? item.trainNumber : ''} /></div>}
      {type === 'train' && <div className="form-grid"><TextField label="Departure time" name="departureTime" type="time" defaultValue={item?.type === 'train' ? item.departureTime : ''} /><TextField label="Arrival time" name="arrivalTime" type="time" defaultValue={item?.type === 'train' ? item.arrivalTime : ''} /></div>}
      {type === 'flight' && <p className="form-note">This is a simple itinerary entry. Keep full flight dates, time zones, and arrival details in your notes or confirmation link.</p>}
    </>}
    {(type === 'stay' || isVenueType(type)) && <TextField label="Address (optional)" name="address" maxLength={200} defaultValue={item && 'address' in item ? item.address : ''} />}
    {type === 'stay' && <div className="form-grid">
      <TextField label="Check-in date" name="checkIn" type="date" required min={trip.startDate} max={trip.endDate} defaultValue={item?.type === 'stay' ? item.checkIn : trip.startDate} />
      <TextField label="Check-out date" name="checkOut" type="date" required min={trip.startDate} max={trip.endDate} defaultValue={item?.type === 'stay' ? item.checkOut : trip.endDate} />
    </div>}
    {type === 'stay' && <><div className="form-grid"><SelectField label="Lodging kind" name="lodgingKind" defaultValue={item?.type === 'stay' ? item.lodgingKind : 'hotel'}><option value="hotel">Hotel</option><option value="hostel">Hostel</option><option value="ryokan">Ryokan</option><option value="apartment">Apartment</option><option value="other">Other</option></SelectField><TextField label="Room type" name="roomType" defaultValue={item?.type === 'stay' ? item.roomType : ''} /></div><div className="form-grid"><TextField label="Check-in time" name="checkInTime" type="time" defaultValue={item?.type === 'stay' ? item.checkInTime : ''} /><TextField label="Check-out time" name="checkOutTime" type="time" defaultValue={item?.type === 'stay' ? item.checkOutTime : ''} /></div><div className="form-grid"><TextField label="Phone" name="phone" defaultValue={item?.type === 'stay' ? item.phone : ''} /><TextField label="Amenities (comma separated)" name="amenities" placeholder="Wi-Fi, breakfast, onsen" defaultValue={item?.type === 'stay' ? item.amenities.join(', ') : ''} /></div><Field label="Cancellation notes"><textarea name="cancellationNotes" rows={2} defaultValue={item?.type === 'stay' ? item.cancellationNotes : ''} /></Field></>}
    {type === 'carTaxi' && <><div className="form-grid"><TextField label="Provider" name="rideProvider" defaultValue={item?.type === 'carTaxi' ? item.provider : ''} /><TextField label="Confirmation" name="confirmation" defaultValue={item?.type === 'carTaxi' ? item.confirmation : ''} /></div><div className="form-grid"><TextField label="Pickup" name="pickup" defaultValue={item?.type === 'carTaxi' ? item.pickup : ''} /><TextField label="Drop-off" name="dropoff" defaultValue={item?.type === 'carTaxi' ? item.dropoff : ''} /></div></>}
    {type === 'ticketPass' && <><TextField label="Ticket or pass type" name="ticketKind" defaultValue={item?.type === 'ticketPass' ? item.ticketKind : ''} /><div className="form-grid"><TextField label="Valid from" name="validFrom" type="date" defaultValue={item?.type === 'ticketPass' ? item.validFrom ?? '' : ''} /><TextField label="Valid until" name="validUntil" type="date" defaultValue={item?.type === 'ticketPass' ? item.validUntil ?? '' : ''} /></div></>}
    {type === 'document' && <><TextField label="Document type" name="documentKind" defaultValue={item?.type === 'document' ? item.documentKind : ''} /><TextField label="Document link" name="documentUrl" type="url" defaultValue={item?.type === 'document' ? item.documentUrl : ''} /></>}
    <TextField label={type === 'flight' || type === 'transport' ? 'Departure local time (optional)' : 'Local time (optional)'} hint="Recorded as entered; no time-zone conversion." name="time" type="time" defaultValue={item?.time} />
    <Field label="Notes (optional)"><textarea name="notes" rows={3} maxLength={2000} defaultValue={item?.notes} /></Field>
    <TextField label="Website or confirmation link (optional)" name="websiteUrl" type="url" placeholder="https://" maxLength={2000} defaultValue={item?.websiteUrl} />
    <TextField label="Instagram link (optional)" name="instagramUrl" type="url" placeholder="https://www.instagram.com/…" maxLength={2000} defaultValue={item?.instagramUrl} />
    <fieldset className="booking-fields"><legend>Map place (optional)</legend>
      <TextField label="Place name" name="placeName" maxLength={200} defaultValue={item?.place?.name} />
      <TextField label="Place address" name="placeAddress" maxLength={200} defaultValue={item?.place?.address} />
      <div className="form-grid">
        <TextField label="Latitude" name="latitude" type="number" step="any" min="-90" max="90" defaultValue={item?.place?.latitude} />
        <TextField label="Longitude" name="longitude" type="number" step="any" min="-180" max="180" defaultValue={item?.place?.longitude} />
      </div>
      <TextField label="Country" name="placeCountry" placeholder="South Korea or Japan" maxLength={200} defaultValue={item?.place?.country} />
      <p className="form-note">Coordinates are saved for the map step. Google/Naver buttons and place search come later.</p>
    </fieldset>
    <Field label="Photos (optional)" hint="Images are resized to about 1200px and stored locally as blobs, outside the library JSON."><input name="photos" type="file" accept="image/*" multiple /></Field>
    {item?.photoIds.length ? <p className="form-note">This item already has {item.photoIds.length} saved photo{item.photoIds.length === 1 ? '' : 's'}. New uploads will be added.</p> : null}
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
  return <Form submitLabel="Save profile" onSave={async form => {
    const files = form.getAll('avatar').filter(entry => typeof File !== 'undefined' && entry instanceof File && entry.size > 0) as File[]
    const photos = await preparePhotoRecords(data.profile.id, files.slice(0, 1), 512)
    const remove = form.get('removeAvatar') === 'on'
    const avatarId = remove ? null : photos[0]?.id ?? data.profile.avatarId
    const profile = profileSchema.parse({ ...data.profile, displayName: value(form, 'displayName'), appearance: value(form, 'appearance'), glassLevel: value(form, 'glassLevel'), palette: value(form, 'palette'), avatarId })
    store.update(current => ({ ...current, profile }), photos)
  }}>
    <TextField label="Display name" name="displayName" defaultValue={data.profile.displayName} autoComplete="given-name" maxLength={60} required />
    <Field label="Avatar (optional)" hint="Square images are resized to about 512px and kept on this device."><input name="avatar" type="file" accept="image/*" /></Field>
    {data.profile.avatarId && <label className="check-field"><input name="removeAvatar" type="checkbox" /> Remove current avatar</label>}
    <SelectField label="Appearance" name="appearance" defaultValue={data.profile.appearance}>
      <option value="system">Follow device</option><option value="light">Light</option><option value="dark">Dark</option>
    </SelectField>
    <SelectField label="Glass level" name="glassLevel" defaultValue={data.profile.glassLevel}><option value="clear">Clear</option><option value="soft">Soft</option><option value="solid">Solid</option></SelectField>
    <SelectField label="Palette" name="palette" defaultValue={data.profile.palette}><option value="sky">Sky</option><option value="blush">Blush</option><option value="sand">Sand</option></SelectField>
  </Form>
}

export function DownloadDraft({ data, store }: { data: Library; store?: LibraryStore }) {
  return <span><Button variant="secondary" onClick={async () => {
    const photos = store ? await store.loadAllPhotos() : []
    const url = URL.createObjectURL(new Blob([await createBackup(data, photos)], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'loom-backup.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
    store?.update(current => ({ ...current, profile: { ...current.profile, lastBackupAt: new Date().toISOString() } }))
  }}>Download backup</Button><small className="form-note">Includes your library and saved photos.</small></span>
}

export function RestoreBackup({ store }: { store: LibraryStore }) {
  return <Field label="Restore backup" hint="Choose a Loom backup JSON. It replaces the current local library after validation."><input type="file" accept="application/json,.json" onChange={async event => {
    const file = event.currentTarget.files?.[0]; if (!file) return
    try {
      const { data, photos } = parseBackup(await file.text())
      if (!window.confirm('Replace the current Loom library with this backup?')) return
      store.replace(data, photos)
    } catch (error) { window.alert(error instanceof Error ? error.message : 'This backup could not be restored.') }
    event.currentTarget.value = ''
  }} /></Field>
}
