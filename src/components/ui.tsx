import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx, ui } from '../styles'

export function Loading({ text = 'Loading…' }: { text?: string }) {
  return <p className="py-6 text-center text-muted">{text}</p>
}

export function ErrorBox({ message }: { message?: string }) {
  return message ? <p className={ui.alertError}>{message}</p> : null
}

export function EmptyState({ text }: { text: string }) {
  return <p className="rounded-[10px] border border-dashed border-line px-4 py-8 text-center text-muted">{text}</p>
}

/** Shows whether the numbers update by themselves. */
export function LiveBadge({ live }: { live: boolean }) {
  return live ? (
    <span className={cx(ui.badge, 'bg-info-soft text-info')} title="Stock updates by itself">
      <span className="size-1.5 animate-pulse rounded-full bg-info" />
      Live
    </span>
  ) : (
    <span className={cx(ui.badge, 'bg-warn-soft text-warn')} title="Live updates are off; refreshing every few seconds">
      Refreshing
    </span>
  )
}

/**
 * A dialog over the page. It is drawn at the end of <body> (a "portal"), so when printing
 * (the app itself is print:hidden) only the dialog is printed, e.g. a receipt.
 */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4 print:static print:block print:bg-transparent print:p-0"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={title}
        className="w-full max-w-md rounded-[12px] bg-surface p-5 shadow-xl print:max-w-none print:rounded-none print:p-0 print:shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
