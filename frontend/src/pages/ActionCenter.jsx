import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, CheckCircle2, RotateCcw, ShieldCheck } from 'lucide-react'
import { errMsg, reminderApi } from '../services/api'
import { fmtDate } from '../utils'
import { Countdown, EmptyState, ErrorAlert, PageHeader, Spinner, StatusBadge } from '../components/ui'

export default function ActionCenter() {
  const [items, setItems] = useState(null)
  const [tab, setTab] = useState('pending')
  const [error, setError] = useState('')
  const [busyKey, setBusyKey] = useState(null)

  const load = useCallback(() => {
    reminderApi.list(true).then(setItems).catch((e) => setError(errMsg(e)))
  }, [])
  useEffect(load, [load])

  const acknowledge = async (r) => {
    const key = `${r.product_id}-${r.kind}`
    setBusyKey(key)
    try {
      await reminderApi.acknowledge({ product_id: r.product_id, kind: r.kind, deadline_date: r.deadline_date })
      window.dispatchEvent(new Event('claimvault:reminders-changed'))
      load()
    } catch (e) { setError(errMsg(e)) } finally { setBusyKey(null) }
  }

  if (!items) return error ? <ErrorAlert message={error} /> : <Spinner />

  const pending = items.filter((i) => !i.acknowledged)
  const done = items.filter((i) => i.acknowledged)
  const list = tab === 'pending' ? pending : done

  return (
    <>
      <PageHeader title="Action Center" subtitle="Deadlines closing within 30 days, with what to do next" />
      <ErrorAlert message={error} />
      <div className="mb-4 flex gap-2">
        {[['pending', `Needs action (${pending.length})`], ['done', `Acknowledged (${done.length})`]].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={tab === k ? 'btn-primary' : 'btn-secondary'}>{label}</button>
        ))}
      </div>
      {list.length === 0 ? (
        <EmptyState icon={tab === 'pending' ? CheckCircle2 : Bell} title={tab === 'pending' ? "You're all caught up" : 'Nothing acknowledged yet'}
          text={tab === 'pending' ? 'No return or warranty deadlines are closing in the next 30 days.' : 'Acknowledged reminders will appear here.'} />
      ) : (
        <ul className="space-y-3">
          {list.map((r) => {
            const key = `${r.product_id}-${r.kind}`
            const urgent = r.severity === 'Urgent' && !r.acknowledged
            return (
              <li key={key} className={`card flex flex-wrap items-start justify-between gap-4 ${urgent ? 'border-orange-300 bg-orange-50' : ''} ${r.acknowledged ? 'opacity-70' : ''}`}>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <StatusBadge status={r.severity} />
                    <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase text-slate-500">
                      {r.kind === 'return' ? <RotateCcw className="h-3 w-3" /> : <ShieldCheck className="h-3 w-3" />}{r.kind}
                    </span>
                    <span className="text-xs text-slate-500">{fmtDate(r.deadline_date)} · <Countdown days={r.days_remaining} /></span>
                  </div>
                  <p className="text-sm">{r.message}</p>
                  <Link to={`/products/${r.product_id}`} className="mt-1 inline-block text-sm font-medium text-brand-600 hover:underline">View {r.product_name}</Link>
                  {r.kind === 'warranty' && <> · <Link to={`/claims?new=1&product=${r.product_id}`} className="text-sm font-medium text-brand-600 hover:underline">File a claim</Link></>}
                </div>
                {!r.acknowledged && <button className="btn-secondary" disabled={busyKey === key} onClick={() => acknowledge(r)}><Check className="h-4 w-4" /> Acknowledge</button>}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
