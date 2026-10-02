import { del, get, post, query } from './client'
import type { CheckoutIn, OnlinePayment, PosBusiness, PosContext, PosProduct, Receipt, StockItem, StockMovement } from './types'

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

// ---- Selling ----
export const checkout = (businessId: string, body: CheckoutIn) => post<Receipt>(`${shop(businessId)}/checkouts`, body)
/** From one day to another ("2026-10-01", "2026-10-15"; both included). Both "" = all dates (the newest 500). */
export const listReceipts = (businessId: string, from: string, to: string, locationId: string) =>
  get<Receipt[]>(`${shop(businessId)}/receipts${query({ date_from: from, date_to: to, location_id: locationId })}`)
export const voidReceipt = (businessId: string, receiptId: string, reason: string) =>
  post<Receipt>(`${shop(businessId)}/receipts/${receiptId}/void`, { reason })
/** Managers only: removes the receipt and its sales for good (stock goes back unless it was voided). */
export const deleteReceipt = (businessId: string, receiptId: string) => del(`${shop(businessId)}/receipts/${receiptId}`)

// ---- Online payments (Xendit: e-wallet, card, bank transfer) ----
/** Makes a payment page for the cart. Nothing is sold until the customer pays. */
export const startOnlinePayment = (businessId: string, body: CheckoutIn) =>
  post<OnlinePayment>(`${shop(businessId)}/payments`, body)
/** Ask every few seconds: once paid, the sale is saved and the receipt comes with it. */
export const getOnlinePayment = (businessId: string, paymentId: string) =>
  get<OnlinePayment>(`${shop(businessId)}/payments/${paymentId}`)
export const cancelOnlinePayment = (businessId: string, paymentId: string) =>
  post<OnlinePayment>(`${shop(businessId)}/payments/${paymentId}/cancel`)

