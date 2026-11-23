import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Loader2, Pencil, Trash2, Upload, Wrench } from 'lucide-react'
import { claimApi, errMsg, productApi, receiptApi } from '../services/api'
import { fmtDate, fmtMoney, validateReceiptFile } from '../utils'
import ReceiptTable from '../components/ReceiptTable'
import { ClaimBadge, Countdown, EmptyState, ErrorAlert, PageHeader, Spinner, StatusBadge } from '../components/ui'

const Info = ({ label, value }) => (
  <div><dt className="text-xs uppercase text-slate-500">{label}</dt><dd className="text-sm font-medium">{value || '—'}</dd></div>
)

const DeadlineCard = ({ title, date, days, status }) => (
  <div className="card">
    <div className="flex items-center justify-between"><h3 className="font-semibold">{title}</h3><StatusBadge status={status} /></div>
    <div className="mt-2 text-lg font-bold">{fmtDate(date)}</div>
    <Countdown days={days} />
  </div>
)

export default function ProductDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [product, setProduct] = useState(null)
  const [receipts, setReceipts] = useState([])
  const [claims, setClaims] = useState([])
  const [error, setError] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    try {
      const [p, r, c] = await Promise.all([productApi.get(id), receiptApi.list({ product_id: id }), claimApi.list({ product_id: id })])
      setProduct(p); setReceipts(r); setClaims(c)
    } catch (e) { setError(errMsg(e)) }
  }, [id])
  useEffect(() => { load() }, [load])

  const upload = async (e) => {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    const problem = validateReceiptFile(file)
    if (problem) return setUploadError(problem)
    setUploadError(''); setUploading(true)
    try { await receiptApi.upload(id, file); fileRef.current.value = ''; await load() } catch (err) { setUploadError(errMsg(err)) } finally { setUploading(false) }
  }

  const remove = async () => {
    if (!window.confirm(`Delete "${product.name}"? Its receipts and claims will be deleted too.`)) return
    try { await productApi.remove(id); navigate('/products') } catch (e) { setError(errMsg(e)) }
  }

  if (error) return <ErrorAlert message={error} />
  if (!product) return <Spinner />

  return (
    <>
      <PageHeader title={product.name} subtitle={[product.brand, product.category].filter(Boolean).join(' · ')}>
        <Link to={`/products/${id}/edit`} className="btn-secondary"><Pencil className="h-4 w-4" /> Edit</Link>
        <button onClick={remove} className="btn-danger"><Trash2 className="h-4 w-4" /> Delete</button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <DeadlineCard title="Return deadline" date={product.return_deadline} days={product.return_days_remaining} status={product.return_status} />
        <DeadlineCard title="Warranty ends" date={product.warranty_end} days={product.warranty_days_remaining} status={product.warranty_status} />
      </div>

      <section className="card mt-6">
        <h2 className="mb-4 font-semibold">Details</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Model number" value={product.model_number} />
          <Info label="Purchase date" value={fmtDate(product.purchase_date)} />
          <Info label="Purchase price" value={fmtMoney(product.purchase_price)} />
          <Info label="Seller" value={product.seller} />
          <Info label="Order ID" value={product.order_id} />
          <Info label="Warranty start" value={fmtDate(product.warranty_start)} />
          <Info label="Warranty end" value={fmtDate(product.warranty_end)} />
        </dl>
        {product.notes && <p className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{product.notes}</p>}
      </section>

      <section className="card mt-6">
        <h2 className="mb-3 font-semibold">Receipts</h2>
        <form onSubmit={upload} className="mb-4 flex flex-wrap items-center gap-2">
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="input max-w-sm" />
          <button className="btn-primary" disabled={uploading}>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload</button>
          <span className="text-xs text-slate-400">PDF, JPG or PNG, up to 5 MB</span>
        </form>
        <ErrorAlert message={uploadError} />
        {receipts.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No receipts attached yet.</p> : <ReceiptTable receipts={receipts} onChanged={load} />}
      </section>

      <section className="card mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Warranty claims</h2>
          <Link to={`/claims?new=1&product=${id}`} className="btn-secondary"><Wrench className="h-4 w-4" /> New claim</Link>
        </div>
        {claims.length === 0 ? <p className="py-6 text-center text-sm text-slate-500">No claims for this product.</p> : (
          <ul className="divide-y">
            {claims.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0"><div className="font-medium">{c.reference_number}</div><div className="truncate text-xs text-slate-500">{c.description}</div></div>
                <ClaimBadge status={c.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
