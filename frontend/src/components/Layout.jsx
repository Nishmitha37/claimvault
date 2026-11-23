import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bell, CalendarClock, FileText, LayoutDashboard, LogOut, Menu, Package, ShieldCheck, Wrench, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { reminderApi } from '../services/api'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/products', label: 'My Products', icon: Package },
  { to: '/receipts', label: 'Receipt Vault', icon: FileText },
  { to: '/timeline', label: 'Deadlines', icon: CalendarClock },
  { to: '/actions', label: 'Action Center', icon: Bell, badge: true },
  { to: '/claims', label: 'Warranty Claims', icon: Wrench },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    const load = () => reminderApi.list().then((r) => setPending(r.length)).catch(() => {})
    load()
    window.addEventListener('claimvault:reminders-changed', load)
    return () => window.removeEventListener('claimvault:reminders-changed', load)
  }, [])

  const doLogout = () => {
    logout()
    navigate('/login')
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-200">
      <div className="flex items-center gap-2 px-5 py-5 text-lg font-bold text-white">
        <ShieldCheck className="h-6 w-6 text-brand-500" /> ClaimVault
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}
            className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'}`}>
            <Icon className="h-4 w-4" /> <span className="flex-1">{label}</span>
            {badge && pending > 0 && <span className="rounded-full bg-orange-500 px-2 text-xs font-bold text-white">{pending}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <div className="mb-3 truncate text-sm">
          <div className="font-medium text-white">{user?.full_name}</div>
          <div className="truncate text-xs text-slate-400">{user?.email}</div>
        </div>
        <button onClick={doLogout} className="btn w-full bg-slate-800 text-slate-200 hover:bg-slate-700"><LogOut className="h-4 w-4" /> Log out</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 lg:block"><div className="fixed inset-y-0 w-64">{sidebar}</div></aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64">{sidebar}</div>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b bg-white px-4 py-3 lg:hidden">
          <span className="flex items-center gap-2 font-bold"><ShieldCheck className="h-5 w-5 text-brand-600" /> ClaimVault</span>
          <button aria-label="Toggle menu" onClick={() => setOpen(!open)} className="btn-ghost p-2">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  )
}
