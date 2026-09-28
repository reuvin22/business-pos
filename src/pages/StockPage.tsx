import { useState, type FormEvent } from 'react'
import { changeStock, listStockHistory } from '../api/pos'
import { EmptyState, ErrorBox, LiveBadge, Loading, Modal } from '../components/ui'
import { useLoad } from '../hooks/useLoad'
import { useShop } from '../shopContext'
import { cx, ui } from '../styles'
import { formatDateTime, formatNumber } from '../utils/format'
import { stockId, type SellableItem } from '../utils/items'
import { movementLabel } from '../utils/labels'

type Changing = { item: SellableItem; direction: 'in' | 'out' }

/** The store's stock, live. Record deliveries (stock in) and damaged or expired goods (stock out). */
export default function StockPage() {
  const shop = useShop()
  const [search, setSearch] = useState('')
  const [changing, setChanging] = useState<Changing | null>(null)

  // Reload the history whenever any quantity here changes (a sale, a delivery, the main app...)
  const stockVersion = Object.values(shop.stock ?? {})
    .map((s) => `${s.id}:${s.quantity}`)
    .join()
  const history = useLoad(
    () => listStockHistory(shop.businessId, shop.location.id),
    [shop.businessId, shop.location.id, stockVersion],
  )

  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const items = (shop.items ?? []).filter((item) => words.every((word) => item.searchText.includes(word)))

  return (
    <div className={ui.page}>
      <div className={ui.sectionHead}>
        <div className="flex items-center gap-3">
          <h1 className={ui.h1}>Stock at {shop.location.locationName}</h1>
          {shop.stock && <LiveBadge live={shop.stockLive} />}
        </div>
        <input className={cx(ui.inputAuto, 'max-sm:w-full')} type="search" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <ErrorBox message={shop.catalogError || shop.stockError} />
      {!shop.items || !shop.stock ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState text="No products found." />
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>Product</th>
                <th className={cx(ui.th, ui.num)}>On hand</th>
                <th className={cx(ui.th, ui.num)}>Reserved</th>
                <th className={cx(ui.th, ui.num)}>Can sell</th>
                <th className={ui.th} aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const record = shop.stock?.[stockId(item.key, shop.location.id)]
                const available = record?.availableQuantity ?? 0
                const low = record?.reorderLevel !== null && record?.reorderLevel !== undefined && available <= record.reorderLevel
                return (
                  <tr key={item.key}>
                    <td className={cx(ui.td, ui.strong, 'whitespace-normal')}>{item.name}</td>
                    <td className={cx(ui.td, ui.num)}>{record ? formatNumber(record.quantity) : '—'}</td>
                    <td className={cx(ui.td, ui.num)}>{record ? formatNumber(record.reservedQuantity) : '—'}</td>
                    <td className={cx(ui.td, ui.num, 'font-bold', available <= 0 ? 'text-danger' : low ? 'text-warn' : 'text-heading')}>
                      {formatNumber(available)}
                    </td>
                    <td className={cx(ui.td, 'text-right')}>
                      <div className="inline-flex gap-2">
                        <button type="button" className={cx(ui.btnGhost, 'px-3 py-1.5')} onClick={() => setChanging({ item, direction: 'in' })}>
                          + In
                        </button>
                        <button
                          type="button"
                          className={cx(ui.btnGhost, 'px-3 py-1.5')}
                          disabled={!record || record.quantity <= 0}
                          onClick={() => setChanging({ item, direction: 'out' })}
                        >
                          − Out
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <section className={ui.section}>
        <h2 className={ui.h2}>Recent changes here</h2>
        <ErrorBox message={history.error} />
        {!history.data ? (
          <Loading />
        ) : history.data.length === 0 ? (
          <EmptyState text="No stock changes yet." />
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th className={ui.th}>When</th>
                  <th className={ui.th}>Product</th>
                  <th className={ui.th}>What happened</th>
                  <th className={cx(ui.th, ui.num)}>Change</th>
                  <th className={cx(ui.th, ui.num)}>On hand after</th>
                  <th className={ui.th}>Details</th>
                  <th className={ui.th}>By</th>
                </tr>
              </thead>
              <tbody>
                {history.data.slice(0, 50).map((m) => (
                  <tr key={m.id}>
                    <td className={ui.td}>{formatDateTime(m.createdAt)}</td>
                    <td className={cx(ui.td, ui.strong)}>
                      {m.productName}
                      {m.variantName && ` (${m.variantName})`}
                    </td>
                    <td className={ui.td}>{movementLabel(m.movementType)}</td>
                    <td className={cx(ui.td, ui.num, 'font-semibold', m.change > 0 ? 'text-up' : m.change < 0 ? 'text-down' : 'text-muted')}>
                      {m.change > 0 ? '+' : m.change < 0 ? '−' : ''}
                      {formatNumber(Math.abs(m.change))}
                    </td>
                    <td className={cx(ui.td, ui.num)}>{formatNumber(m.quantityAfter)}</td>
                    <td className={cx(ui.td, 'max-w-72 whitespace-normal')}>{[m.referenceLabel, m.note].filter(Boolean).join(' · ') || '—'}</td>
                    <td className={ui.td}>{m.byName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {changing && <StockChangeDialog key={changing.item.key} {...changing} onClose={() => setChanging(null)} />}
    </div>
  )
}

function StockChangeDialog({ item, direction, onClose }: Changing & { onClose: () => void }) {
  const shop = useShop()
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const isIn = direction === 'in'
  const amount = Number(quantity)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await changeStock(shop.businessId, {
        locationId: shop.location.id,
        productId: item.productId,
        variantId: item.variantId,
        change: isIn ? amount : -amount,
        note: note.trim(),
      })
      shop.refreshStock()
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={isIn ? 'Stock in' : 'Stock out'} onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div>
          <h2 className={ui.h2}>{isIn ? 'Stock in' : 'Stock out'}</h2>
          <p className={ui.hint}>
            {item.name} · can sell {formatNumber(shop.available(item.key))} {item.unit}
          </p>
        </div>
        <label className={ui.label}>
          {isIn ? 'Quantity received' : 'Quantity taken out'}
          <input className={cx(ui.input, 'text-[1.1rem]')} type="number" min={0} step="any" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} autoFocus />
        </label>
        <label className={ui.label}>
          {isIn ? 'Note (optional)' : 'Reason *'}
          <input className={ui.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder={isIn ? 'e.g. Delivery from warehouse' : 'e.g. Damaged, expired'} />
        </label>
        <ErrorBox message={error} />
        <div className="flex gap-2.5">
          <button type="button" className={cx(ui.btnGhost, 'flex-1')} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={cx(isIn ? ui.btnPrimary : ui.btnDanger, 'flex-1')} disabled={saving || !(amount > 0) || (!isIn && !note.trim())}>
            {saving ? 'Saving…' : isIn ? `Add ${quantity || 0}` : `Take out ${quantity || 0}`}
          </button>
        </div>
      </form>
    </Modal>
  )
}
