import React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children }) {
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-3 py-3 sm:px-4">
      <div className="modal-backdrop fixed inset-0 bg-plantation-950/50" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className="modal-panel relative my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border border-ink-900/10 bg-paper-50 p-6 shadow-soft md:p-7">
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
