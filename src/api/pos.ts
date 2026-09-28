import { del, get, post, query } from './client'
import type { CheckoutIn, PosBusiness, PosContext, PosProduct, Receipt, StockItem, StockMovement } from './types'

const shop = (businessId: string) => `/businesses/${businessId}/pos`

/** Businesses you can sell for. */
export const listMyShops = () => get<PosBusiness[]>('/pos/businesses')
export const getContext = (businessId: string) => get<PosContext>(`${shop(businessId)}/context`)
export const getCatalog = (businessId: string, date: string) =>
  get<PosProduct[]>(`${shop(businessId)}/catalog${query({ date })}`)

// ---- Stock ----
/** Only used when live updates are not available (see hooks/useLiveStock.ts). */
export const listStock = (businessId: string, locationId: string) =>
  get<StockItem[]>(`${shop(businessId)}/stock${query({ location_id: locationId })}`)
export const listStockHistory = (businessId: string, locationId: string) =>
  get<StockMovement[]>(`${shop(businessId)}/stock-history${query({ location_id: locationId })}`)
/** + stock received, − stock taken out (needs a reason). */
export const changeStock = (
  businessId: string,
  body: { locationId: string; productId: string; variantId: string | null; change: number; note: string },
) => post<StockItem>(`${shop(businessId)}/stock-changes`, body)

// ---- Selling ----
export const checkout = (businessId: string, body: CheckoutIn) => post<Receipt>(`${shop(businessId)}/checkouts`, body)
export const listReceipts = (businessId: string, date: string, locationId: string) =>
  get<Receipt[]>(`${shop(businessId)}/receipts${query({ date, location_id: locationId })}`)
export const voidReceipt = (businessId: string, receiptId: string, reason: string) =>
  post<Receipt>(`${shop(businessId)}/receipts/${receiptId}/void`, { reason })
/** Managers only: removes the receipt and its sales for good (stock goes back unless it was voided). */
export const deleteReceipt = (businessId: string, receiptId: string) => del(`${shop(businessId)}/receipts/${receiptId}`)
