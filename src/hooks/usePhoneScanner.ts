import { collection, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { useEffect, useRef, useState } from 'react'
import { approveScannerSession, endScannerSession, startScannerSession } from '../api/pos'
import type { ScanEvent, ScannerSession, ScannerStarted } from '../api/types'
import { db } from '../firebase'
import { tillDeviceId } from '../utils/tillDevice'

type Saved = { started: ScannerStarted; handledUntil: number }

function readSaved(key: string): Saved | null {
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? 'null') as Saved | null
    return saved && saved.started.session.expiresAt > Date.now() ? saved : null
  } catch {
    return null
  }
}

function write(key: string, saved: Saved | null) {
  try {
    if (saved) localStorage.setItem(key, JSON.stringify(saved))
    else localStorage.removeItem(key)
  } catch {
    // Not kept: after a reload the till starts a new session
  }
}

/**
 * A phone paired with this till (the SIRIS Scanner app). The till starts a session and shows its code as a
 * QR code; each barcode the phone scans arrives here live and `onScan` puts it in the cart.
 * The session is kept in this browser, so a page reload keeps the phone connected (and never adds a scan twice).
 */
export function usePhoneScanner(businessId: string, locationId: string, onScan: (scan: ScanEvent) => void) {
  const storageKey = `pos:scanner:${businessId}:${locationId}`
  const [saved, setSaved] = useState<Saved | null>(() => readSaved(storageKey))
  const [session, setSession] = useState<ScannerSession | null>(null)
  const [error, setError] = useState('')
  const latestOnScan = useRef(onScan)
  useEffect(() => {
    latestOnScan.current = onScan
  })

  const sessionId = saved?.started.session.id ?? ''
  const since = saved?.handledUntil ?? 0

  // The session itself: is a phone connected, and is it still open?
  useEffect(() => {
    if (!sessionId) return
    return onSnapshot(
      doc(db, 'businesses', businessId, 'scannerSessions', sessionId),
      (snapshot) => setSession(snapshot.exists() ? ({ ...(snapshot.data() as Omit<ScannerSession, 'id'>), id: snapshot.id }) : null),
      (err) => setError(err.message),
    )
  }, [businessId, sessionId])

  // The scans, live. Only those after the last one handled, so a reload never adds one twice.
  useEffect(() => {
    if (!sessionId) return
    let handledUntil = since
    const handled = new Set<string>() // each scan goes in the cart once, even if two arrive in the same millisecond
    const newScans = query(
      collection(db, 'businesses', businessId, 'scannerSessions', sessionId, 'scans'),
      where('createdAt', '>', since), // after the last scan handled (kept in this browser), so a reload adds none twice
      orderBy('createdAt'),
    )
    return onSnapshot(
      newScans,
      (snapshot) => {
        for (const change of snapshot.docChanges()) {
          if (change.type !== 'added') continue
          const scan = { ...(change.doc.data() as Omit<ScanEvent, 'id'>), id: change.doc.id }
          if (scan.createdAt < handledUntil || handled.has(scan.id)) continue
          handled.add(scan.id)
          handledUntil = scan.createdAt
          latestOnScan.current(scan)
        }
        setSaved((current) => {
          if (!current || current.handledUntil >= handledUntil) return current
          const next = { ...current, handledUntil }
          write(storageKey, next)
          return next
        })
      },
      (err) => setError(err.message),
    )
    // `since` only matters when listening starts (a new session or a reload)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, sessionId, storageKey])

  async function start(allowRegister = false) {
    setError('')
    try {
      const started = await startScannerSession(businessId, locationId, tillDeviceId(), allowRegister)
      const next = { started, handledUntil: started.session.createdAt }
      write(storageKey, next)
      setSession(null)
      setSaved(next)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function stop() {
    setError('')
    if (sessionId) await endScannerSession(businessId, sessionId, tillDeviceId()).catch(() => undefined)
    write(storageKey, null)
    setSaved(null)
    setSession(null)
  }

  /** "Ana's phone wants to connect" -> Allow */
  async function approve() {
    setError('')
    if (!sessionId) return
    try {
      await approveScannerSession(businessId, sessionId, tillDeviceId())
    } catch (err) {
      setError((err as Error).message)
    }
  }

  // (After expiresAt the API refuses scans and the phone is told to pair again)
  const open = !!session && session.active
  const name = session?.scannerName || 'Phone scanner'
  return {
    started: saved?.started ?? null,
    /** The phone's name once it is connected AND approved */
    scannerName: open && session.pairedAt && session.approved ? name : '',
    /** A phone scanned this till's QR code and waits for the cashier's OK (its name; '' when none waits) */
    waitingName: open && session.pairedAt && !session.approved ? name : '',
    /** The phone may also register products */
    canRegister: !!session?.allowRegister,
    approve,
    /** The session ended (on the phone, or it expired): the till can start a new one */
    ended: !!saved && !!session && !open,
    error,
    start,
    stop,
  }
}

export type PhoneScanner = ReturnType<typeof usePhoneScanner>
