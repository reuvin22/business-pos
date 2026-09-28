import { createContext, useContext } from 'react'
import type { PosContext, PosLocation, StockItem } from './api/types'
import type { Cart } from './hooks/useCart'
import type { SellableItem } from './utils/items'

/** Everything the shop pages share. Provided by ShopLayout for one business and one store. */
export type Shop = {
  businessId: string
  context: PosContext
  currency: string
  location: PosLocation
  /** Products and variants that can be sold, with prices (undefined while loading) */
  items: SellableItem[] | undefined
  catalogError: string
  /** Live stock at this store, by stock id (undefined while loading) */
  stock: Record<string, StockItem> | undefined
  stockLive: boolean
  stockError: string
  refreshStock: () => void
  /** How many of an item can be sold right now (on hand minus reserved for orders) */
  available: (itemKey: string) => number
  cart: Cart
}

export const ShopContext = createContext<Shop | null>(null)

export function useShop(): Shop {
  const shop = useContext(ShopContext)
  if (!shop) throw new Error('useShop must be used inside ShopLayout')
  return shop
}
