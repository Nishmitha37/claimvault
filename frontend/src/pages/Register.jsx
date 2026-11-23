import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { errMsg } from '../services/api'
import { ErrorAlert, Field } from '../components/ui'

export default function Register() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) return setError('Passwords do not match.')
    setBusy(true)
    try {
      await register(form.full_name, form.email, form.password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-brand-700 p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-brand-600" />
          <h1 className="mt-2 text-2xl font-bold">Create your account</h1>
          <p className="text-sm text-slate-500">Keep every warranty and receipt in one place</p>
        </div>
        <ErrorAlert message={error} />
        <Field label="Full name"><input className="input" required maxLength={120} value={form.full_name} onChange={set('full_name')} /></Field>
        <Field label="Email"><input className="input" type="email" required autoComplete="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="Password" hint="8–64 characters"><input className="input" type="password" required minLength={8} maxLength={64} autoComplete="new-password" value={form.password} onChange={set('password')} /></Field>
        <Field label="Confirm password"><input className="input" type="password" required autoComplete="new-password" value={form.confirm} onChange={set('confirm')} /></Field>
        <button className="btn-primary w-full" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Register</button>
        <p className="text-center text-sm text-slate-500">Already registered? <Link className="font-medium text-brand-600" to="/login">Log in</Link></p>
      </form>
    </div>
  )
}
