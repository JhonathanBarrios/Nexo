import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuthStore } from './store/authStore'
import { useRealtimeNotifications } from './hooks/useRealtimeNotifications'
import { usePWAUpdate } from './hooks/usePWAUpdate'
import LoginPage from './pages/LoginPage'
import DashboardLayout from './layouts/DashboardLayout'
import DashboardPage from './pages/DashboardPage'
import TransactionsPage from './pages/TransactionsPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'
import RecurringPaymentsPage from './pages/RecurringPaymentsPage'
import CardsPage from './pages/CardsPage'
import PWAUpdateBanner from './components/PWAUpdateBanner'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function App() {
  const { initialize } = useAuthStore()
  useRealtimeNotifications() // Listen for realtime notifications
  const { updateAvailable, updateApp } = usePWAUpdate()
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (updateAvailable) {
      setShowBanner(true)
    }
  }, [updateAvailable])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/recurring-payments" element={<RecurringPaymentsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/cards" element={<CardsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#1e293b',
          color: '#f1f5f9',
          border: '1px solid #334155',
          borderRadius: '12px',
          padding: '12px 16px',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#f1f5f9',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#f1f5f9',
          },
        },
      }} />
      {showBanner && (
        <PWAUpdateBanner
          onReload={updateApp}
          onClose={() => setShowBanner(false)}
        />
      )}
    </BrowserRouter>
  )
}