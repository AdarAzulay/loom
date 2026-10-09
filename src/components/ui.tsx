import { useEffect, useId, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { ArrowUpRight, X } from 'lucide-react'
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
  children: ReactNode; onSave: (data: FormData) => void | Promise<void>; submitLabel?: string; submitVariant?: 'primary' | 'danger'; onCancel?: () => void
}) {
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const alertRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => { if (error) alertRef.current?.focus() }, [error])
  return <form className="form" noValidate onSubmit={event => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    void Promise.resolve(onSave(new FormData(event.currentTarget))).then(() => setError('')).catch(failure => setError(errorMessage(failure))).finally(() => setSaving(false))
  }}>
    {error && <p className="error-box" role="alert" tabIndex={-1} ref={alertRef}>{error}</p>}
    {children}
    <div className="form-actions">
      {onCancel && <Button variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>}
      <Button type="submit" variant={submitVariant} disabled={saving}>{saving ? 'Saving…' : submitLabel}{!saving && submitVariant !== 'danger' && <ArrowUpRight size={16} />}</Button>
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
    <span className="empty-icon"><EmptyIllustration /></span>
    <h2>{title}</h2><p className="muted">{description}</p>{action}
  </div>
}

function EmptyIllustration() {
  return <svg className="empty-illustration" viewBox="0 0 80 62" aria-hidden="true"><path d="M7 48c13-14 20-12 31-24 10 9 17 12 35 2v22H7Z" fill="var(--cool)" opacity=".75" /><path d="M7 48c13-14 20-12 31-24 10 9 17 12 35 2M18 43l7-7 6 6m18-5 7-8 5 5" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><circle cx="61" cy="14" r="6" fill="var(--warm)" /><path d="M10 54h61" stroke="var(--ink)" strokeOpacity=".35" strokeWidth="1.5" strokeLinecap="round" /></svg>
}

export function PageHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>{children}</div>
}
