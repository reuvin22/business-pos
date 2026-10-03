import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import type { PhoneScanner } from '../hooks/usePhoneScanner'
import { cx, ui } from '../styles'
import { ErrorBox, Modal } from './ui'

/** "ABCD2345" -> "ABCD-2345": easier to read out and type */
const showCode = (code: string) => code.replace(/(.{4})(?=.)/g, '$1-')

/**
 * Connect a phone (the SIRIS Scanner app) to this till: it scans the QR code shown here. Then every barcode the
 * phone scans goes into this cart. Nothing is sold until you press Charge.
 */
export default function PhoneScannerDialog({ scanner, onClose }: { scanner: PhoneScanner; onClose: () => void }) {
  const [qr, setQr] = useState('')
  const [busy, setBusy] = useState(false)
  const code = scanner.started?.pairingCode ?? ''
  const qrText = scanner.started?.qrText ?? ''
  const connected = !!scanner.scannerName

  // Drawn here, in this browser: the code never goes to any other service
  useEffect(() => {
    if (!qrText) return
    QRCode.toDataURL(qrText, { width: 260, margin: 1, errorCorrectionLevel: 'M' }).then(setQr, () => setQr(''))
  }, [qrText])

  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Phone scanner" onClose={onClose}>
      <div className="flex flex-col gap-3.5">
        <div>
          <h2 className={ui.h2}>Phone scanner</h2>
          <p className={cx(ui.hint, 'm-0')}>
            Use a phone as a barcode scanner for this till: every product it scans appears in this cart right away. Nothing is
            sold until you press Charge.
          </p>
        </div>

        {connected ? (
          <div className="flex flex-col gap-2 rounded-lg bg-info-soft px-4 py-3 text-heading">
            <strong>Connected: {scanner.scannerName}</strong>
            <span className="text-[0.88rem]">Scan products with the phone. To stop, disconnect here or on the phone.</span>
          </div>
        ) : scanner.started && !scanner.ended ? (
          <div className="flex flex-col items-center gap-2 text-center">
            {qr ? <img src={qr} alt="QR code to connect the phone" className="size-[260px] rounded-lg bg-white p-2" /> : <div className="size-[260px]" />}
            <p className="m-0 text-[0.92rem] text-heading">
              On the phone, open <strong>SIRIS Scanner</strong> and scan this code. No sign-in needed.
            </p>
            <p className="m-0 text-[0.85rem] text-muted">
              Or type the code: <strong className="font-mono text-[1.1rem] tracking-widest text-heading">{showCode(code)}</strong>
            </p>
            <p className="m-0 text-[0.8rem] text-muted">
              This code belongs to this till only. It works once, for 10 minutes. Waiting for the phone…
            </p>
          </div>
        ) : (
          <p className={cx(ui.hint, 'm-0')}>
            {scanner.ended ? 'The phone disconnected (or the session ended). ' : ''}Start to show a QR code for the phone to scan.
          </p>
        )}

        <ErrorBox message={scanner.error} />

        <div className="flex flex-wrap justify-end gap-2">
          {scanner.started && (
            <button type="button" className={ui.btnGhost} disabled={busy} onClick={() => run(scanner.stop)}>
              Disconnect
            </button>
          )}
          {!connected && (
            <button type="button" className={ui.btnPrimary} disabled={busy} onClick={() => run(scanner.start)}>
              {busy ? 'Please wait…' : scanner.started ? 'New code' : 'Connect a phone'}
            </button>
          )}
          <button type="button" className={ui.btnGhost} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
