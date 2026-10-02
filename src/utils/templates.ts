// How the selling app looks and what it asks, per kind of business. The business picks its template
// in the main app (Team page). Products, prices, stock, and receipts work the same in every template.
// To add a template: add it here (and to PosTemplate in the backend's app/schemas/enums.py).

import type { PosContext, PosTemplate } from '../api/types'

export type OrderType = 'DINE_IN' | 'TAKE_OUT' | 'DELIVERY'

export type TemplateConfig = {
  label: string
  /** tiles: big buttons (photo or name); list: compact rows, quick to scan through */
  layout: 'tiles' | 'list'
  /** Tiles show the product photo (otherwise big readable names, like a menu board) */
  photos: boolean
  /** Tabs with the product categories (a menu) */
  categoryTabs: boolean
  /** One tile per product, with a button per variant (e.g. sizes of a drink) */
  variantButtons: boolean
  /** Stock left on each product: always, or only when it runs low */
  stock: 'always' | 'low'
  /** After a scan or a tap, the search box is ready for the next barcode */
  scanFirst: boolean
  /** How the order is served (empty: not asked) */
  orderTypes: OrderType[]
  /** A table number is needed for dine-in */
  tableNumber: boolean
  /** The customer's name, to call them when the order is ready */
  customerName: boolean
  searchPlaceholder: string
}

export const TEMPLATES: Record<Exclude<PosTemplate, 'CUSTOM'>, TemplateConfig> = {
  DEFAULT: {
    label: 'Default (retail)',
    layout: 'tiles',
    photos: true,
    categoryTabs: false,
    variantButtons: false,
    stock: 'always',
    scanFirst: false,
    orderTypes: [],
    tableNumber: false,
    customerName: false,
    searchPlaceholder: 'Search or scan a barcode…',
  },
  GROCERY: {
    label: 'Grocery',
    layout: 'list',
    photos: false,
    categoryTabs: true,
    variantButtons: false,
    stock: 'always',
    scanFirst: true,
    orderTypes: [],
    tableNumber: false,
    customerName: false,
    searchPlaceholder: 'Scan a barcode or type a name…',
  },
  RESTAURANT: {
    label: 'Restaurant',
    layout: 'tiles',
    photos: false,
    categoryTabs: true,
    variantButtons: false,
    stock: 'low',
    scanFirst: false,
    orderTypes: ['DINE_IN', 'TAKE_OUT', 'DELIVERY'],
    tableNumber: true,
    customerName: false,
    searchPlaceholder: 'Search the menu…',
  },
  COFFEE_SHOP: {
    label: 'Coffee shop',
    layout: 'tiles',
    photos: true,
    categoryTabs: true,
    variantButtons: true,
    stock: 'low',
    scanFirst: false,
    orderTypes: ['DINE_IN', 'TAKE_OUT'],
    tableNumber: false,
    customerName: true,
    searchPlaceholder: 'Search the menu…',
  },
}

/** The till's settings: a built-in template, or the business's own (CUSTOM). */
export function templateOf(context: Pick<PosContext, 'template' | 'custom'>): TemplateConfig {
  const custom = context.custom
  if (context.template === 'CUSTOM' && custom) {
    return {
      ...custom,
      label: custom.name || 'My own',
      searchPlaceholder: custom.scanFirst ? 'Scan a barcode or type a name…' : 'Search or scan a barcode…',
    }
  }
  return TEMPLATES[context.template as Exclude<PosTemplate, 'CUSTOM'>] ?? TEMPLATES.DEFAULT
}

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  DINE_IN: 'Dine-in',
  TAKE_OUT: 'Take-out',
  DELIVERY: 'Delivery',
}

/** "Low" stock: shown in the templates that only show stock when it runs low */
export const LOW_STOCK = 5
