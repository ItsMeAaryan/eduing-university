'use client'

// EDUING doesn't store image files. Universities paste a link to an image that is
// already online (their own website, Google Drive "anyone with the link", etc.).
import React, { useState } from 'react'
import { Link2, X } from 'lucide-react'

export function isImageLink(value: string) {
  try {
    const u = new URL(value.trim())
    return u.protocol === 'https:'
  } catch {
    return false
  }
}

export default function ImageLinkDialog({
  open, title, initial = '', onClose, onSave,
}: {
  open: boolean
  title: string
  initial?: string
  onClose: () => void
  onSave: (url: string) => void | Promise<void>
}) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  if (!open) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isImageLink(value)) { setError('Paste a full link that starts with https://'); return }
    setSaving(true)
    try { await onSave(value.trim()); onClose() } finally { setSaving(false) }
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-brand-border bg-brand-surface p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-text-primary">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1.5 text-text-muted hover:bg-white/5"><X size={16} /></button>
        </div>
        <label className="mb-1.5 block text-xs font-semibold text-text-secondary" htmlFor="image-link">Image link</label>
        <div className="flex items-center gap-2 rounded-2xl border border-brand-border px-3">
          <Link2 size={15} className="text-text-muted" />
          <input id="image-link" autoFocus value={value} onChange={(e) => { setValue(e.target.value); setError('') }}
            placeholder="https://youruniversity.ac.in/logo.png" className="h-11 w-full bg-transparent text-sm text-text-primary outline-none" />
        </div>
        <p className="mt-2 text-xs text-text-muted">Use an image that is already on your website. Right-click it and choose &ldquo;Copy image address&rdquo;.</p>
        {value && isImageLink(value) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="Preview" className="mt-4 max-h-40 w-full rounded-2xl border border-brand-border object-contain" />
        )}
        {error && <p role="alert" className="mt-2 text-xs font-medium text-brand-error">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Use this image'}</button>
        </div>
      </form>
    </div>
  )
}
