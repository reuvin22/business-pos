import { useState, type FormEvent } from 'react'
import CartPanel from '../components/CartPanel'
import { EmptyState, ErrorBox, Loading } from '../components/ui'
import { useShop } from '../shopContext'
import { cx, ui } from '../styles'
import { formatMoney, formatNumber, initials } from '../utils/format'
import { displayPrice, type SellableItem } from '../utils/items'

/** Tap products to add them to the cart, then charge. Stock numbers update live. */
export default function SellPage() {
  const shop = useShop()
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')

  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const shown = (shop.items ?? []).filter((item) => words.every((word) => item.searchText.includes(word)))

  // A barcode scanner types the code and presses Enter
  function handleSearch(e: FormEvent) {
    e.preventDefault()
    const code = search.trim()
    const exact = shop.items?.find((item) => item.barcodes.includes(code))
    const target = exact ?? (shown.length === 1 ? shown[0] : undefined)
    if (target) {
      addToCart(target)
      setSearch('')
    }
  }

  function addToCart(item: SellableItem) {
    const inCart = shop.cart.lines.find((line) => line.key === item.key)?.quantity ?? 0
    if (inCart + 1 > shop.available(item.key)) {
      setMessage(`No more ${item.name} in stock here.`)
      return
    }
    setMessage('')
    shop.cart.add(item.key)
  }

  return (
    <div className="mx-auto grid w-full max-w-[1500px] flex-1 grid-cols-1 gap-5 p-5 max-sm:p-3 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="flex min-w-0 flex-col gap-3.5">
        <form onSubmit={handleSearch}>
          <input
            className={cx(ui.input, 'py-3 text-[1rem]')}
            type="search"
            placeholder="Search or scan a barcode…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </form>
        <ErrorBox message={shop.catalogError || shop.stockError} />
        {message && <p className={ui.alertWarn}>{message}</p>}
        {!shop.items || !shop.stock ? (
          <Loading />
        ) : shop.items.length === 0 ? (
          <EmptyState text="No products for sale yet. The business adds them in the main app." />
        ) : shown.length === 0 ? (
          <EmptyState text={`Nothing matches "${search}".`} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {shown.map((item) => (
              <ItemButton key={item.key} item={item} onAdd={() => addToCart(item)} />
            ))}
          </div>
        )}
      </section>

      <aside id="cart" className="lg:sticky lg:top-[72px] lg:max-h-[calc(100vh-90px)] lg:self-start">
        <CartPanel />
      </aside>

      {/* Phones: the cart is below the products, so show the total at the bottom of the screen */}
      {shop.cart.count > 0 && (
        <a
          href="#cart"
          className="sticky bottom-3 z-10 flex items-center justify-between rounded-xl bg-side px-4 py-3 font-semibold text-side-heading no-underline shadow-lg lg:hidden"
        >
          <span>
            Cart · {shop.cart.count} {shop.cart.count === 1 ? 'item' : 'items'}
          </span>
          <span>View ↓</span>
        </a>
      )}
    </div>
  )
}

function ItemButton({ item, onAdd }: { item: SellableItem; onAdd: () => void }) {
  const { available, cart, currency } = useShop()
  const left = available(item.key)
  const inCart = cart.lines.find((line) => line.key === item.key)?.quantity ?? 0
  const price = displayPrice(item)
  const soldOut = left <= 0
  const canAdd = !soldOut && price !== null && inCart < left

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={!canAdd}
      className={cx(
        'relative flex cursor-pointer flex-col overflow-hidden rounded-[10px] border border-line bg-surface text-left transition-colors hover:enabled:border-accent disabled:cursor-not-allowed',
        soldOut && 'opacity-55',
      )}
    >
      {item.imageUrl ? (
        <img src={item.imageUrl} alt="" loading="lazy" className="aspect-[4/3] w-full bg-chip object-cover" />
      ) : (
        <span className="grid aspect-[4/3] w-full place-items-center bg-chip text-[1.6rem] font-bold text-muted">{initials(item.name)}</span>
      )}
      {inCart > 0 && (
        <span className="absolute top-2 right-2 grid min-w-7 place-items-center rounded-full bg-lime px-1.5 py-0.5 text-[0.85rem] font-bold text-ink">
          {inCart}
        </span>
      )}
      <span className="flex flex-1 flex-col gap-1 p-3">
        <span className="line-clamp-2 leading-snug font-semibold text-heading">{item.name}</span>
        <span className="mt-auto flex items-end justify-between gap-2">
          <span className="font-bold text-heading tabular-nums">
            {price ? `${price.from ? 'from ' : ''}${formatMoney(price.price, currency)}` : <span className="text-danger">No price</span>}
          </span>
          <span className={cx('text-[0.8rem] font-semibold tabular-nums', soldOut ? 'text-danger' : left <= 5 ? 'text-warn' : 'text-muted')}>
            {soldOut ? 'Sold out' : `${formatNumber(left)} left`}
          </span>
        </span>
      </span>
    </button>
  )
}
