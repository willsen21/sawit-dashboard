import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutGrid, ClipboardList, Users, Wallet, ReceiptText, ShieldCheck, LogOut, CalendarDays, Sprout, Menu, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const ADMIN_LINKS = [
  { to: '/admin', label: 'Kas Hari Ini', icon: Wallet, end: true },
  { to: '/admin/catat-pembelian', label: 'Catat Pembelian', icon: ReceiptText },
  { to: '/admin/pembelian-hari-ini', label: 'Pembelian Hari Ini', icon: ClipboardList },
]

const OWNER_LINKS = [
  { to: '/owner', label: 'Ringkasan', icon: LayoutGrid, end: true },
  { to: '/owner/laporan', label: 'Laporan', icon: ClipboardList },
  { to: '/owner/operasional', label: 'Operasional Kebun', icon: CalendarDays },
  { to: '/owner/kebun-pribadi', label: 'Kebun Pribadi', icon: Sprout },
  { to: '/owner/kontrol-transaksi', label: 'Kontrol Transaksi', icon: ShieldCheck },
  { to: '/owner/admin', label: 'Kelola Admin', icon: Users },
]

export default function MobileNav({ role }) {
  const { currentUser, logout } = useAuth()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const links = role === 'owner' ? OWNER_LINKS : ADMIN_LINKS
  const activeLabel = links.find(({ to, end }) => end ? location.pathname === to : location.pathname.startsWith(to))?.label || 'Kebun Kas'

  return <>
    <header className="mobile-header lg:hidden">
      <div className="min-w-0"><p className="font-display text-lg leading-tight text-paper-50">Kebun Kas</p><p className="truncate text-xs text-paper-100/65">{activeLabel}</p></div>
      <button type="button" className="mobile-menu-button" onClick={() => setOpen(true)} aria-label="Buka menu" aria-expanded={open}><Menu size={21} /></button>
    </header>
    {open && <div className="mobile-drawer-layer lg:hidden" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false) }}>
      <nav className="mobile-drawer" aria-label="Navigasi utama">
        <div className="flex items-center justify-between border-b border-paper-50/10 px-5 py-4"><div><p className="font-display text-lg text-paper-50">Kebun Kas</p><p className="mt-1 text-xs capitalize text-paper-100/60">{currentUser?.name} · {role}</p></div><button type="button" className="mobile-menu-button" onClick={() => setOpen(false)} aria-label="Tutup menu"><X size={20} /></button></div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">{links.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${isActive ? 'bg-gold-500/15 font-medium text-gold-300' : 'text-paper-100/75 hover:bg-paper-50/5 hover:text-paper-50'}`}><Icon size={18} />{label}</NavLink>)}</div>
        <div className="mt-auto border-t border-paper-50/10 p-3"><button type="button" onClick={logout} className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-sm text-paper-100/75 transition-colors hover:bg-paper-50/5 hover:text-paper-50"><LogOut size={18} />Keluar</button></div>
      </nav>
    </div>}
  </>
}
