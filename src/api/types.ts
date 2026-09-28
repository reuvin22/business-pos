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
  /** A seller given a store sees only that one */
  locations: PosLocation[]
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
}
