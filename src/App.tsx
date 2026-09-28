import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import { Loading } from './components/ui'
import { isFirebaseConfigured, missingFirebaseSettings } from './firebase'
import AccountPage from './pages/AccountPage'
import LoginPage from './pages/LoginPage'
import ReceiptsPage from './pages/ReceiptsPage'
import SellPage from './pages/SellPage'
import ShopLayout from './pages/ShopLayout'
import ShopsPage from './pages/ShopsPage'
import StockPage from './pages/StockPage'
import { ui } from './styles'
import { useAuth } from './useAuth'

export default function App() {
  if (!isFirebaseConfigured) return <SetupNeeded />

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireLogin />}>
            <Route path="/" element={<ShopsPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/shop/:businessId" element={<ShopLayout />}>
              <Route index element={<SellPage />} />
              <Route path="stock" element={<StockPage />} />
              <Route path="receipts" element={<ReceiptsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

/** Pages inside this need a signed-in user; everyone else goes to the login page. */
function RequireLogin() {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

function SetupNeeded() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-3 p-8">
      <h1 className={ui.h1}>Almost there</h1>
      <p>Firebase isn't configured yet. Add these to <code>.env.local</code> (or your hosting's environment variables):</p>
      <ul className="list-inside list-disc font-mono text-[0.9rem] text-heading">
        {missingFirebaseSettings.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
      <p className={ui.hint}>Use the same Firebase project as the main app. See .env.example.</p>
    </div>
  )
}
