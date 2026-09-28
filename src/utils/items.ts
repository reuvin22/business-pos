// What the counter sells, and how much it costs. Plain functions, no React.
import type { PosPrice, PosProduct } from '../api/types'

/** One thing a seller can tap: a product, or one variant of it. */
export type SellableItem = {
  key: string // productId + variantId: unique per thing sold
  productId: string
  variantId: string | null
  name: string // "Cola 1.5L (Original)"
  unit: string
  imageUrl: string
  searchText: string // name, SKU, and barcode, lowercase
  barcodes: string[]
  tiers: PosPrice[] // the price tiers that apply to this item
}

/** Products with variants become one item per variant; others are one item. */
export function toSellableItems(products: PosProduct[]): SellableItem[] {
  return products.flatMap((product) => {
    if (product.variants.length === 0) {
      return [makeItem(product, null)]
    }
    return product.variants.map((variant) => makeItem(product, variant))
  })
}

function makeItem(product: PosProduct, variant: PosProduct['variants'][number] | null): SellableItem {
  // A variant's own tiers win; without them, the product-wide tiers are used (same rule as the server)
  const variantTiers = variant ? product.prices.filter((p) => p.variantId === variant.id) : []
  const tiers = variantTiers.length > 0 ? variantTiers : product.prices.filter((p) => p.variantId === null)
  const name = variant ? `${product.productName} (${variant.variantName})` : product.productName
  const barcodes = [product.barcode, product.sku, variant?.barcode, variant?.sku].filter((code): code is string => !!code)
  return {
    key: stockKey(product.id, variant?.id ?? null),
    productId: product.id,
    variantId: variant?.id ?? null,
    name,
    unit: variant?.unit || product.unit,
    imageUrl: product.imageUrl,
    searchText: [name, ...barcodes].join(' ').toLowerCase(),
    barcodes,
    tiers,
  }
}

/** The part of a stock record's id that names the product (see inventory_id in the backend). */
export const stockKey = (productId: string, variantId: string | null) => `${productId}__${variantId ?? 'base'}`

/** The stock record's id at one location. */
export const stockId = (itemKey: string, locationId: string) => `${itemKey}__${locationId}`

/**
 * The price per unit when buying `quantity` (same rule as counter_unit_price in the backend):
 * the lowest tier that fits wins; buying more than the biggest tier's "to quantity" keeps that
 * tier's price. null only when the quantity is below every tier (or there are no prices).
 */
export function unitPrice(item: SellableItem, quantity: number): number | null {
  const fitting = item.tiers
    .filter((t) => t.minimumQuantity <= quantity && (t.maximumQuantity === null || quantity <= t.maximumQuantity))
    .map((t) => t.price)
  if (fitting.length > 0) return Math.min(...fitting)

  const started = item.tiers.filter((t) => t.minimumQuantity <= quantity)
  if (started.length === 0) return null
  const biggest = Math.max(...started.map((t) => t.minimumQuantity))
  return Math.min(...started.filter((t) => t.minimumQuantity === biggest).map((t) => t.price))
}

/** The price shown on the item's button: the price for one, or else the cheapest tier ("from"). */
export function displayPrice(item: SellableItem): { price: number; from: boolean } | null {
  const single = unitPrice(item, 1)
  if (single !== null) return { price: single, from: false }
  if (item.tiers.length === 0) return null
  return { price: Math.min(...item.tiers.map((t) => t.price)), from: true }
}

/** Money is rounded to cents, like the server does. */
export const roundMoney = (value: number) => Math.round(value * 100) / 100
