import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutGrid, ClipboardList, Users, LogOut, Wallet, PanelLeftClose, PanelLeftOpen, ReceiptText, ShieldCheck, CalendarDays, Sprout } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const ADMIN_LINKS = [
  { to: '/admin', label: 'Kas Hari Ini', icon: Wallet, end: true },
  { to: '/admin/catat-pembelian/buah', label: 'Catat Pembelian', icon: ReceiptText, children: [{ to: '/admin/catat-pembelian/buah', label: 'Buah' }, { to: '/admin/catat-pembelian/brondolan', label: 'Brondolan' }] },
  { to: '/admin/pembelian/buah', label: 'Riwayat Pembelian', icon: ClipboardList, children: [{ to: '/admin/pembelian/buah', label: 'Buah' }, { to: '/admin/pembelian/brondolan', label: 'Brondolan' }] },
]

const OWNER_LINKS = [
  { to: '/owner', label: 'Ringkasan', icon: LayoutGrid, end: true },
  { to: '/owner/laporan/buah', label: 'Laporan', icon: ClipboardList, children: [{ to: '/owner/laporan/buah', label: 'Buah' }, { to: '/owner/laporan/brondolan', label: 'Brondolan' }, { to: '/owner/laporan/pinjaman', label: 'Pinjaman Kas' }] },
  { to: '/owner/operasional', label: 'Operasional Kebun', icon: CalendarDays },
  { to: '/owner/kebun-pribadi', label: 'Kebun Pribadi', icon: Sprout },
  { to: '/owner/kontrol-transaksi', label: 'Kontrol Transaksi', icon: ShieldCheck },
  { to: '/owner/admin', label: 'Kelola Admin', icon: Users },
]

export default function Sidebar({ role, collapsed, onToggle }) {
  const { currentUser, logout } = useAuth()
  const location = useLocation()
  const links = role === 'owner' ? OWNER_LINKS : ADMIN_LINKS
  const nestedMenuOpen = (path) => path.startsWith('/owner/laporan') || path.startsWith('/admin/catat-pembelian') || path.startsWith('/admin/pembelian/')

  return (
    <aside className={`app-sidebar hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 z-30 text-paper-100 transition-[width] duration-200 ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'}`}>
      <div className={`flex items-center border-b border-paper-50/10 ${collapsed ? 'justify-center px-3 py-6' : 'justify-between px-5 py-6'}`}>
        {collapsed ? <span className="font-display text-xl text-gold-400">KK</span> : <div><p className="font-display text-xl text-paper-50 leading-tight">Kebun Kas</p><p className="text-xs text-paper-100/50 mt-1">Pencatatan pembelian sawit</p></div>}
        <button onClick={onToggle} className={`rounded-md p-2 text-paper-100/70 hover:bg-paper-50/10 hover:text-paper-50 ${collapsed ? 'absolute -right-4 top-5 border border-ink-900/10 bg-plantation-900 shadow-soft' : ''}`} title={collapsed ? 'Buka sidebar' : 'Ciutkan sidebar'} aria-label={collapsed ? 'Buka sidebar' : 'Ciutkan sidebar'}>
          {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
      </div>

      <nav className={`flex-1 py-5 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
        {links.map(({ to, label, icon: Icon, end, children }) => (
          <React.Fragment key={to}>
            <NavLink
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center rounded-md py-2.5 text-sm transition-colors ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} ${
                  (children ? nestedMenuOpen(location.pathname) && location.pathname.startsWith(to.slice(0, to.lastIndexOf('/'))) : isActive)
                    ? 'bg-gold-500/15 text-gold-400 font-medium'
                    : 'text-paper-100/70 hover:bg-paper-50/5 hover:text-paper-50'
                }`
              }
            >
              <Icon size={17} strokeWidth={2} />
              {!collapsed && label}
            </NavLink>
            {children && nestedMenuOpen(location.pathname) && location.pathname.startsWith(to.slice(0, to.lastIndexOf('/'))) && !collapsed && <div className="ml-9 mt-1 space-y-1 border-l border-paper-50/15 pl-3">
              {children.map((child) => <NavLink key={child.to} to={child.to} className={({ isActive }) => `block rounded-md px-3 py-2 text-sm transition-colors ${isActive ? 'bg-gold-500/10 font-medium text-gold-300' : 'text-paper-100/65 hover:bg-paper-50/5 hover:text-paper-50'}`}>{child.label}</NavLink>)}
            </div>}
          </React.Fragment>
        ))}
      </nav>

      <div className={`border-t border-paper-50/10 py-4 ${collapsed ? 'px-2' : 'px-3'}`}>
        <div className={`mb-2 ${collapsed ? 'flex justify-center py-2' : 'px-3 py-2'}`} title={currentUser?.name}>
          {collapsed ? <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-500/20 text-xs font-medium text-gold-400">{currentUser?.name?.slice(0, 1)}</span> : <><p className="text-sm text-paper-50">{currentUser?.name}</p><p className="text-xs text-paper-100/45 capitalize">{currentUser?.role}</p></>}
        </div>
        <button
          onClick={logout}
          className={`w-full flex items-center rounded-md py-2.5 text-sm text-paper-100/70 hover:bg-paper-50/5 hover:text-paper-50 transition-colors ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'}`}
          title="Keluar"
        >
          <LogOut size={17} />
          {!collapsed && 'Keluar'}
        </button>
      </div>
    </aside>
  )
}
