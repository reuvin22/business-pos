import { listStockHistory } from '../api/pos'
import { EmptyState, ErrorBox, LiveBadge, Loading } from '../components/ui'
import { useLoad } from '../hooks/useLoad'
import { useShop } from '../shopContext'
import { cx, ui } from '../styles'
import { formatDateTime, formatNumber } from '../utils/format'
import { movementLabel } from '../utils/labels'

/** The recent stock changes at this store (sales, deliveries, corrections...), kept up to date live. */
export default function StockPage() {
  const shop = useShop()

  // Reload the history whenever any quantity here changes (a sale, a delivery, the main app...)
  const stockVersion = Object.values(shop.stock ?? {})
    .map((s) => `${s.id}:${s.quantity}`)
    .join()
  const history = useLoad(
    () => listStockHistory(shop.businessId, shop.location.id),
    [shop.businessId, shop.location.id, stockVersion],
  )

  return (
    <div className={ui.page}>
      <div className={ui.sectionHead}>
        <div className="flex items-center gap-3">
          <h1 className={ui.h1}>Recent changes at {shop.location.locationName}</h1>
          {shop.stock && <LiveBadge live={shop.stockLive} />}
        </div>
      </div>

      <ErrorBox message={history.error || shop.stockError} />
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
    </div>
  )
}
