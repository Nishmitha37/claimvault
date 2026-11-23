import { useEffect, useState } from 'react'
import { Download, Eye, FileText, Trash2, X } from 'lucide-react'
import { errMsg, receiptApi } from '../services/api'
import { fmtDateTime, fmtSize } from '../utils'
import { ErrorAlert, Spinner } from './ui'
import { Link } from 'react-router-dom'

function Preview({ receipt, onClose }) {
  const [url, setUrl] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let objectUrl
    receiptApi.blob(receipt.id).then((b) => { objectUrl = URL.createObjectURL(b); setUrl(objectUrl) }).catch((e) => setError(errMsg(e)))
    return () => objectUrl && URL.revokeObjectURL(objectUrl)
  }, [receipt.id])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="flex h-[85vh] w-full max-w-4xl flex-col rounded-xl bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="truncate font-medium">{receipt.original_filename}</span>
          <button onClick={onClose} className="btn-ghost p-2" aria-label="Close preview"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-auto bg-slate-100 p-2">
          {error ? <ErrorAlert message={error} /> : !url ? <Spinner /> : receipt.content_type === 'application/pdf'
            ? <iframe title="Receipt preview" src={url} className="h-full w-full rounded bg-white" />
            : <img src={url} alt={receipt.original_filename} className="mx-auto max-h-full max-w-full object-contain" />}
        </div>
      </div>
    </div>
  )
}

export default function ReceiptTable({ receipts, onChanged, showProduct = false }) {
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')

  const download = async (r) => {
    try {
      const blob = await receiptApi.blob(r.id, true)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = r.original_filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) { setError(errMsg(e)) }
  }
  const remove = async (r) => {
    if (!window.confirm(`Delete receipt "${r.original_filename}"?`)) return
    try { await receiptApi.remove(r.id); onChanged() } catch (e) { setError(errMsg(e)) }
  }

  return (
    <>
      <ErrorAlert message={error} />
      <ul className="divide-y">
        {receipts.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <FileText className="h-8 w-8 shrink-0 text-slate-400" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{r.original_filename}</div>
                <div className="text-xs text-slate-500">
                  {fmtSize(r.size_bytes)} · {fmtDateTime(r.uploaded_at)}
                  {showProduct && <> · <Link className="text-brand-600 hover:underline" to={`/products/${r.product_id}`}>{r.product_name}</Link></>}
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <button className="btn-ghost p-2" title="Preview" onClick={() => setPreview(r)}><Eye className="h-4 w-4" /></button>
              <button className="btn-ghost p-2" title="Download" onClick={() => download(r)}><Download className="h-4 w-4" /></button>
              <button className="btn-ghost p-2 text-red-600" title="Delete" onClick={() => remove(r)}><Trash2 className="h-4 w-4" /></button>
            </div>
          </li>
        ))}
      </ul>
      {preview && <Preview receipt={preview} onClose={() => setPreview(null)} />}
    </>
  )
}
