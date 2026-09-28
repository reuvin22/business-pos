// Words shown for the codes the API uses.

export const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'E_WALLET', label: 'E-wallet' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer' },
]

export const paymentLabel = (value: string) => PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value

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
