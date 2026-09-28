import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { ErrorBox } from '../components/ui'
import { auth, googleProvider } from '../firebase'
import { cx, ui } from '../styles'
import { useAuth } from '../useAuth'

/** Firebase error codes -> words a seller understands. */
function loginError(err: unknown): string {
  const code = (err as { code?: string }).code ?? ''
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(code)) {
    return 'Wrong email or password.'
  }
  if (code === 'auth/too-many-requests') return 'Too many tries. Wait a minute and try again.'
  if (code === 'auth/popup-closed-by-user') return ''
  return (err as Error).message
}

export default function LoginPage() {
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function run(signIn: () => Promise<unknown>) {
    setError('')
    setBusy(true)
    try {
      await signIn()
    } catch (err) {
      setError(loginError(err))
    } finally {
      setBusy(false)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    run(() => signInWithEmailAndPassword(auth, email.trim(), password))
  }

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <form className={cx(ui.card, 'flex w-full max-w-sm flex-col gap-4 p-7')} onSubmit={handleSubmit}>
        <div>
          <h1 className={ui.h1}>Selling</h1>
          <p className={ui.hint}>Sign in with the account your business gave you.</p>
        </div>
        <label className={ui.label}>
          Email
          <input className={ui.input} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </label>
        <label className={ui.label}>
          Password
          <input className={ui.input} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <ErrorBox message={error} />
        <button type="submit" className={ui.btnPrimary} disabled={busy || !email.trim() || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <div className="flex items-center gap-3 text-[0.8rem] text-muted">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>
        <button type="button" className={ui.btnGhost} disabled={busy} onClick={() => run(() => signInWithPopup(auth, googleProvider))}>
          Continue with Google (business owners)
        </button>
      </form>
    </div>
  )
}
