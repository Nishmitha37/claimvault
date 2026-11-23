import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Loader2, Upload } from 'lucide-react'
import { errMsg, productApi, receiptApi } from '../services/api'
import { validateReceiptFile } from '../utils'
import ReceiptTable from '../components/ReceiptTable'
import { EmptyState, ErrorAlert, Field, PageHeader, Spinner } from '../components/ui'

export default function ReceiptVault() {
  const fileRef = useRef(null)
  const [receipts, setReceipts] = useState(null)
  const [products, setProducts] = useState(null)
  const [productId, setProductId] = useState('')
  const [error, setError] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)

  const load = useCallback(() => {
    receiptApi.list().then(setReceipts).catch((e) => setError(errMsg(e)))
  }, [])
  useEffect(() => {
    load()
    productApi.list({ sort: 'newest' }).then((p) => { setProducts(p); if (p[0]) setProductId(String(p[0].id)) }).catch((e) => setError(errMsg(e)))
  }, [load])

  const upload = async (e) => {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!productId) return setUploadError('Choose the product this receipt belongs to.')
    const problem = validateReceiptFile(file)
    if (problem) return setUploadError(problem)
    setUploadError(''); setUploading(true)
    try { await receiptApi.upload(productId, file); fileRef.current.value = ''; load() } catch (err) { setUploadError(errMsg(err)) } finally { setUploading(false) }
  }

  if (!receipts || !products) return error ? <ErrorAlert message={error} /> : <Spinner />

  return (
    <>
      <PageHeader title="Receipt Vault" subtitle="Invoices and receipts, private to your account" />
      <ErrorAlert message={error} />
      {products.length === 0 ? (
        <EmptyState icon={FileText} title="Add a product first" text="Receipts are attached to products." action={<Link to="/products/new" className="btn-primary">Add product</Link>} />
      ) : (
        <form onSubmit={upload} className="card mb-6 grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <Field label="Product"><select className="input" value={productId} onChange={(e) => setProductId(e.target.value)}>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
          <Field label="Receipt file" hint="PDF, JPG or PNG, up to 5 MB"><input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="input" /></Field>
          <button className="btn-primary" disabled={uploading}>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload</button>
          {uploadError && <div className="sm:col-span-3"><ErrorAlert message={uploadError} /></div>}
        </form>
      )}
      {receipts.length === 0 ? (
        products.length > 0 && <EmptyState icon={FileText} title="No receipts yet" text="Upload your first receipt above." />
      ) : (
        <div className="card"><ReceiptTable receipts={receipts} onChanged={load} showProduct /></div>
      )}
    </>
  )
}
