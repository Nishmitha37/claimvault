import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { errMsg, productApi } from '../services/api'
import { CATEGORIES } from '../utils'
import { ErrorAlert, Field, PageHeader, Spinner } from '../components/ui'

const EMPTY = { name: '', brand: '', category: 'Electronics', model_number: '', purchase_date: '', purchase_price: '', seller: '', order_id: '', return_deadline: '', warranty_start: '', warranty_end: '', notes: '' }

export default function ProductFormPage() {
  const { id } = useParams()
  const editing = !!id
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(editing)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!editing) return
    productApi.get(id).then((p) => setForm(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, p[k] ?? ''])))).catch((e) => setError(errMsg(e))).finally(() => setLoading(false))
  }, [id, editing])

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if ((form.warranty_start && !form.warranty_end) || (!form.warranty_start && form.warranty_end)) return setError('Enter both warranty start and end dates, or leave both empty.')
    if (form.warranty_start && form.warranty_end < form.warranty_start) return setError('Warranty end date cannot be before the start date.')
    if (form.return_deadline && form.return_deadline < form.purchase_date) return setError('Return deadline cannot be before the purchase date.')
    const payload = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v === '' ? null : v]))
    setBusy(true)
    try {
      const saved = editing ? await productApi.update(id, payload) : await productApi.create(payload)
      window.dispatchEvent(new Event('claimvault:reminders-changed'))
      navigate(`/products/${saved.id}`)
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <>
      <PageHeader title={editing ? 'Edit product' : 'Add product'} subtitle="Dates drive your reminders, so keep them accurate" />
      <form onSubmit={submit} className="card max-w-3xl space-y-6">
        <ErrorAlert message={error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name *"><input className="input" required maxLength={200} value={form.name} onChange={set('name')} /></Field>
          <Field label="Brand"><input className="input" maxLength={120} value={form.brand} onChange={set('brand')} /></Field>
          <Field label="Category *"><select className="input" value={form.category} onChange={set('category')}>{[...new Set([...CATEGORIES, form.category])].map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Model number"><input className="input" maxLength={120} value={form.model_number} onChange={set('model_number')} /></Field>
          <Field label="Purchase date *"><input className="input" type="date" required value={form.purchase_date} onChange={set('purchase_date')} /></Field>
          <Field label="Purchase price *"><input className="input" type="number" required min="0" step="0.01" max="99999999.99" value={form.purchase_price} onChange={set('purchase_price')} /></Field>
          <Field label="Seller"><input className="input" maxLength={160} value={form.seller} onChange={set('seller')} /></Field>
          <Field label="Order ID"><input className="input" maxLength={120} value={form.order_id} onChange={set('order_id')} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Return deadline"><input className="input" type="date" value={form.return_deadline} onChange={set('return_deadline')} /></Field>
          <Field label="Warranty start"><input className="input" type="date" value={form.warranty_start} onChange={set('warranty_start')} /></Field>
          <Field label="Warranty end"><input className="input" type="date" value={form.warranty_end} onChange={set('warranty_end')} /></Field>
        </div>
        <Field label="Notes"><textarea className="input" rows={3} maxLength={5000} value={form.notes} onChange={set('notes')} /></Field>
        <div className="flex gap-2">
          <button className="btn-primary" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? 'Save changes' : 'Add product'}</button>
          <Link to={editing ? `/products/${id}` : '/products'} className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </>
  )
}
