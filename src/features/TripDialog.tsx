import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button, Form, Modal } from '../components/ui'
import type { Library, Trip } from '../models/domain'
import type { LibraryStore } from '../app/libraryStore'
import { TripForm } from './forms'

export function TripDialog({ data, trip, store, onClose, onDelete }: {
  data: Library; trip?: Trip; store: LibraryStore; onClose: () => void; onDelete: (id: string) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const dayCount = data.days.filter(day => day.tripId === trip?.id).length
  const itemCount = data.items.filter(item => item.tripId === trip?.id).length
  return <>
    <Modal title={trip ? 'Edit trip' : 'A new adventure.'} onClose={onClose}>
      <TripForm store={store} trip={trip} onDone={onClose} />
      {trip && <div className="danger-zone"><Button variant="danger" onClick={() => setConfirming(true)}><Trash2 size={16} />Delete trip</Button></div>}
    </Modal>
    {trip && confirming && <Modal title="Delete this trip?" onClose={() => setConfirming(false)}>
      <Form submitLabel="Delete trip permanently" submitVariant="danger" onCancel={() => setConfirming(false)} onSave={() => onDelete(trip.id)}>
        <p>Delete <strong>{trip.name}</strong> and all its plans?</p>
        <p className="muted">This removes {dayCount} {dayCount === 1 ? 'day' : 'days'} and {itemCount} {itemCount === 1 ? 'item' : 'items'}, including any bookings and unscheduled items. This cannot be undone.</p>
        <p className="form-note">Your other trips and profile will stay intact.</p>
      </Form>
    </Modal>}
  </>
}
