import React from 'react'
import { UsersRound } from 'lucide-react'

export default function FarmShareFields({ count, names = [], onCountChange, onNameChange }) {
  const recipientCount = Number(count) || 0

  return <section className="rounded-xl border border-ink-900/10 p-4">
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-end">
      <div>
        <h3 className="flex items-center gap-2 font-semibold text-ink-800"><UsersRound size={17} className="text-plantation-700" /> Pembagian hasil</h3>
        <p className="mt-1 text-xs text-ink-500">Hasil akhir dibagi sama rata. Selisih pembulatan rupiah diberikan ke penerima pertama.</p>
      </div>
      <label className="block"><span className="label">Bagikan kepada</span><select className="input" value={recipientCount} onChange={(event) => onCountChange(Number(event.target.value))}><option value={0}>Tidak dibagi</option><option value={2}>2 orang</option><option value={3}>3 orang</option></select></label>
    </div>
    {recipientCount > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">{Array.from({ length: recipientCount }, (_, index) => <label className="block" key={index}><span className="label">Nama penerima {index + 1} *</span><input required className="input" value={names[index] || ''} onChange={(event) => onNameChange(index, event.target.value)} placeholder={`Nama orang ke-${index + 1}`} /></label>)}</div>}
  </section>
}
