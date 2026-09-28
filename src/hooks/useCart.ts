import { useEffect, useState } from 'react'

/** One line in the cart. Prices are not stored: they are worked out from the live catalog. */
export type CartLine = { key: string; quantity: number }

function readSaved(storageKey: string): CartLine[] {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

/**
 * The items being rung up. Kept in this browser, so a page reload does not lose the sale in progress.
 * `storageKey` should be different per business and store.
 */
export function useCart(storageKey: string) {
  const [lines, setLines] = useState<CartLine[]>(() => readSaved(storageKey))

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(lines))
    } catch {
      // Private mode or storage full: the cart still works, it is just not saved
    }
  }, [storageKey, lines])

  const setQuantity = (key: string, quantity: number) =>
    setLines((current) =>
      quantity <= 0
        ? current.filter((line) => line.key !== key)
        : current.map((line) => (line.key === key ? { ...line, quantity } : line)),
    )

  const add = (key: string, quantity = 1) =>
    setLines((current) =>
      current.some((line) => line.key === key)
        ? current.map((line) => (line.key === key ? { ...line, quantity: line.quantity + quantity } : line))
        : [...current, { key, quantity }],
    )

  return {
    lines,
    add,
    setQuantity,
    remove: (key: string) => setQuantity(key, 0),
    clear: () => setLines([]),
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
  }
}

export type Cart = ReturnType<typeof useCart>
