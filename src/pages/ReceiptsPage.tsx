import { useState, type FormEvent } from 'react'
import { deleteReceipt, listReceipts, voidReceipt } from '../api/pos'
import type { Receipt } from '../api/types'
import ReceiptView from '../components/ReceiptView'
import { EmptyState, ErrorBox, Loading, Modal } from '../components/ui'
import { useLoad } from '../hooks/useLoad'
import { useShop } from '../shopContext'
import { cx, ui } from '../styles'
import { formatDateTime, formatMoney, todayText } from '../utils/format'
import { paymentLabel } from '../utils/labels'
import { useAuth } from '../useAuth'

// Sellers may void their own receipts for one day (the server checks this too)
const SELLER_VOID_WINDOW_MS = 24 * 60 * 60 * 1000

/** The receipts at this store for one day or all dates, with totals. Sellers see their own; managers see everyone's. */
export default function ReceiptsPage() {
  const shop = useShop()
  const [date, setDate] = useState(todayText())
  const [allDates, setAllDates] = useState(false)
  const [open, setOpen] = useState<Receipt | null>(null)
  const day = allDates ? '' : date // "" = all dates
  const receipts = useLoad(() => listReceipts(shop.businessId, day, shop.location.id), [shop.businessId, day, shop.location.id])

  const completed = (receipts.data ?? []).filter((r) => r.status === 'COMPLETED')
  const sum = (list: Receipt[]) => list.reduce((total, r) => total + r.total, 0)
  const money = (value: number) => formatMoney(value, shop.currency)

  return (
    <div className={ui.page}>
      <div className={ui.sectionHead}>
        <h1 className={ui.h1}>Receipts</h1>
        <div className="flex items-center gap-2">
          <select className={ui.inputAuto} value={allDates ? 'all' : 'day'} onChange={(e) => setAllDates(e.target.value === 'all')} aria-label="Dates">
            <option value="day">One day</option>
            <option value="all">All dates</option>
          </select>
          {!allDates && (
            <input className={ui.inputAuto} type="date" value={date} max={todayText()} onChange={(e) => setDate(e.target.value || todayText())} aria-label="Day" />
          )}
          <button type="button" className={ui.btnGhost} onClick={receipts.reload}>
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Sales" value={money(sum(completed))} />
        <Stat label="Receipts" value={String(completed.length)} />
        <Stat label="Cash" value={money(sum(completed.filter((r) => r.paymentMethod === 'CASH')))} />
        <Stat label="Other payments" value={money(sum(completed.filter((r) => r.paymentMethod !== 'CASH')))} />
      </div>

      <ErrorBox message={receipts.error} />
      {!receipts.data ? (
        <Loading />
      ) : receipts.data.length === 0 ? (
        <EmptyState text={allDates ? 'No receipts yet.' : 'No receipts on this day.'} />
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>{allDates ? 'Date' : 'Time'}</th>
                <th className={ui.th}>Receipt</th>
                <th className={ui.th}>Items</th>
                <th className={ui.th}>Payment</th>
                {shop.context.canVoidAny && <th className={ui.th}>Seller</th>}
                <th className={cx(ui.th, ui.num)}>Total</th>
              </tr>
            </thead>
            <tbody>
              {receipts.data.map((r) => (
                <tr key={r.id} className="cursor-pointer hover:bg-page" onClick={() => setOpen(r)}>
                  <td className={ui.td}>
                    {allDates ? formatDateTime(r.createdAt) : new Date(r.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </td>
                  <td className={cx(ui.td, 'font-semibold text-accent')}>
                    {r.receiptNumber}
                    {r.status === 'VOIDED' && <span className={cx(ui.badge, 'ml-2 bg-danger-soft text-danger')}>Voided</span>}
                  </td>
                  <td className={ui.td}>{r.items.reduce((n, line) => n + line.quantity, 0)}</td>
                  <td className={ui.td}>{paymentLabel(r.paymentMethod)}</td>
                  {shop.context.canVoidAny && <td className={ui.td}>{r.sellerName}</td>}
                  <td className={cx(ui.td, ui.num, 'font-semibold text-heading', r.status === 'VOIDED' && 'text-muted line-through')}>{money(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <ReceiptDialog
          receipt={open}
          onClose={() => setOpen(null)}
          onVoided={(voided) => {
            setOpen(voided)
            receipts.reload()
            shop.refreshStock()
          }}
          onDeleted={() => {
            setOpen(null)
            receipts.reload()
            shop.refreshStock()
          }}
        />
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={ui.card}>
      <div className={ui.hint}>{label}</div>
      <div className="text-[1.3rem] font-extrabold text-heading tabular-nums">{value}</div>
    </div>
  )
}

type DialogProps = { receipt: Receipt; onClose: () => void; onVoided: (r: Receipt) => void; onDeleted: () => void }

function ReceiptDialog({ receipt, onClose, onVoided, onDeleted }: DialogProps) {
  const shop = useShop()
  const { user } = useAuth()
  const [voiding, setVoiding] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const isMine = receipt.sellerUid === user?.uid
  // eslint-disable-next-line react-hooks/purity -- the dialog only needs "now" when it opens
  const recent = Date.now() - receipt.createdAt <= SELLER_VOID_WINDOW_MS
  const canVoid = receipt.status === 'COMPLETED' && (shop.context.canVoidAny || (isMine && recent))

  async function handleVoid(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      onVoided(await voidReceipt(shop.businessId, receipt.id, reason.trim()))
      setVoiding(false)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  async function handleDelete() {
    setError('')
    try {
      await deleteReceipt(shop.businessId, receipt.id)
      onDeleted()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <Modal title={`Receipt ${receipt.receiptNumber}`} onClose={onClose}>
      <ReceiptView receipt={receipt} />
      {voiding ? (
        <form className="mt-4 flex flex-col gap-2.5 print:hidden" onSubmit={handleVoid}>
          <label className={ui.label}>
            Why void it? The stock goes back on the shelf.
            <input className={ui.input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer returned it" autoFocus />
          </label>
          <ErrorBox message={error} />
          <div className="flex gap-2.5">
            <button type="button" className={cx(ui.btnGhost, 'flex-1')} onClick={() => setVoiding(false)}>
              Keep it
            </button>
            <button type="submit" className={cx(ui.btnDanger, 'flex-1')} disabled={!reason.trim()}>
              Void receipt
            </button>
          </div>
        </form>
      ) : deleting ? (
        <div className="mt-4 flex flex-col gap-2.5 print:hidden">
          <p className={ui.alertWarn}>
            Delete this receipt and its sales from the system?
            {receipt.status === 'COMPLETED' && ' The stock goes back on the shelf.'} This cannot be undone.
          </p>
          <ErrorBox message={error} />
          <div className="flex gap-2.5">
            <button type="button" className={cx(ui.btnGhost, 'flex-1')} onClick={() => setDeleting(false)}>
              Keep it
            </button>
            <button type="button" className={cx(ui.btnDanger, 'flex-1')} onClick={handleDelete}>
              Delete receipt
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2.5 print:hidden">
          {/* Managers only (the server checks too) */}
          {shop.context.canVoidAny && (
            <button type="button" className={cx(ui.btnGhost, 'text-danger')} onClick={() => setDeleting(true)}>
              Delete
            </button>
          )}
          {canVoid && (
            <button type="button" className={cx(ui.btnGhost, 'text-danger')} onClick={() => setVoiding(true)}>
              Void
            </button>
          )}
          <button type="button" className={cx(ui.btnGhost, 'flex-1')} onClick={() => window.print()}>
            Print
          </button>
          <button type="button" className={cx(ui.btnPrimary, 'flex-1')} onClick={onClose}>
            Close
          </button>
        </div>
      )}
    </Modal>
  )
}
