// Words shown for the codes the API uses.

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  E_WALLET: 'E-wallet',
  CARD: 'Card',
  BANK_TRANSFER: 'Bank transfer',
}

/** Paid online through Xendit (QR code at the till) when online payments are on */
export const ONLINE_METHODS = ['E_WALLET', 'CARD', 'BANK_TRANSFER']

/** The ways a customer can pay at the counter. Without online payments: cash, or an e-wallet the seller checks. */
export const paymentMethods = (online: boolean) =>
  (online ? ['CASH', ...ONLINE_METHODS] : ['CASH', 'E_WALLET']).map((value) => ({ value, label: PAYMENT_LABELS[value] }))

export const paymentLabel = (value: string) => PAYMENT_LABELS[value] ?? value

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
