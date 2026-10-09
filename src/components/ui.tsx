import { useEffect, useId, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { ArrowUpRight, Compass, X } from 'lucide-react'
import { errorMessage } from '../models/domain'

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' | 'danger' }) {
  return <button type="button" className={`button ${variant} ${className}`} {...props} />
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}

export function TextField({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return <Field label={label} hint={hint}><input {...props} /></Field>
}

export function SelectField({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return <Field label={label}><select {...props}>{children}</select></Field>
}

export const value = (data: FormData, name: string) => String(data.get(name) ?? '').trim()

export function Form({ children, onSave, submitLabel = 'Save', submitVariant = 'primary', onCancel }: {
  children: ReactNode; onSave: (data: FormData) => void; submitLabel?: string; submitVariant?: 'primary' | 'danger'; onCancel?: () => void
}) {
  const [error, setError] = useState('')
  const alertRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => { if (error) alertRef.current?.focus() }, [error])
  return <form className="form" noValidate onSubmit={event => {
    event.preventDefault()
    try { onSave(new FormData(event.currentTarget)); setError('') }
    catch (failure) { setError(errorMessage(failure)) }
  }}>
    {error && <p className="error-box" role="alert" tabIndex={-1} ref={alertRef}>{error}</p>}
    {children}
    <div className="form-actions">
      {onCancel && <Button variant="secondary" onClick={onCancel}>Cancel</Button>}
      <Button type="submit" variant={submitVariant}>{submitLabel}{submitVariant !== 'danger' && <ArrowUpRight size={16} />}</Button>
    </div>
  </form>
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return <dialog ref={ref} className="modal" aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="section-heading"><h2 id={titleId}>{title}</h2><Button variant="quiet" aria-label="Close dialog" onClick={onClose}><X size={20} /></Button></div>
    {children}
  </dialog>
}

export function EmptyState({ title, description, action, spacious = false }: { title: string; description: string; action?: ReactNode; spacious?: boolean }) {
  return <div className={`glass empty-state ${spacious ? 'spacious' : ''}`}>
    <span className="empty-icon"><Compass size={28} strokeWidth={1.25} /></span>
    <h2>{title}</h2><p className="muted">{description}</p>{action}
  </div>
}

export function PageHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>{children}</div>
}
