import { useRef, useState, type FormEvent } from 'react'
import CartPanel from '../components/CartPanel'
import { EmptyState, ErrorBox, Loading } from '../components/ui'
import { useShop } from '../shopContext'
import { cx, ui } from '../styles'
import { formatMoney, formatNumber, initials } from '../utils/format'
import { displayPrice, type SellableItem } from '../utils/items'
import { LOW_STOCK, templateOf, type TemplateConfig } from '../utils/templates'

const ALL = '' // the "All" category tab
const NO_CATEGORY = 'Other'

/**
 * Tap products to add them to the cart, then charge. Stock numbers update live.
 * How it looks depends on the business's template (see utils/templates.ts).
 */
export default function SellPage() {
  const shop = useShop()
  const template = templateOf(shop.context)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(ALL)
  const [message, setMessage] = useState('')
  const searchBox = useRef<HTMLInputElement>(null)

  const items = shop.items ?? []
  const categories = [...new Set(items.map((item) => item.categoryName || NO_CATEGORY))].sort((a, b) =>
    a === NO_CATEGORY ? 1 : b === NO_CATEGORY ? -1 : a.localeCompare(b),
  )
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const shown = items.filter(
    (item) =>
      words.every((word) => item.searchText.includes(word)) &&
      (!template.categoryTabs || category === ALL || (item.categoryName || NO_CATEGORY) === category),
  )

  // A barcode scanner types the code and presses Enter
  function handleSearch(e: FormEvent) {
    e.preventDefault()
    const code = search.trim()
    const exact = items.find((item) => item.barcodes.includes(code))
    const target = exact ?? (shown.length === 1 ? shown[0] : undefined)
    if (target) {
      addOne(target)
      setSearch('')
    }
  }

  /** One more in the cart (a scan, a size button, a row in the list). */
  function addOne(item: SellableItem) {
    const inCart = shop.cart.lines.find((line) => line.key === item.key)?.quantity ?? 0
    if (inCart + 1 > shop.available(item.key)) {
      setMessage(`No more ${item.name} in stock here.`)
      return
    }
    setMessage('')
    if (inCart > 0) shop.cart.setQuantity(item.key, inCart + 1)
    else shop.cart.add(item.key)
    if (template.scanFirst) searchBox.current?.focus() // ready for the next barcode
  }

  /** Tapping a tile selects it (1 in the cart) or unselects it. Quantities are changed in the cart. */
  function toggleItem(item: SellableItem) {
    setMessage('')
    if (shop.cart.lines.some((line) => line.key === item.key)) shop.cart.remove(item.key)
    else addOne(item)
  }

  return (
    <div className="mx-auto grid w-full max-w-[1500px] flex-1 grid-cols-1 gap-5 p-5 max-sm:p-3 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="flex min-w-0 flex-col gap-3.5">
        <form onSubmit={handleSearch}>
          <input
            ref={searchBox}
            className={cx(ui.input, 'py-3 text-[1rem]')}
            type="search"
            placeholder={template.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </form>

        {template.categoryTabs && categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Categories">
            {[ALL, ...categories].map((name) => (
              <button
                key={name || 'all'}
                type="button"
                role="tab"
                aria-selected={category === name}
                onClick={() => setCategory(name)}
                className={cx(
                  'shrink-0 cursor-pointer rounded-full border px-4 py-2 text-[0.92rem] font-semibold whitespace-nowrap',
                  category === name ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-heading hover:border-muted',
                )}
              >
                {name || 'All'}
              </button>
            ))}
          </div>
        )}

        <ErrorBox message={shop.catalogError || shop.stockError} />
        {message && <p className={ui.alertWarn}>{message}</p>}
        {!shop.items || !shop.stock ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyState text="No products for sale yet. The business adds them in the main app." />
        ) : shown.length === 0 ? (
          <EmptyState text={search ? `Nothing matches "${search}".` : 'Nothing in this category.'} />
        ) : template.layout === 'list' ? (
          <div className="flex flex-col divide-y divide-line overflow-hidden rounded-[10px] border border-line bg-surface">
            {shown.map((item) => (
              <ItemRow key={item.key} item={item} template={template} onAdd={() => addOne(item)} />
            ))}
          </div>
        ) : template.variantButtons ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {groupByProduct(shown).map((variants) => (
              <ProductCard key={variants[0].productId} variants={variants} template={template} onAdd={addOne} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {shown.map((item) => (
              <ItemButton key={item.key} item={item} template={template} onToggle={() => toggleItem(item)} />
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

/** The variants of each product together, in the order they were shown. */
function groupByProduct(items: SellableItem[]): SellableItem[][] {
  const groups = new Map<string, SellableItem[]>()
  for (const item of items) groups.set(item.productId, [...(groups.get(item.productId) ?? []), item])
  return [...groups.values()]
}

/** "12 left" / "Sold out", or nothing when the template only shows stock that runs low. */
function StockLeft({ left, template }: { left: number; template: TemplateConfig }) {
  if (template.stock === 'low' && left > LOW_STOCK) return null
  return (
    <span className={cx('text-[0.8rem] font-semibold tabular-nums', left <= 0 ? 'text-danger' : left <= LOW_STOCK ? 'text-warn' : 'text-muted')}>
      {left <= 0 ? 'Sold out' : `${formatNumber(left)} left`}
    </span>
  )
}

function PriceText({ item }: { item: SellableItem }) {
  const { currency } = useShop()
  const price = displayPrice(item)
  return price ? <>{`${price.from ? 'from ' : ''}${formatMoney(price.price, currency)}`}</> : <span className="text-danger">No price</span>
}

function InCartBadge({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-lime px-2 py-0.5 text-[0.85rem] font-bold text-ink">
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={3} aria-hidden>
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {count}
    </span>
  )
}

/** Default, Restaurant: a tile per product (or variant). With photos, or a big name like a menu board. */
function ItemButton({ item, template, onToggle }: { item: SellableItem; template: TemplateConfig; onToggle: () => void }) {
  const { available, cart } = useShop()
  const left = available(item.key)
  const inCart = cart.lines.find((line) => line.key === item.key)?.quantity ?? 0
  const selected = inCart > 0
  const soldOut = left <= 0
  // A selected product can always be unselected; a new one needs stock and a price
  const canTap = selected || (!soldOut && displayPrice(item) !== null)

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!canTap}
      aria-pressed={selected}
      title={selected ? 'Tap to remove from the cart' : 'Tap to add to the cart'}
      className={cx(
        'relative flex cursor-pointer flex-col overflow-hidden rounded-[10px] border bg-surface text-left transition-colors disabled:cursor-not-allowed',
        selected ? 'border-accent ring-2 ring-accent' : 'border-line hover:enabled:border-accent',
        soldOut && !selected && 'opacity-55',
      )}
    >
      {template.photos &&
        (item.imageUrl ? (
          <img src={item.imageUrl} alt="" loading="lazy" className="aspect-[4/3] w-full bg-chip object-cover" />
        ) : (
          <span className="grid aspect-[4/3] w-full place-items-center bg-chip text-[1.6rem] font-bold text-muted">{initials(item.name)}</span>
        ))}
      {selected && (
        <span className="absolute top-2 right-2">
          <InCartBadge count={inCart} />
        </span>
      )}
      <span className={cx('flex flex-1 flex-col gap-1', template.photos ? 'p-3' : 'min-h-28 p-4')}>
        <span className={cx('leading-snug font-semibold text-heading', template.photos ? 'line-clamp-2' : 'line-clamp-3 pr-10 text-[1.08rem]')}>
          {item.name}
        </span>
        <span className="mt-auto flex items-end justify-between gap-2">
          <span className="font-bold text-heading tabular-nums">
            <PriceText item={item} />
          </span>
          <StockLeft left={left} template={template} />
        </span>
      </span>
    </button>
  )
}

/** Coffee shop: one card per drink, with a button per size (each tap adds one more). */
function ProductCard({
  variants,
  template,
  onAdd,
}: {
  variants: SellableItem[]
  template: TemplateConfig
  onAdd: (item: SellableItem) => void
}) {
  const { available, cart } = useShop()
  const first = variants[0]
  const hasVariants = variants.length > 1 || first.variantName !== ''

  return (
    <div className="flex gap-3 rounded-[10px] border border-line bg-surface p-3">
      {template.photos &&
        (first.imageUrl ? (
          <img src={first.imageUrl} alt="" loading="lazy" className="size-20 shrink-0 rounded-lg bg-chip object-cover" />
        ) : (
          <span className="grid size-20 shrink-0 place-items-center rounded-lg bg-chip text-[1.3rem] font-bold text-muted">
            {initials(first.productName)}
          </span>
        ))}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="line-clamp-2 leading-snug font-semibold text-heading">{first.productName}</span>
        <div className="flex flex-wrap gap-2">
          {variants.map((item) => {
            const left = available(item.key)
            const inCart = cart.lines.find((line) => line.key === item.key)?.quantity ?? 0
            const canAdd = left > inCart && displayPrice(item) !== null
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onAdd(item)}
                disabled={!canAdd}
                title={left <= 0 ? 'Sold out' : `Add one ${item.name}`}
                className={cx(
                  'flex cursor-pointer flex-col items-start rounded-lg border px-3 py-1.5 text-left disabled:cursor-not-allowed disabled:opacity-50',
                  inCart > 0 ? 'border-accent bg-info-soft' : 'border-line bg-surface hover:enabled:border-accent',
                )}
              >
                <span className="flex items-center gap-1.5 text-[0.88rem] font-semibold text-heading">
                  {hasVariants ? item.variantName : 'Add'}
                  {inCart > 0 && <InCartBadge count={inCart} />}
                </span>
                <span className="text-[0.82rem] font-bold text-heading tabular-nums">
                  <PriceText item={item} />
                </span>
                <StockLeft left={left} template={template} />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Grocery: a compact row per product. Tap (or scan) adds one more each time. */
function ItemRow({ item, template, onAdd }: { item: SellableItem; template: TemplateConfig; onAdd: () => void }) {
  const { available, cart } = useShop()
  const left = available(item.key)
  const inCart = cart.lines.find((line) => line.key === item.key)?.quantity ?? 0
  const canAdd = left > inCart && displayPrice(item) !== null

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={!canAdd}
      className={cx(
        'flex w-full cursor-pointer items-center gap-3 border-0 px-4 py-3 text-left disabled:cursor-not-allowed',
        inCart > 0 ? 'bg-info-soft' : 'bg-transparent hover:enabled:bg-page',
        left <= 0 && inCart === 0 && 'opacity-55',
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-semibold text-heading">{item.name}</span>
        <span className="truncate text-[0.8rem] text-muted">{[item.categoryName, item.barcodes[0]].filter(Boolean).join(' · ')}</span>
      </span>
      <StockLeft left={left} template={template} />
      <span className="w-24 text-right font-bold text-heading tabular-nums">
        <PriceText item={item} />
      </span>
      {inCart > 0 ? <InCartBadge count={inCart} /> : <span className="w-10 text-center text-[1.2rem] font-bold text-accent">+</span>}
    </button>
  )
}
