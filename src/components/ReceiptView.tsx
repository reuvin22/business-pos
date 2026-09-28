import type { Receipt } from '../api/types'
import { useShop } from '../shopContext'
import { cx } from '../styles'
import { formatDateTime, formatMoney } from '../utils/format'
import { paymentLabel } from '../utils/labels'

/** A receipt as the customer sees it (also what gets printed). */
export default function ReceiptView({ receipt }: { receipt: Receipt }) {
  const { context, currency } = useShop()
  const money = (value: number) => formatMoney(value, currency)
  const voided = receipt.status === 'VOIDED'
  const payment = paymentLabel(receipt.paymentMethod)

  return (
    <div className="relative flex flex-col gap-3 text-[0.92rem] text-heading print:text-black">
      <div className="text-center">
        <div className="text-[1.15rem] font-extrabold">{context.business.businessName}</div>
        <div className="text-muted print:text-black">{receipt.locationName}</div>
      </div>
      <div className="flex justify-between border-y border-dashed border-line py-2 text-[0.85rem] print:border-black">
        <span>No. {receipt.receiptNumber}</span>
        <span>{formatDateTime(receipt.createdAt)}</span>
      </div>

      <table className="w-full text-[0.9rem]">
        <tbody>
          {receipt.items.map((line) => (
            <tr key={`${line.productId}-${line.variantId}`} className="align-top">
              <td className="py-1 pr-2">
                {line.productName}
                {line.variantName && ` (${line.variantName})`}
                <div className="text-[0.8rem] text-muted print:text-black">
                  {line.quantity} {line.unit} × {money(line.unitPrice)}
                </div>
              </td>
              <td className="py-1 text-right tabular-nums">{money(line.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-col gap-1 border-t border-dashed border-line pt-2 tabular-nums print:border-black">
        <Row label="Total" value={money(receipt.total)} strong />
        <Row label={`Paid (${payment})`} value={money(receipt.amountPaid)} />
        {receipt.changeGiven > 0 && <Row label="Change" value={money(receipt.changeGiven)} />}
      </div>
      {receipt.note && <p className="text-[0.85rem]">Note: {receipt.note}</p>}
      <p className="text-center text-[0.8rem] text-muted print:text-black">Served by {receipt.sellerName}. Thank you!</p>

      {voided && (
        <div className="rounded-lg bg-danger-soft px-3 py-2 text-[0.85rem] text-danger">
          <strong>VOIDED</strong> {formatDateTime(receipt.voidedAt)} by {receipt.voidedByName}: {receipt.voidReason}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cx('flex justify-between', strong && 'text-[1.1rem] font-extrabold')}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
