import { signOut } from 'firebase/auth'
import { Link, Navigate } from 'react-router-dom'
import { listMyShops } from '../api/pos'
import { EmptyState, ErrorBox, Loading } from '../components/ui'
import { auth } from '../firebase'
import { useLoad } from '../hooks/useLoad'
import { cx, ui } from '../styles'
import { useAuth } from '../useAuth'
import { initials } from '../utils/format'

/** Pick the business to sell for. Most sellers have one, and go straight to it. */
export default function ShopsPage() {
  const { user } = useAuth()
  const { data: shops, error } = useLoad(listMyShops, [user?.uid])

  if (shops?.length === 1) return <Navigate to={`/shop/${shops[0].id}`} replace />

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className={ui.h1}>Where are you selling?</h1>
        <button type="button" className={ui.link} onClick={() => signOut(auth)}>
          Sign out
        </button>
      </div>
      <ErrorBox message={error} />
      {!shops ? (
        !error && <Loading />
      ) : shops.length === 0 ? (
        <EmptyState text={`${user?.email} is not a seller for any business yet. Ask the business owner to add you (Team → Sellers).`} />
      ) : (
        shops.map((shop) => (
          <Link key={shop.id} to={`/shop/${shop.id}`} className={cx(ui.card, 'flex items-center gap-3 no-underline hover:border-muted')}>
            {shop.businessLogo ? (
              <img src={shop.businessLogo} alt="" className="size-11 rounded-lg object-cover" />
            ) : (
              <span className="grid size-11 place-items-center rounded-lg bg-chip font-bold text-accent">{initials(shop.businessName)}</span>
            )}
            <span className={cx(ui.strong, 'text-[1.05rem]')}>{shop.businessName}</span>
          </Link>
        ))
      )}
    </div>
  )
}
