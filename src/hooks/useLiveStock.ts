import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { listStock } from '../api/pos'
import type { StockItem } from '../api/types'
import { db } from '../firebase'

// Used when live updates are not allowed (e.g. the Firestore rules are not deployed yet)
const FALLBACK_REFRESH_MS = 10_000

type LiveState = { key: string; stock: Record<string, StockItem> | undefined; live: boolean; error: string }

/**
 * The stock at one location, by stock id, updating by itself: when anyone sells or adds stock
 * (here, in the main app, or on another till) the numbers change within a second.
 *
 * It listens to Firestore directly (read only; see firestore.rules in my-business-be).
 * If that is not allowed, it asks the API every 10 seconds instead.
 */
export function useLiveStock(businessId: string, locationId: string) {
  const key = `${businessId}/${locationId}`
  const [state, setState] = useState<LiveState>({ key, stock: undefined, live: false, error: '' })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let timer: number | undefined
    let stopped = false
    const byId = (items: StockItem[]) => Object.fromEntries(items.map((item) => [item.id, item]))

    const poll = () =>
      listStock(businessId, locationId).then(
        (items) => !stopped && setState({ key, stock: byId(items), live: false, error: '' }),
        (err: Error) => !stopped && setState((old) => ({ ...old, key, error: err.message })),
      )

    // Sellers may only read their own store, so the query must ask for exactly that location
    const atLocation = query(
      collection(db, 'businesses', businessId, 'inventory'),
      where('locationId', '==', locationId),
    )
    const unsubscribe = onSnapshot(
      atLocation,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as StockItem)
        setState({ key, stock: byId(items), live: true, error: '' })
      },
      () => {
        poll()
        timer = window.setInterval(poll, FALLBACK_REFRESH_MS)
      },
    )

    return () => {
      stopped = true
      unsubscribe()
      window.clearInterval(timer)
    }
  }, [businessId, locationId, key, version])

  const current = state.key === key
  return {
    stock: current ? state.stock : undefined,
    live: current && state.live,
    error: current ? state.error : '',
    /** Only needed without live updates, to show your own change right away */
    refresh: () => setVersion((v) => v + 1),
  }
}
