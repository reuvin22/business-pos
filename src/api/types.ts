// The shapes of the data the API sends (camelCase, like the backend's app/schemas/pos.py).

export type PosBusiness = {
  id: string
  businessName: string
  businessLogo: string
  currency: string
}

export type PosLocation = { id: string; locationName: string }

export type PosContext = {
  business: PosBusiness
  sellerName: string
  role: string
  /** Managers can void anyone's receipt; sellers only their own, within a day */
  canVoidAny: boolean
  /** May let a phone scanner register products */
  canManageProducts?: boolean
  /** A seller given a store sees only that one */
  locations: PosLocation[]
  /** True when e-wallet, card, and bank transfer are paid online through Xendit (a QR code at the till) */
  onlinePayments: boolean
  /** How the till looks (chosen in the main app, Team page): see utils/templates.ts */
  template: PosTemplate
  /** The business's own switches, when template is CUSTOM */
  custom: PosCustomTemplate | null
}

export type PosTemplate = 'DEFAULT' | 'GROCERY' | 'RESTAURANT' | 'COFFEE_SHOP' | 'CUSTOM'

/** A template the business made itself (main app, Team page): the same switches as utils/templates.ts */
export type PosCustomTemplate = {
  name: string
  layout: 'tiles' | 'list'
  photos: boolean
  categoryTabs: boolean
  variantButtons: boolean
  stock: 'always' | 'low'
  scanFirst: boolean
  orderTypes: ('DINE_IN' | 'TAKE_OUT' | 'DELIVERY')[]
  tableNumber: boolean
  customerName: boolean
}

export type PosPrice = {
  variantId: string | null
  price: number
  minimumQuantity: number
  maximumQuantity: number | null
}

export type PosVariant = { id: string; variantName: string; sku: string; barcode: string; unit: string }

export type PosProduct = {
  id: string
  productName: string
  sku: string
  barcode: string
  unit: string
  imageUrl: string
  categoryId: string | null
  categoryName: string
  variants: PosVariant[]
  prices: PosPrice[]
}

/** Stock of one product (or variant) at one location. */
export type StockItem = {
  id: string
  productId: string
  variantId: string | null
  locationId: string
  quantity: number
  reservedQuantity: number
  availableQuantity: number
  reorderLevel: number | null
  stockStatus: string
  createdAt: number
  updatedAt: number
}

/** One change to a quantity on hand (a line in the stock history). */
export type StockMovement = {
  id: string
  productName: string
  variantName: string
  movementType: string
  change: number
  quantityAfter: number
  note: string
  referenceLabel: string
  byName: string
  createdAt: number
}

export type ReceiptLine = {
  productId: string
  variantId: string | null
  productName: string
  variantName: string
  unit: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export type Receipt = {
  id: string
  receiptNumber: string
  date: string
  locationId: string
  locationName: string
  items: ReceiptLine[]
  total: number
  amountPaid: number
  changeGiven: number
  paymentMethod: string
  /** Online payments: Xendit's payment id */
  paymentReference?: string
  /** Restaurants and coffee shops */
  orderType?: string | null
  tableNumber?: string
  customerName?: string
  note: string
  status: 'COMPLETED' | 'VOIDED'
  sellerUid: string
  sellerName: string
  voidedAt: number | null
  voidedByName: string
  voidReason: string
  createdAt: number
}

export type CheckoutIn = {
  locationId: string
  items: { productId: string; variantId: string | null; quantity: number }[]
  paymentMethod: string
  /** null = exactly the total */
  amountPaid: number | null
  note: string
  /** The seller's local date, YYYY-MM-DD */
  date: string
  /** Restaurants and coffee shops (see utils/templates.ts) */
  orderType?: string | null
  tableNumber?: string
  customerName?: string
}

/** A cart being paid online (Xendit), from the QR code to the receipt. */
export type OnlinePayment = {
  id: string
  paymentMethod: string
  total: number
  currency: string
  /** PAID_NOT_SAVED: the customer paid but the sale could not be saved (see error) */
  status: 'PENDING' | 'COMPLETED' | 'PAID_NOT_SAVED' | 'EXPIRED' | 'CANCELED'
  /** The page the customer pays on (shown as a QR code) */
  paymentLinkUrl: string
  receipt: Receipt | null
  error: string
}

// ---- Phone scanner (the SIRIS Scanner app) ----

export type ScannerSession = {
  id: string
  locationId: string
  locationName: string
  tillDeviceId: string
  tillUid: string
  tillName: string
  active: boolean
  expiresAt: number
  scannerName: string
  pairedAt: number | null
  /** The till approved the phone (until then it can do nothing) */
  approved?: boolean
  allowRegister?: boolean
  lastScanAt: number | null
  createdAt: number
}

/** The till shows its own one-time pairing code: as a QR code (qrText: "SIRIS-SCAN:<code>") and as text. */
export type ScannerStarted = { session: ScannerSession; pairingCode: string; qrText: string; pairingExpiresAt: number }

/** One barcode the phone scanned: the item to put in the cart. */
export type ScanEvent = { id: string; barcode: string; itemKey: string; productName: string; scannedByName: string; createdAt: number }

