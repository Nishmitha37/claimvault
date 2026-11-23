import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, Loader2, PlusCircle, Trash2, Wrench } from 'lucide-react'
import { claimApi, errMsg, productApi } from '../services/api'
import { CLAIM_STATUSES, fmtDateTime } from '../utils'
import { ClaimBadge, EmptyState, ErrorAlert, Field, PageHeader, Spinner } from '../components/ui'

function ClaimCard({ claim, onChanged }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState(claim.status)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => setStatus(claim.status), [claim.status])

  const update = async () => {
    setError(''); setBusy(true)
    try { await claimApi.updateStatus(claim.id, { status, note: note || null }); setNote(''); onChanged() } catch (e) { setError(errMsg(e)) } finally { setBusy(false) }
  }
  const remove = async () => {
    if (!window.confirm(`Delete claim ${claim.reference_number}?`)) return
    try { await claimApi.remove(claim.id); onChanged() } catch (e) { setError(errMsg(e)) }
  }

  return (
    <li className="card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{claim.reference_number}</span><ClaimBadge status={claim.status} /></div>
          <Link to={`/products/${claim.product_id}`} className="text-sm text-brand-600 hover:underline">{claim.product_name}</Link>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{claim.description}</p>
        </div>
        <div className="flex gap-1">
          <button className="btn-ghost" onClick={() => setOpen(!open)}>{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} Manage</button>
          <button className="btn-ghost p-2 text-red-600" title="Delete claim" onClick={remove}><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      {open && (
        <div className="mt-4 grid gap-6 border-t pt-4 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Update status</h3>
            <ErrorAlert message={error} />
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>{CLAIM_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            <input className="input" placeholder="Optional note (e.g. sent to service centre)" maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="btn-primary" disabled={busy || status === claim.status} onClick={update}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Update status</button>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">History</h3>
            <ol className="space-y-3 border-l-2 border-slate-200 pl-4 text-sm">
              {[...claim.history].reverse().map((h) => (
                <li key={h.id}>
                  <div>{h.old_status ? <>{h.old_status} → <b>{h.new_status}</b></> : <b>{h.new_status}</b>}</div>
                  {h.note && <div className="text-slate-600">{h.note}</div>}
                  <div className="text-xs text-slate-400">{fmtDateTime(h.changed_at)}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </li>
  )
}

export default function Claims() {
  const [params, setParams] = useSearchParams()
  const [claims, setClaims] = useState(null)
  const [products, setProducts] = useState([])
  const [filter, setFilter] = useState('')
  const [showForm, setShowForm] = useState(params.get('new') === '1')
  const [form, setForm] = useState({ product_id: params.get('product') || '', reference_number: '', description: '' })
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    claimApi.list(filter ? { status_filter: filter } : {}).then(setClaims).catch((e) => setError(errMsg(e)))
  }, [filter])
  useEffect(load, [load])
  useEffect(() => {
    productApi.list({ sort: 'newest' }).then((p) => {
      setProducts(p)
      setForm((f) => ({ ...f, product_id: f.product_id || (p[0] ? String(p[0].id) : '') }))
    }).catch((e) => setError(errMsg(e)))
  }, [])

  const create = async (e) => {
    e.preventDefault()
    setFormError(''); setBusy(true)
    try {
      await claimApi.create({ ...form, product_id: Number(form.product_id) })
      setForm({ ...form, reference_number: '', description: '' })
      setShowForm(false); setParams({}); load()
    } catch (err) { setFormError(errMsg(err)) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="Warranty Claims" subtitle="Track every claim from first report to resolution">
        <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>{CLAIM_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}><PlusCircle className="h-4 w-4" /> New claim</button>
      </PageHeader>
      <ErrorAlert message={error} />

      {showForm && (products.length === 0 ? (
        <div className="card mb-6 text-sm">You need a product before filing a claim. <Link to="/products/new" className="font-medium text-brand-600">Add one</Link>.</div>
      ) : (
        <form onSubmit={create} className="card mb-6 space-y-4">
          <h2 className="font-semibold">New warranty claim</h2>
          <ErrorAlert message={formError} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product"><select className="input" required value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            <Field label="Claim reference number"><input className="input" required maxLength={100} value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} /></Field>
          </div>
          <Field label="Description"><textarea className="input" rows={3} required maxLength={5000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="flex gap-2">
            <button className="btn-primary" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Create claim</button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      ))}

      {!claims ? <Spinner /> : claims.length === 0 ? (
        <EmptyState icon={Wrench} title={filter ? 'No claims with this status' : 'No warranty claims'} text={filter ? 'Try another status filter.' : 'File a claim when a product under warranty has a problem.'} />
      ) : (
        <ul className="space-y-4">{claims.map((c) => <ClaimCard key={c.id} claim={c} onChanged={load} />)}</ul>
      )}
    </>
  )
}
