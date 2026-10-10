import React from 'react'
import { Check, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { formatRupiah, formatShortDate } from '../../lib/dateUtils'

export default function TransactionControls() {
  const { currentUser, admins } = useAuth()
  const {
    transactions,
    supplierMap,
    cancellationRequests,
    resolveCancellation,
    cashLoans,
    cashUnlockRequests,
    resolveCashUnlock,
  } = useData()
  const names = Object.fromEntries([...admins, currentUser].filter(Boolean).map((user) => [user.id, user.name]))
  const pending = cancellationRequests.filter((request) => request.status === 'pending')
  const pendingLoanDeletions = pending.filter((request) => request.kind === 'cashLoanDeletion')
  const pendingTransactionCancellations = pending.filter((request) => request.kind !== 'cashLoanDeletion')
  const pendingUnlocks = cashUnlockRequests.filter((request) => request.status === 'pending')

  return <div className="max-w-5xl mx-auto px-4 py-6 md:px-8 md:py-10">
    <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-600">Kontrol owner</p><h1 className="mt-1 text-2xl font-display">Persetujuan transaksi</h1><p className="mt-1 text-sm text-ink-500">Tinjau permintaan penghapusan pinjaman, pembatalan transaksi, dan buka kas.</p></div>

    <section className="card mb-6 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-ink-900/10 px-5 py-4"><ShieldCheck size={18} className="text-plantation-700" /><h2 className="font-medium text-ink-700">Permintaan penghapusan pinjaman ({pendingLoanDeletions.length})</h2></div>
      {pendingLoanDeletions.length === 0 ? <p className="px-5 py-7 text-center text-sm text-ink-500">Tidak ada permintaan penghapusan pinjaman yang menunggu.</p> : <div className="divide-y divide-ink-900/10">{pendingLoanDeletions.map((request) => {
        const loan = cashLoans.find((item) => item.id === request.cashLoanId)
        return <div key={request.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="min-w-0"><p className="font-medium text-ink-800">{loan?.name || 'Pinjaman tidak ditemukan'} <span className="font-normal text-ink-500">— {loan ? `${formatShortDate(loan.date)} · ${formatRupiah(loan.amount)}` : ''}</span></p><p className="mt-1 text-sm text-ink-600">Alasan penghapusan: {request.reason}</p><p className="mt-1 text-xs text-ink-500">Diajukan oleh {names[request.requestedBy] || request.requestedBy} · {new Date(request.createdAt).toLocaleString('id-ID')}</p></div>
          <div className="flex gap-2"><button type="button" onClick={() => resolveCancellation(request.id, 'rejected', currentUser.id)} className="btn-ghost !px-3 !py-2 text-xs"><X size={15} /> Tolak</button><button type="button" onClick={() => resolveCancellation(request.id, 'approved', currentUser.id)} className="btn-danger !px-3 !py-2 text-xs"><Check size={15} /> Setujui hapus</button></div>
        </div>
      })}</div>}
    </section>

    <section className="card mb-6 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-ink-900/10 px-5 py-4"><ShieldCheck size={18} className="text-plantation-700" /><h2 className="font-medium text-ink-700">Permintaan buka kas ({pendingUnlocks.length})</h2></div>
      {pendingUnlocks.length === 0 ? <p className="px-5 py-7 text-center text-sm text-ink-500">Tidak ada permintaan buka kas yang menunggu.</p> : <div className="divide-y divide-ink-900/10">{pendingUnlocks.map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"><div><p className="font-medium text-ink-800">Buka kas {formatShortDate(request.date)}</p><p className="mt-1 text-sm text-ink-600">Alasan: {request.reason}</p><p className="mt-1 text-xs text-ink-500">Diajukan oleh {names[request.requestedBy] || request.requestedBy} · {new Date(request.createdAt).toLocaleString('id-ID')}</p></div><div className="flex gap-2"><button type="button" onClick={() => resolveCashUnlock(request.id, 'rejected', currentUser.id)} className="btn-ghost !px-3 !py-2 text-xs"><X size={15} /> Tolak</button><button type="button" onClick={() => resolveCashUnlock(request.id, 'approved', currentUser.id)} className="btn-primary !px-3 !py-2 text-xs"><Check size={15} /> Setujui buka kas</button></div></div>)}</div>}
    </section>

    <section className="card mb-6 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-ink-900/10 px-5 py-4"><ShieldCheck size={18} className="text-plantation-700" /><h2 className="font-medium text-ink-700">Pembatalan transaksi ({pendingTransactionCancellations.length})</h2></div>
      {pendingTransactionCancellations.length === 0 ? <p className="px-5 py-7 text-center text-sm text-ink-500">Tidak ada permintaan pembatalan transaksi yang menunggu.</p> : <div className="divide-y divide-ink-900/10">{pendingTransactionCancellations.map((request) => {
        const transaction = transactions.find((item) => item.id === request.transactionId)
        return <div key={request.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"><div><p className="font-medium text-ink-800">{transaction?.name || supplierMap[transaction?.supplierId]?.name || 'Transaksi tidak ditemukan'} <span className="font-normal text-ink-500">— {transaction ? `${Number(transaction.grossKg ?? transaction.weightKg ?? 0).toLocaleString('id-ID')} kg kotor · ${Number(transaction.netKg ?? transaction.weightKg ?? 0).toLocaleString('id-ID')} kg bersih · ${formatRupiah(transaction.total)}` : ''}</span></p><p className="mt-1 text-sm text-ink-600">Alasan: {request.reason}</p><p className="mt-1 text-xs text-ink-500">Diajukan oleh {names[request.requestedBy] || request.requestedBy} · {new Date(request.createdAt).toLocaleString('id-ID')}</p></div><div className="flex gap-2"><button type="button" onClick={() => resolveCancellation(request.id, 'rejected', currentUser.id)} className="btn-ghost !px-3 !py-2 text-xs"><X size={15} /> Tolak</button><button type="button" onClick={() => resolveCancellation(request.id, 'approved', currentUser.id)} className="btn-danger !px-3 !py-2 text-xs"><Check size={15} /> Setujui batal</button></div></div>
      })}</div>}
    </section>
  </div>
}
