import { useState } from 'react'
import { checkout } from '../api/pos'
import type { Receipt } from '../api/types'
import { useShop } from '../shopContext'
import { cx, ui } from '../styles'
import { formatMoney, todayText } from '../utils/format'
import { roundMoney, unitPrice, type SellableItem } from '../utils/items'
import { PAYMENT_METHODS } from '../utils/labels'
import ReceiptView from './ReceiptView'
import { ErrorBox, Modal } from './ui'

type Line = {
  key: string
  quantity: number
  item: SellableItem | undefined // undefined = no longer for sale
  price: number | null
  total: number
  problem: string
}

/** The cart: quantities, total, payment, and the Charge button. */
export default function CartPanel() {
  const shop = useShop()
  const [method, setMethod] = useState('CASH')
  const [paidText, setPaidText] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [charging, setCharging] = useState(false)
  const [receipt, setReceipt] = useState<Receipt | null>(null)

  // Work out each line from the live catalog and stock, so prices and "only N left" are always current
  const lines: Line[] = shop.cart.lines.map(({ key, quantity }) => {
    const item = shop.items?.find((i) => i.key === key)
    const price = item ? unitPrice(item, quantity) : null
    const left = shop.available(key)
    const problem = !item
      ? 'No longer for sale'
      : price === null
        ? 'No price for this quantity'
        : quantity > left
          ? `Only ${left} left`
          : ''
    return { key, quantity, item, price, total: roundMoney((price ?? 0) * quantity), problem }
  })

  const total = roundMoney(lines.reduce((sum, line) => sum + line.total, 0))
  const isCash = method === 'CASH'
  const paid = isCash && paidText.trim() !== '' ? Number(paidText) : total
  const change = roundMoney(paid - total)
  const hasProblem = lines.some((line) => line.problem)
  const canCharge = lines.length > 0 && !hasProblem && !charging && paid >= total

  async function charge() {
    setError('')
    setCharging(true)
    try {
      const saved = await checkout(shop.businessId, {
        locationId: shop.location.id,
        items: lines.map((line) => ({ productId: line.item!.productId, variantId: line.item!.variantId, quantity: line.quantity })),
        paymentMethod: method,
        amountPaid: isCash && paidText.trim() !== '' ? paid : null,
        note: note.trim(),
        date: todayText(),
      })
      setReceipt(saved)
      shop.cart.clear()
      shop.refreshStock()
      setPaidText('')
      setNote('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCharging(false)
    }
  }

  // Quick cash buttons: exact, and the next round amounts above the total
  const quickCash = [...new Set([total, ...[100, 500, 1000].map((step) => Math.ceil(total / step) * step)])].filter((v) => v >= total && v > 0).slice(0, 4)

  return (
    <div className={cx(ui.card, 'flex flex-col gap-4 lg:max-h-full lg:overflow-y-auto')}>
      <div className="flex items-center justify-between">
        <h2 className={ui.h2}>Cart</h2>
        {lines.length > 0 && (
          <button type="button" className={ui.linkDanger} onClick={shop.cart.clear}>
            Clear
          </button>
        )}
      </div>

      {lines.length === 0 ? (
        <p className="py-6 text-center text-muted">Tap a product to add it.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {lines.map((line) => (
            <li key={line.key} className="flex flex-col gap-2 py-3 first:pt-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-heading">{line.item?.name ?? 'Removed product'}</div>
                  <div className="text-[0.85rem] text-muted">
                    {line.price !== null && `${formatMoney(line.price, shop.currency)} / ${line.item?.unit}`}
                  </div>
                </div>
                <div className="font-bold text-heading tabular-nums">{line.price === null ? '—' : formatMoney(line.total, shop.currency)}</div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className={ui.btnStep} aria-label="One less" onClick={() => shop.cart.setQuantity(line.key, line.quantity - 1)}>
                  −
                </button>
                <input
                  className={cx(ui.input, 'w-16 px-2 py-1.5 text-center tabular-nums')}
                  type="number"
                  min={1}
                  inputMode="numeric"
                  aria-label="Quantity"
                  value={line.quantity}
                  onChange={(e) => shop.cart.setQuantity(line.key, Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                />
                <button
                  type="button"
                  className={ui.btnStep}
                  aria-label="One more"
                  disabled={line.quantity >= shop.available(line.key)}
                  onClick={() => shop.cart.setQuantity(line.key, line.quantity + 1)}
                >
                  +
                </button>
                <button type="button" className={cx(ui.linkDanger, 'ml-auto')} onClick={() => shop.cart.remove(line.key)}>
                  Remove
                </button>
              </div>
              {line.problem && <p className="text-[0.85rem] font-semibold text-danger">{line.problem}</p>}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-baseline justify-between border-t border-line pt-3">
        <span className="font-semibold text-heading">Total</span>
        <span className="text-[1.6rem] font-extrabold text-heading tabular-nums">{formatMoney(total, shop.currency)}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {PAYMENT_METHODS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMethod(m.value)}
            className={cx(
              'cursor-pointer rounded-lg border px-3 py-2 text-[0.9rem] font-semibold',
              method === m.value ? 'border-accent bg-info-soft text-accent' : 'border-line bg-surface text-heading hover:border-muted',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {isCash && (
        <div className="flex flex-col gap-2">
          <label className={ui.label}>
            Cash received
            <input
              className={cx(ui.input, 'text-[1.1rem] tabular-nums')}
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              placeholder={formatMoney(total, shop.currency)}
              value={paidText}
              onChange={(e) => setPaidText(e.target.value)}
            />
          </label>
          {total > 0 && (
            <div className="flex flex-wrap gap-2">
              {quickCash.map((amount) => (
                <button key={amount} type="button" className={cx(ui.btnGhost, 'px-3 py-1.5')} onClick={() => setPaidText(String(amount))}>
                  {amount === total ? 'Exact' : formatMoney(amount, shop.currency, 0)}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-baseline justify-between">
            <span className="font-semibold text-heading">Change</span>
            <span className={cx('text-[1.2rem] font-bold tabular-nums', change < 0 ? 'text-danger' : 'text-heading')}>
              {change < 0 ? `${formatMoney(-change, shop.currency)} short` : formatMoney(change, shop.currency)}
            </span>
          </div>
        </div>
      )}

      <input className={ui.input} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <ErrorBox message={error} />
      <button type="button" className={ui.btnCharge} disabled={!canCharge} onClick={charge}>
        {charging ? 'Charging…' : `Charge ${formatMoney(total, shop.currency)}`}
      </button>

      {receipt && (
        <Modal title="Receipt" onClose={() => setReceipt(null)}>
          <ReceiptView receipt={receipt} />
          <div className="mt-4 flex gap-2.5 print:hidden">
            <button type="button" className={cx(ui.btnGhost, 'flex-1')} onClick={() => window.print()}>
              Print
            </button>
            <button type="button" className={cx(ui.btnPrimary, 'flex-1')} onClick={() => setReceipt(null)} autoFocus>
              New sale
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
