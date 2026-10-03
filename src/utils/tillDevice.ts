const KEY = 'pos:till-device-id'

let fallback = '' // when the browser cannot store anything (private mode): one id for this page load

/**
 * A random id for THIS till (this browser), made once and kept. Each till starts its own phone-scanner sessions
 * with it, so two tills (even at the same store, signed in with the same account) never share a QR code or a
 * phone, and starting a new code on one till never disconnects another.
 */
export function tillDeviceId(): string {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved) return saved
    const made = crypto.randomUUID()
    localStorage.setItem(KEY, made)
    return made
  } catch {
    fallback ||= crypto.randomUUID()
    return fallback
  }
}
