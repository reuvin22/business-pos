import { collection, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { getCatalog } from '../api/pos'
import { db } from '../firebase'
import { todayText } from '../utils/format'
import { toSellableItems, type SellableItem } from '../utils/items'

// Without live updates, the product list is refreshed this often
const FALLBACK_REFRESH_MS = 60_000

type CatalogState = { businessId: string; items: SellableItem[] | undefined; error: string }

/**
 * What the counter can sell, with prices. Reloads by itself when the business changes a product
 * in the main app (new product, new price, product archived...).
 */
export function useCatalog(businessId: string) {
  const [state, setState] = useState<CatalogState>({ businessId, items: undefined, error: '' })

  useEffect(() => {
    let stopped = false
    let timer: number | undefined
    let debounce: number | undefined

    const load = () =>
      getCatalog(businessId, todayText()).then(
        (products) => !stopped && setState({ businessId, items: toSellableItems(products), error: '' }),
        (err: Error) => !stopped && setState((old) => ({ ...old, businessId, error: err.message })),
      )

    load()
    // Listen to the products: when one changes, load the catalog again (prices come with it).
    // Saving several products at once fires several changes, so wait a moment before loading.
    let first = true
    const unsubscribe = onSnapshot(
      collection(db, 'businesses', businessId, 'products'),
      () => {
        if (first) {
          first = false // the first snapshot is just the current products; already loaded above
          return
        }
        window.clearTimeout(debounce)
        debounce = window.setTimeout(load, 500)
      },
      () => {
        timer = window.setInterval(load, FALLBACK_REFRESH_MS)
      },
    )

    return () => {
      stopped = true
      unsubscribe()
      window.clearInterval(timer)
      window.clearTimeout(debounce)
    }
  }, [businessId])

  const current = state.businessId === businessId
  return { items: current ? state.items : undefined, error: current ? state.error : '' }
}
