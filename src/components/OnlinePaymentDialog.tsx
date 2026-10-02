import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { cancelOnlinePayment, getOnlinePayment } from '../api/pos'
import type { OnlinePayment, Receipt } from '../api/types'
import { cx, ui } from '../styles'
import { formatMoney } from '../utils/format'
import { paymentLabel } from '../utils/labels'
import { ErrorBox, Modal } from './ui'

// While the QR code is shown, the till asks this often whether the customer has paid
const CHECK_EVERY_MS = 3000

type Props = {
  businessId: string
  payment: OnlinePayment
  onPaid: (receipt: Receipt) => void
  onClose: () => void
}

/**
 * The customer pays on their own phone: they scan the QR code (Xendit's payment page) and choose
 * GCash, Maya, their card, or their bank. When the money arrives, the sale is saved and the receipt shows.
 */
export default function OnlinePaymentDialog({ businessId, payment: started, onPaid, onClose }: Props) {
  const [payment, setPayment] = useState(started)
  const [qr, setQr] = useState('')
  const [error, setError] = useState('')
  const [canceling, setCanceling] = useState(false)
  const waiting = payment.status === 'PENDING'

  useEffect(() => {
    QRCode.toDataURL(started.paymentLinkUrl, { width: 280, margin: 1 }).then(setQr, () => setQr(''))
  }, [started.paymentLinkUrl])

  // Ask until it is paid, expired, or canceled
  useEffect(() => {
    if (!waiting) return
    const timer = window.setInterval(() => {
      getOnlinePayment(businessId, started.id).then(
        (latest) => {
          setError('')
          setPayment(latest)
        },
        (err: Error) => setError(err.message), // keep asking: it may be a short network problem
      )
    }, CHECK_EVERY_MS)
    return () => window.clearInterval(timer)
  }, [waiting, businessId, started.id])

  // Paid and saved: show the receipt
  useEffect(() => {
    if (payment.status === 'COMPLETED' && payment.receipt) onPaid(payment.receipt)
    // onPaid is only called once, when the receipt arrives
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payment.status, payment.receipt])

  async function cancel() {
    setCanceling(true)
    try {
      const latest = await cancelOnlinePayment(businessId, started.id)
      setPayment(latest) // if they had just paid, the receipt shows instead
      if (latest.status === 'CANCELED') onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCanceling(false)
    }
  }

  const amount = formatMoney(payment.total, payment.currency)
  const method = paymentLabel(payment.paymentMethod)

  return (
    <Modal title={`Pay ${amount} by ${method}`} onClose={waiting ? cancel : onClose}>
      <div className="flex flex-col items-center gap-3 text-center">
        <div>
          <h2 className={ui.h2}>
            {amount} · {method}
          </h2>
          {waiting && (
            <p className={ui.hint}>
              {payment.paymentMethod === 'CARD'
                ? 'The customer scans the code, or open the page on this device and let them enter their card.'
                : 'The customer scans the code with their phone camera and pays in their app.'}
            </p>
          )}
        </div>

        {waiting && (
          <>
            {qr ? (
              <img src={qr} alt="QR code of the payment page" className="size-70 rounded-lg bg-white p-2" />
            ) : (
              <div className="grid size-70 place-items-center rounded-lg bg-chip text-muted">Making the QR code…</div>
            )}
            <a href={payment.paymentLinkUrl} target="_blank" rel="noreferrer" className={ui.link}>
              Open the payment page on this device
            </a>
            <p className="flex items-center gap-2 font-semibold text-heading" role="status">
              <span className="size-3 animate-pulse rounded-full bg-warn" aria-hidden="true" />
              Waiting for the payment…
            </p>
          </>
        )}

        {payment.status === 'EXPIRED' && <p className={ui.alertWarn}>The payment page expired before it was paid. Charge again.</p>}
        {payment.status === 'CANCELED' && <p className={ui.alertInfo}>Payment canceled. Nothing was sold.</p>}
        {payment.status === 'PAID_NOT_SAVED' && <p className={ui.alertError}>{payment.error}</p>}
        {payment.status === 'COMPLETED' && <p className={ui.alertInfo}>Paid. Saving the sale…</p>}
        <ErrorBox message={error} />

        <div className="flex w-full gap-2.5">
          {waiting ? (
            <button type="button" className={cx(ui.btnGhost, 'flex-1 text-danger')} onClick={cancel} disabled={canceling}>
              {canceling ? 'Canceling…' : 'Cancel payment'}
            </button>
          ) : (
            <button type="button" className={cx(ui.btnPrimary, 'flex-1')} onClick={onClose} autoFocus>
              Close
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
