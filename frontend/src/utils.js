export const CATEGORIES = ['Electronics', 'Appliances', 'Furniture', 'Clothing', 'Automotive', 'Tools', 'Sports', 'Other']
export const CLAIM_STATUSES = ['Open', 'Submitted', 'In Repair', 'Resolved', 'Rejected']
const CURRENCY = { locale: 'en-IN', code: 'INR' }

export const fmtMoney = (n) =>
  new Intl.NumberFormat(CURRENCY.locale, { style: 'currency', currency: CURRENCY.code, maximumFractionDigits: 2 }).format(n || 0)

export const fmtDate = (d) => {
  if (!d) return '—'
  const [y, m, day] = String(d).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const fmtDateTime = (d) => (d ? new Date(d.endsWith('Z') ? d : d + 'Z').toLocaleString('en-GB') : '—')

export const fmtSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

export const countdown = (days) => {
  if (days === null || days === undefined) return 'Not set'
  if (days < 0) return `Expired ${Math.abs(days)} day${days === -1 ? '' : 's'} ago`
  if (days === 0) return 'Ends today'
  return `${days} day${days === 1 ? '' : 's'} left`
}

export const MAX_UPLOAD = 5 * 1024 * 1024
export const validateReceiptFile = (file) => {
  if (!file) return 'Choose a file first.'
  if (!/\.(pdf|jpe?g|png)$/i.test(file.name)) return 'Only PDF, JPG and PNG files are allowed.'
  if (file.size > MAX_UPLOAD) return 'File is larger than 5 MB.'
  if (file.size === 0) return 'File is empty.'
  return null
}
