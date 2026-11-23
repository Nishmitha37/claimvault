import axios from 'axios'

const TOKEN_KEY = 'claimvault_token'
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

api.interceptors.request.use((config) => {
  const t = tokenStore.get()
  if (t) config.headers.Authorization = `Bearer ${t}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err.config?.url || ''
    if (err.response?.status === 401 && !url.startsWith('/auth/login') && !url.startsWith('/auth/register')) {
      tokenStore.clear()
      if (window.location.pathname !== '/login') window.location.assign('/login')
    }
    return Promise.reject(err)
  },
)

export function errMsg(err, fallback = 'Something went wrong. Please try again.') {
  if (!err.response) return 'Cannot reach the server. Is the backend running?'
  const d = err.response.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((x) => x.msg).join('; ')
  return fallback
}

export const authApi = {
  login: (d) => api.post('/auth/login', d).then((r) => r.data),
  register: (d) => api.post('/auth/register', d).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
}

export const productApi = {
  list: (params) => api.get('/products', { params }).then((r) => r.data),
  get: (id) => api.get(`/products/${id}`).then((r) => r.data),
  create: (d) => api.post('/products', d).then((r) => r.data),
  update: (id, d) => api.put(`/products/${id}`, d).then((r) => r.data),
  remove: (id) => api.delete(`/products/${id}`),
}

export const receiptApi = {
  list: (params) => api.get('/receipts', { params }).then((r) => r.data),
  upload: (productId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/products/${productId}/receipts`, fd).then((r) => r.data)
  },
  remove: (id) => api.delete(`/receipts/${id}`),
  blob: (id, download = false) =>
    api.get(`/receipts/${id}/file`, { params: { download }, responseType: 'blob' }).then((r) => r.data),
}

export const reminderApi = {
  list: (includeAcknowledged = false) =>
    api.get('/reminders', { params: { include_acknowledged: includeAcknowledged } }).then((r) => r.data),
  acknowledge: (d) => api.post('/reminders/acknowledge', d).then((r) => r.data),
}

export const dashboardApi = {
  get: () => api.get('/dashboard').then((r) => r.data),
  deadlines: (includeExpired) => api.get('/deadlines', { params: { include_expired: includeExpired } }).then((r) => r.data),
}

export const claimApi = {
  list: (params) => api.get('/claims', { params }).then((r) => r.data),
  create: (d) => api.post('/claims', d).then((r) => r.data),
  updateStatus: (id, d) => api.patch(`/claims/${id}/status`, d).then((r) => r.data),
  remove: (id) => api.delete(`/claims/${id}`),
}

export default api
