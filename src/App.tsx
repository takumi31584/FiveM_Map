import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { CategoryProvider } from './contexts/CategoryContext'
import { HomePage } from './pages/HomePage'
import { MapPage } from './pages/MapPage'
import { LoginPage } from './pages/LoginPage'
import type { ReactNode } from 'react'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0f1117]">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/map"
        element={
          <RequireAuth>
            <MapPage />
          </RequireAuth>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CategoryProvider>
          <AppRoutes />
        </CategoryProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
