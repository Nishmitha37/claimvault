import { AlertCircle, Loader2 } from 'lucide-react'
import { countdown } from '../utils'

export const Spinner = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
    <Loader2 className="h-5 w-5 animate-spin" /> {label}
  </div>
)

export const ErrorAlert = ({ message }) =>
  message ? (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <span>{message}</span>
    </div>
  ) : null

export const EmptyState = ({ icon: Icon, title, text, action }) => (
  <div className="card flex flex-col items-center py-12 text-center">
    {Icon && <Icon className="mb-3 h-10 w-10 text-slate-300" />}
    <h3 className="font-semibold text-slate-700">{title}</h3>
    {text && <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
)

export const PageHeader = ({ title, subtitle, children }) => (
  <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
)

const STATUS_STYLE = {
  Expired: 'bg-red-100 text-red-700',
  Urgent: 'bg-orange-100 text-orange-700',
  Upcoming: 'bg-amber-100 text-amber-700',
  Active: 'bg-emerald-100 text-emerald-700',
}

export const StatusBadge = ({ status }) =>
  status ? (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>
  ) : (
    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">Not set</span>
  )

export const Countdown = ({ days }) => <span className="text-xs text-slate-500">{countdown(days)}</span>

const CLAIM_STYLE = {
  Open: 'bg-blue-100 text-blue-700',
  Submitted: 'bg-indigo-100 text-indigo-700',
  'In Repair': 'bg-amber-100 text-amber-700',
  Resolved: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
}
export const ClaimBadge = ({ status }) => (
  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${CLAIM_STYLE[status]}`}>{status}</span>
)

export const Field = ({ label, children, hint }) => (
  <div>
    <label className="label">{label}</label>
    {children}
    {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
  </div>
)
