import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, Bell, CalendarClock, CheckCircle2, IndianRupee, Package, PlusCircle, RotateCcw, ShieldAlert } from 'lucide-react'
import { dashboardApi, errMsg } from '../services/api'
import { fmtDate, fmtMoney } from '../utils'
import { Countdown, EmptyState, ErrorAlert, PageHeader, Spinner, StatusBadge } from '../components/ui'

const Stat = ({ icon: Icon, label, value, tone }) => (
  <div className="card flex items-center gap-4">
    <div className={`rounded-lg p-3 ${tone}`}><Icon className="h-5 w-5" /></div>
    <div><div className="text-2xl font-bold">{value}</div><div className="text-xs text-slate-500">{label}</div></div>
  </div>
)

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    dashboardApi.get().then(setData).catch((e) => setError(errMsg(e)))
  }, [])

  if (error) return <ErrorAlert message={error} />
  if (!data) return <Spinner />

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Your purchases, deadlines and actions at a glance">
        <Link to="/products/new" className="btn-primary"><PlusCircle className="h-4 w-4" /> Add product</Link>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Package} label="Total products" value={data.total_products} tone="bg-indigo-100 text-indigo-600" />
        <Stat icon={CheckCircle2} label="Active warranties" value={data.active_warranties} tone="bg-emerald-100 text-emerald-600" />
        <Stat icon={ShieldAlert} label="Expired warranties" value={data.expired_warranties} tone="bg-red-100 text-red-600" />
        <Stat icon={IndianRupee} label="Total spending" value={fmtMoney(data.total_spending)} tone="bg-sky-100 text-sky-600" />
        <Stat icon={RotateCcw} label="Returns closing in 30 days" value={data.upcoming_return_deadlines} tone="bg-amber-100 text-amber-600" />
        <Stat icon={CalendarClock} label="Warranties ending in 30 days" value={data.upcoming_warranty_deadlines} tone="bg-orange-100 text-orange-600" />
        <Stat icon={Bell} label="Pending actions" value={data.action_center.pending_count} tone="bg-violet-100 text-violet-600" />
        <Stat icon={AlertTriangle} label="Urgent actions" value={data.action_center.urgent_count} tone="bg-rose-100 text-rose-600" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <section className="card lg:col-span-3">
          <h2 className="mb-4 font-semibold">Spending by category</h2>
          {data.category_spending.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">Add products to see spending by category.</p>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.category_spending}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} width={70} />
                  <Tooltip formatter={(v) => fmtMoney(v)} />
                  <Bar dataKey="total" name="Spent" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="card lg:col-span-2">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Action Center</h2><Link to="/actions" className="text-sm text-brand-600">View all</Link></div>
          {data.action_center.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">Nothing needs your attention. 🎉</p>
          ) : (
            <ul className="space-y-3">
              {data.action_center.items.map((r) => (
                <li key={`${r.product_id}-${r.kind}`} className={`rounded-lg border p-3 text-sm ${r.severity === 'Urgent' ? 'border-orange-300 bg-orange-50' : 'border-slate-200'}`}>
                  <div className="mb-1 flex items-center gap-2"><StatusBadge status={r.severity} /><span className="text-xs uppercase text-slate-500">{r.kind}</span></div>
                  <Link to={`/products/${r.product_id}`} className="font-medium hover:underline">{r.product_name}</Link>
                  <div className="text-xs text-slate-500">{fmtDate(r.deadline_date)} · <Countdown days={r.days_remaining} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="mb-3 font-semibold">Upcoming deadlines</h2>
          {data.timeline.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No upcoming deadlines.</p>
          ) : (
            <ol className="relative space-y-4 border-l-2 border-slate-200 pl-5">
              {data.timeline.map((e) => (
                <li key={`${e.product_id}-${e.kind}`} className="relative">
                  <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-brand-600" />
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Link to={`/products/${e.product_id}`} className="font-medium hover:underline">{e.product_name}</Link>
                    <StatusBadge status={e.status} />
                  </div>
                  <div className="text-xs text-slate-500">{e.kind === 'return' ? 'Return deadline' : 'Warranty ends'} · {fmtDate(e.date)} · <Countdown days={e.days_remaining} /></div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card">
          <h2 className="mb-3 font-semibold">Recent products</h2>
          {data.recent_products.length === 0 ? (
            <EmptyState icon={Package} title="No products yet" text="Add your first purchase to start tracking." action={<Link to="/products/new" className="btn-primary">Add product</Link>} />
          ) : (
            <ul className="divide-y">
              {data.recent_products.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link to={`/products/${p.id}`} className="block truncate font-medium hover:underline">{p.name}</Link>
                    <div className="text-xs text-slate-500">{p.category} · {fmtMoney(p.purchase_price)}</div>
                  </div>
                  <StatusBadge status={p.warranty_status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
