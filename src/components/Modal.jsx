import React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function Modal({ open, onClose, title, children }) {
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center px-3 py-3 sm:items-center sm:px-4">
      <div className="modal-backdrop absolute inset-0 bg-plantation-950/50" onClick={onClose} />
      <div className="modal-panel relative w-full max-w-md rounded-2xl bg-paper-50 shadow-soft border border-ink-900/10 p-6 md:p-7">
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
