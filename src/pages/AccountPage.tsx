import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorBox } from '../components/ui'
import { cx, ui } from '../styles'
import { useAuth } from '../useAuth'

/** Sellers change the password the business gave them. */
export default function AccountPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const usesPassword = user?.providerData.some((p) => p.providerId === 'password')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user?.email) return
    setError('')
    try {
      // Firebase asks for the current password again before changing it
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, current))
      await updatePassword(user, next)
      setDone(true)
    } catch (err) {
      const code = (err as { code?: string }).code
      setError(code === 'auth/invalid-credential' || code === 'auth/wrong-password' ? 'Your current password is wrong.' : (err as Error).message)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4 p-6">
      <button type="button" className={cx(ui.link, 'self-start')} onClick={() => navigate(-1)}>
        ← Back
      </button>
      <h1 className={ui.h1}>Your account</h1>
      <p>
        {user?.displayName && <strong className={ui.strong}>{user.displayName} · </strong>}
        {user?.email}
      </p>
      {!usesPassword ? (
        <p className={ui.hint}>You sign in with Google, so there is no password to change here.</p>
      ) : done ? (
        <p className={ui.alertInfo}>Password changed.</p>
      ) : (
        <form className={cx(ui.card, 'flex flex-col gap-4')} onSubmit={handleSubmit}>
          <h2 className={ui.h2}>Change password</h2>
          <label className={ui.label}>
            Current password
            <input className={ui.input} type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </label>
          <label className={ui.label}>
            New password (6+ characters)
            <input className={ui.input} type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
          </label>
          <ErrorBox message={error} />
          <button type="submit" className={ui.btnPrimary} disabled={!current || next.length < 6}>
            Change password
          </button>
        </form>
      )}
    </div>
  )
}
