import { signOut } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useParams } from 'react-router-dom'
import { getContext } from '../api/pos'
import type { PosContext, PosLocation } from '../api/types'
import PhoneScannerDialog from '../components/PhoneScannerDialog'
import { ErrorBox, LiveBadge, Loading } from '../components/ui'
import { auth } from '../firebase'
import { useCart } from '../hooks/useCart'
import { useCatalog } from '../hooks/useCatalog'
import { useLiveStock } from '../hooks/useLiveStock'
import { useLoad } from '../hooks/useLoad'
import { usePhoneScanner } from '../hooks/usePhoneScanner'
import { ShopContext, type Shop } from '../shopContext'
import { cx, ui } from '../styles'
import { initials } from '../utils/format'
import { stockId } from '../utils/items'
import ThemeSwitch from '../components/ThemeSwitch'

const savedStoreKey = (businessId: string) => `pos:store:${businessId}`

function readSavedStore(businessId: string): string {
  try {
    return localStorage.getItem(savedStoreKey(businessId)) ?? ''
  } catch {
    return ''
  }
}

/** Loads the business, then asks which store (location) you are at, if there is more than one. */
export default function ShopLayout() {
  const { businessId = '' } = useParams()
  const { data: context, error } = useLoad(() => getContext(businessId), [businessId])
  const [chosenId, setChosenId] = useState(() => readSavedStore(businessId))

  const choose = (id: string) => {
    setChosenId(id)
    try {
      localStorage.setItem(savedStoreKey(businessId), id)
    } catch {
      // not saved; they will be asked again next time
    }
  }

  if (!context) {
    return (
      <div className={ui.page}>
        <ErrorBox message={error} />
        {error ? (
          <Link to="/" className={ui.link}>
            ← Back
          </Link>
        ) : (
          <Loading />
        )}
      </div>
    )
  }

  const locations = context.locations
  const location = locations.length === 1 ? locations[0] : locations.find((l) => l.id === chosenId)

  if (locations.length === 0) {
    return (
      <div className={ui.page}>
        <p className={ui.alertWarn}>
          {context.business.businessName} has no locations yet. The owner adds them in the main app (Profile → Locations).
        </p>
      </div>
    )
  }
  if (!location) return <ChooseStore context={context} onChoose={choose} />

  // key: a different store starts fresh (its own stock and cart)
  return <Shop key={location.id} context={context} location={location} onChangeStore={locations.length > 1 ? () => choose('') : undefined} />
}

function ChooseStore({ context, onChoose }: { context: PosContext; onChoose: (id: string) => void }) {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-6">
      <h1 className={ui.h1}>Which store are you at?</h1>
      <p className={ui.hint}>{context.business.businessName}</p>
      {context.locations.map((l) => (
        <button key={l.id} type="button" className={cx(ui.card, 'cursor-pointer text-left text-[1.05rem] font-semibold text-heading hover:border-muted')} onClick={() => onChoose(l.id)}>
          {l.locationName}
        </button>
      ))}
    </div>
  )
}

function Shop({ context, location, onChangeStore }: { context: PosContext; location: PosLocation; onChangeStore?: () => void }) {
  const businessId = context.business.id
  const catalog = useCatalog(businessId)
  const live = useLiveStock(businessId, location.id)
  const cart = useCart(`pos:cart:${businessId}:${location.id}`)
  const available = (itemKey: string) => live.stock?.[stockId(itemKey, location.id)]?.availableQuantity ?? 0

  // A phone (SIRIS Scanner) paired with this till: each product it scans goes into the cart (not sold until Charge)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [scanNotice, setScanNotice] = useState<{ text: string; ok: boolean; id: string } | null>(null)
  const scanner = usePhoneScanner(businessId, location.id, (scan) => {
    const items = catalog.items ?? []
    const item = items.find((i) => i.key === scan.itemKey) ?? items.find((i) => i.barcodes.includes(scan.barcode))
    if (!item) {
      setScanNotice({ id: scan.id, ok: false, text: `${scan.productName} was scanned, but it is not in this till's list yet. Reload the page.` })
      return
    }
    const inCart = cart.lines.find((line) => line.key === item.key)?.quantity ?? 0
    if (inCart + 1 > available(item.key)) {
      setScanNotice({ id: scan.id, ok: false, text: `No more ${item.name} in stock here.` })
      return
    }
    cart.add(item.key)
    setScanNotice({ id: scan.id, ok: true, text: `Added ${item.name}` })
  })
  // A phone scanned this till's QR code: ask the cashier right away (it can do nothing until allowed)
  const waitingFor = scanner.waitingName
  const [askedFor, setAskedFor] = useState('')
  if (waitingFor && askedFor !== waitingFor) {
    setAskedFor(waitingFor)
    setScannerOpen(true)
  }
  useEffect(() => {
    if (!scanNotice) return
    const timer = window.setTimeout(() => setScanNotice(null), 3500)
    return () => window.clearTimeout(timer)
  }, [scanNotice])

  const shop: Shop = {
    businessId,
    context,
    currency: context.business.currency,
    location,
    items: catalog.items,
    catalogError: catalog.error,
    stock: live.stock,
    stockLive: live.live,
    stockError: live.error,
    refreshStock: live.refresh,
    available,
    cart,
  }

  const tab = ({ isActive }: { isActive: boolean }) =>
    cx(
      'rounded-lg px-3.5 py-2 text-[0.92rem] font-semibold no-underline',
      isActive ? 'bg-side-active text-side-heading' : 'text-side-text hover:bg-side-hover',
    )

  return (
    <ShopContext.Provider value={shop}>
      {/* The receipt dialog is printed on its own, so the app hides itself when printing */}
      <div className="flex min-h-screen flex-col print:hidden">
        <header className="sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 bg-side px-4 py-2.5 text-side-text">
          <div className="flex min-w-0 items-center gap-2.5">
            {context.business.businessLogo ? (
              <img src={context.business.businessLogo} alt="" className="size-8 rounded-md object-cover" />
            ) : (
              <span className="grid size-8 place-items-center rounded-md bg-lime font-bold text-ink">{initials(context.business.businessName)}</span>
            )}
            <div className="min-w-0 leading-tight">
              <div className="truncate font-bold text-side-heading">{context.business.businessName}</div>
              <div className="truncate text-[0.8rem]">
                {location.locationName}
                {onChangeStore && (
                  <button type="button" className="ml-2 cursor-pointer text-lime hover:underline" onClick={onChangeStore}>
                    change
                  </button>
                )}
              </div>
            </div>
          </div>
          <nav className="flex gap-1 max-sm:order-last max-sm:w-full">
            <NavLink to="" end className={tab}>
              Sell
            </NavLink>
            <NavLink to="stock" className={tab}>
              Stock
            </NavLink>
            <NavLink to="receipts" className={tab}>
              Receipts
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-[0.85rem]">
            <button
              type="button"
              className={cx(
                'flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 font-semibold',
                scanner.scannerName ? 'border-lime bg-lime text-ink' : 'border-side-text/40 text-side-heading hover:border-lime',
              )}
              onClick={() => setScannerOpen(true)}
              title="Use a phone as a barcode scanner for this till"
            >
              {scanner.scannerName && <span className="size-1.5 animate-pulse rounded-full bg-ink" />}
              {scanner.waitingName ? 'Approve phone?' : scanner.scannerName ? `Scanner: ${scanner.scannerName}` : 'Phone scanner'}
            </button>
            {live.stock && <LiveBadge live={live.live} />}
            <ThemeSwitch />
            <Link to="/account" className="font-semibold text-side-heading no-underline hover:underline" title="Your account">
              {context.sellerName}
            </Link>
            <button type="button" className="cursor-pointer hover:text-side-heading hover:underline" onClick={() => signOut(auth)}>
              Sign out
            </button>
          </div>
        </header>
        <Outlet />
      </div>
      {scannerOpen && (
        <PhoneScannerDialog scanner={scanner} canManageProducts={!!context.canManageProducts} onClose={() => setScannerOpen(false)} />
      )}
      {scanNotice && (
        <div
          role="status"
          className={cx(
            'fixed right-4 bottom-4 z-40 max-w-sm rounded-xl px-4 py-3 text-[0.95rem] font-semibold shadow-lg print:hidden',
            scanNotice.ok ? 'bg-side text-side-heading' : 'bg-danger text-white',
          )}
        >
          {scanNotice.ok ? '📱 ' : ''}
          {scanNotice.text}
        </div>
      )}
    </ShopContext.Provider>
  )
}
