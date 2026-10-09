import React, { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'

export default function AppLayout({ role }) {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1280)
  const [welcomeName, setWelcomeName] = useState(() => sessionStorage.getItem('welcome-user') || '')
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!welcomeName) return undefined
    sessionStorage.removeItem('welcome-user')
    setLeaving(false)
    const hideTimer = window.setTimeout(() => setLeaving(true), 3000)
    const removeTimer = window.setTimeout(() => setWelcomeName(''), 3350)
    return () => { window.clearTimeout(hideTimer); window.clearTimeout(removeTimer) }
  }, [welcomeName])

  useEffect(() => {
    let activeContainer = null
    let startX = 0
    let startScrollLeft = 0
    let moved = false

    const findContainer = (target) => target.closest('.table-scroll, .card > .overflow-x-auto')
    const startDrag = (event) => {
      if (event.button !== 0 || event.target.closest('button, input, select, a, label')) return
      const container = findContainer(event.target)
      if (!container || container.scrollWidth <= container.clientWidth) return
      activeContainer = container
      startX = event.clientX
      startScrollLeft = container.scrollLeft
      moved = false
      container.classList.add('table-dragging')
    }
    const drag = (event) => {
      if (!activeContainer) return
      const distance = event.clientX - startX
      if (Math.abs(distance) > 3) {
        moved = true
        activeContainer.scrollLeft = startScrollLeft - distance
        event.preventDefault()
      }
    }
    const endDrag = () => {
      if (!activeContainer) return
      activeContainer.classList.remove('table-dragging')
      activeContainer = null
    }
    const blockClickAfterDrag = (event) => { if (moved) { event.preventDefault(); moved = false } }

    document.addEventListener('pointerdown', startDrag)
    document.addEventListener('pointermove', drag, { passive: false })
    document.addEventListener('pointerup', endDrag)
    document.addEventListener('pointercancel', endDrag)
    document.addEventListener('click', blockClickAfterDrag, true)
    return () => {
      document.removeEventListener('pointerdown', startDrag)
      document.removeEventListener('pointermove', drag)
      document.removeEventListener('pointerup', endDrag)
      document.removeEventListener('pointercancel', endDrag)
      document.removeEventListener('click', blockClickAfterDrag, true)
    }
  }, [])

  return <div className="app-canvas"><Sidebar role={role} collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} /><main className={`app-content transition-[padding] duration-200 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'}`}><MobileNav role={role} /><div className="app-page"><Outlet /></div></main>{welcomeName && <div role="status" className={`welcome-toast ${leaving ? 'welcome-toast-leave' : ''}`}><span className="welcome-toast-icon"><Sparkles size={18} /></span><div><p className="text-xs text-paper-100/65">Selamat datang kembali</p><p className="font-medium text-paper-50">{welcomeName} ✦</p></div></div>}</div>
}
