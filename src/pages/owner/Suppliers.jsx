import React, { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useData } from '../../context/DataContext'
import { formatRupiah } from '../../lib/dateUtils'

export default function Suppliers() {
  const { suppliers, addSupplier, removeSupplier, transactions } = useData()
  const [form, setForm] = useState({ name: '', contact: '', kebun: '' })

  function handleAdd(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    addSupplier(form)
    setForm({ name: '', contact: '', kebun: '' })
  }

  function totalFor(supplierId) {
    return transactions.filter((t) => t.supplierId === supplierId).reduce((s, t) => s + t.total, 0)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-10">
      <h1 className="text-2xl font-display mb-1">Pemasok</h1>
      <p className="text-sm text-ink-500 mb-6">Kelola daftar pemilik kebun yang menjual buah ke pabrik.</p>

      <form onSubmit={handleAdd} className="card p-5 mb-6 grid sm:grid-cols-4 gap-3 items-end">
        <div className="sm:col-span-2">
          <label className="label">Nama pemasok</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="mis. Pak Slamet"
          />
        </div>
        <div>
          <label className="label">Blok / kebun</label>
          <input
            className="input"
            value={form.kebun}
            onChange={(e) => setForm({ ...form, kebun: e.target.value })}
            placeholder="mis. Blok Utara"
          />
        </div>
        <div>
          <label className="label">Kontak</label>
          <input
            className="input"
            value={form.contact}
            onChange={(e) => setForm({ ...form, contact: e.target.value })}
            placeholder="0812..."
          />
        </div>
        <button type="submit" className="btn-primary sm:col-span-4 sm:w-fit">
          <Plus size={16} /> Tambah pemasok
        </button>
      </form>

      <div className="card overflow-hidden table-scroll">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-head">Nama</th>
              <th className="table-head">Blok / kebun</th>
              <th className="table-head">Kontak</th>
              <th className="table-head">Total transaksi</th>
              <th className="table-head"></th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id}>
                <td className="table-cell font-medium">{s.name}</td>
                <td className="table-cell">{s.kebun || '—'}</td>
                <td className="table-cell">{s.contact || '—'}</td>
                <td className="table-cell">{formatRupiah(totalFor(s.id))}</td>
                <td className="table-cell">
                  <button onClick={() => removeSupplier(s.id)} className="text-ink-500 hover:text-red-700">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
