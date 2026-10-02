// Words shown for the codes the API uses.

/** The ways a customer can pay at the counter. */
export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'E_WALLET', label: 'E-wallet' },
]

// No longer offered, but older receipts may still show them
const OLD_PAYMENT_LABELS: Record<string, string> = { CARD: 'Card', BANK_TRANSFER: 'Bank transfer' }

export const paymentLabel = (value: string) =>
  PAYMENT_METHODS.find((m) => m.value === value)?.label ?? OLD_PAYMENT_LABELS[value] ?? value

const MOVEMENT_TYPES: Record<string, string> = {
  STOCK_ADDED: 'Stock added',
  ADJUSTMENT: 'Stock in / out',
  CORRECTION: 'Count correction',
  SALE: 'Sale',
  SALE_UNDONE: 'Sale voided',
  ORDER_SHIPPED: 'Order shipped',
  RECORD_REMOVED: 'Record removed',
}

export const movementLabel = (value: string) => MOVEMENT_TYPES[value] ?? value
