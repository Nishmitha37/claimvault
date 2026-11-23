import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Package, Pencil, PlusCircle, Search, Trash2 } from 'lucide-react'
import { errMsg, productApi } from '../services/api'
import { CATEGORIES, fmtDate, fmtMoney } from '../utils'
import { Countdown, EmptyState, ErrorAlert, PageHeader, Spinner, StatusBadge } from '../components/ui'

export default function Products() {
  const [filters, setFilters] = useState({ search: '', category: '', warranty_status: '', sort: 'expiry_asc' })
  const [query, setQuery] = useState(filters)
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setQuery(filters), 300)
    return () => clearTimeout(t)
  }, [filters])

  const load = useCallback(() => {
    const params = Object.fromEntries(Object.entries(query).filter(([, v]) => v))
    productApi.list(params).then((d) => { setItems(d); setError('') }).catch((e) => setError(errMsg(e)))
  }, [query])
  useEffect(load, [load])

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? Its receipts and claims will be deleted too.`)) return
    try { await productApi.remove(p.id); load() } catch (e) { setError(errMsg(e)) }
  }
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value })
  const filtered = Object.values({ a: filters.search, b: filters.category, c: filters.warranty_status }).some(Boolean)

  return (
    <>
      <PageHeader title="My Products" subtitle="Everything you've bought and its protection status">
        <Link to="/products/new" className="btn-primary"><PlusCircle className="h-4 w-4" /> Add product</Link>
      </PageHeader>

      <div className="card mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search name, brand, seller, order ID…" value={filters.search} onChange={set('search')} />
        </div>
        <select className="input" value={filters.category} onChange={set('category')}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input" value={filters.warranty_status} onChange={set('warranty_status')}>
          <option value="">All warranty statuses</option>
          <option value="active">Active</option><option value="upcoming">Upcoming</option>
          <option value="urgent">Urgent</option><option value="expired">Expired</option><option value="none">No warranty</option>
        </select>
        <select className="input" value={filters.sort} onChange={set('sort')}>
          <option value="expiry_asc">Expiry: soonest first</option>
          <option value="expiry_desc">Expiry: latest first</option>
          <option value="newest">Recently added</option>
        </select>
      </div>

      <ErrorAlert message={error} />
      {!items ? <Spinner /> : items.length === 0 ? (
        <EmptyState icon={Package} title={filtered ? 'No products match your filters' : 'No products yet'}
          text={filtered ? 'Try clearing the search or filters.' : 'Add a purchase to start tracking its warranty and return window.'}
          action={!filtered && <Link to="/products/new" className="btn-primary">Add product</Link>} />
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
              <tr><th className="px-4 py-3">Product</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Warranty</th><th className="px-4 py-3">Return by</th><th className="px-4 py-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3"><Link to={`/products/${p.id}`} className="font-medium hover:underline">{p.name}</Link><div className="text-xs text-slate-500">{[p.brand, p.model_number].filter(Boolean).join(' · ')}</div></td>
                  <td className="px-4 py-3">{p.category}</td>
                  <td className="px-4 py-3">{fmtMoney(p.purchase_price)}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2"><StatusBadge status={p.warranty_status} /></div><div className="mt-0.5 text-xs text-slate-500">{fmtDate(p.warranty_end)}</div><Countdown days={p.warranty_days_remaining} /></td>
                  <td className="px-4 py-3">{p.return_deadline ? <><StatusBadge status={p.return_status} /><div className="mt-0.5 text-xs text-slate-500">{fmtDate(p.return_deadline)}</div><Countdown days={p.return_days_remaining} /></> : <span className="text-slate-400">—</span>}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1">
                    <Link to={`/products/${p.id}`} className="btn-ghost p-2" title="View"><Eye className="h-4 w-4" /></Link>
                    <Link to={`/products/${p.id}/edit`} className="btn-ghost p-2" title="Edit"><Pencil className="h-4 w-4" /></Link>
                    <button onClick={() => remove(p)} className="btn-ghost p-2 text-red-600" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
