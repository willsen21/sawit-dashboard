import React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children }) {
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[60] overflow-y-auto px-3 pt-4 pb-3 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="modal-backdrop fixed inset-0 bg-plantation-950/50" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className="modal-panel relative my-0 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-ink-900/10 bg-paper-50 p-5 shadow-soft sm:my-auto md:p-7">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-display text-plantation-950">{title}</h3>
          <button onClick={onClose} className="text-ink-500 hover:text-ink-900 -mt-1 -mr-1 p-1">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  )
}
