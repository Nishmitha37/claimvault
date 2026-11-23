import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import { dashboardApi, errMsg } from '../services/api'
import { fmtDate } from '../utils'
import { Countdown, EmptyState, ErrorAlert, PageHeader, Spinner, StatusBadge } from '../components/ui'

const DOT = { Expired: 'bg-red-500', Urgent: 'bg-orange-500', Upcoming: 'bg-amber-400', Active: 'bg-emerald-500' }

export default function Timeline() {
  const [events, setEvents] = useState(null)
  const [showExpired, setShowExpired] = useState(false)
  const [kind, setKind] = useState('all')
  const [error, setError] = useState('')

  useEffect(() => {
    setEvents(null)
    dashboardApi.deadlines(showExpired).then(setEvents).catch((e) => setError(errMsg(e)))
  }, [showExpired])

  if (error) return <ErrorAlert message={error} />

  const visible = (events || []).filter((e) => kind === 'all' || e.kind === kind)
  const groups = visible.reduce((acc, e) => {
    const key = new Date(e.date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    ;(acc[key] ||= []).push(e)
    return acc
  }, {})

  return (
    <>
      <PageHeader title="Deadline Timeline" subtitle="Return and warranty deadlines in chronological order">
        <select className="input w-auto" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="all">Returns & warranties</option><option value="return">Returns only</option><option value="warranty">Warranties only</option>
        </select>
        <label className="flex items-center gap-2 rounded-lg border bg-white px-3 text-sm"><input type="checkbox" checked={showExpired} onChange={(e) => setShowExpired(e.target.checked)} /> Show expired</label>
      </PageHeader>

      {!events ? <Spinner /> : visible.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No deadlines to show" text="Add products with return or warranty dates to build your timeline." action={<Link to="/products/new" className="btn-primary">Add product</Link>} />
      ) : (
        <div className="space-y-8">
          {Object.entries(groups).map(([month, list]) => (
            <section key={month}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{month}</h2>
              <ol className="relative space-y-3 border-l-2 border-slate-200 pl-6">
                {list.map((e) => (
                  <li key={`${e.product_id}-${e.kind}`} className="card relative !p-4">
                    <span className={`absolute -left-[33px] top-5 h-4 w-4 rounded-full border-2 border-white ${DOT[e.status]}`} />
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <Link to={`/products/${e.product_id}`} className="font-medium hover:underline">{e.product_name}</Link>
                        <div className="text-sm text-slate-500">{e.kind === 'return' ? 'Return deadline' : 'Warranty ends'} · {fmtDate(e.date)}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1"><StatusBadge status={e.status} /><Countdown days={e.days_remaining} /></div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
