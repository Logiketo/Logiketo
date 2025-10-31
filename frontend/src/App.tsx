import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ThemeProvider } from '@/contexts/ThemeContext'
import '@/styles/theme.css'
import Landing from '@/pages/Landing'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import Dashboard from '@/pages/Dashboard'
import MainLayout from '@/components/MainLayout'
import Fleet from '@/pages/Fleet'
import Units from '@/pages/Units'
import Employees from '@/pages/Employees'
import Customers from '@/pages/Customers'
import Orders from '@/pages/Orders'
import Dispatch from '@/pages/Dispatch'
import Reports from '@/pages/Reports'
import Plans from '@/pages/Plans'
import Settings from '@/pages/Settings'
import AdminPanel from '@/pages/AdminPanel'

function App() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <ThemeProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
        <Route path="/myfleet" element={<Navigate to="/fleet" replace />} />
        <Route path="/fleet" element={<MainLayout><Fleet /></MainLayout>} />
        <Route path="/units" element={<MainLayout><Units /></MainLayout>} />
        <Route path="/employees" element={<MainLayout><Employees /></MainLayout>} />
        <Route path="/customers" element={<MainLayout><Customers /></MainLayout>} />
        <Route path="/orders" element={<Navigate to="/orders-active" replace />} />
        <Route path="/orders-active" element={<MainLayout><Orders /></MainLayout>} />
        <Route path="/orders-delivered" element={<MainLayout><Orders /></MainLayout>} />
        <Route path="/orders-pending" element={<MainLayout><Orders /></MainLayout>} />
        <Route path="/dispatch" element={<Navigate to="/units" replace />} />
        <Route path="/map" element={<MainLayout><Dispatch /></MainLayout>} />
        <Route path="/reports" element={<MainLayout><Reports /></MainLayout>} />
        <Route path="/plans" element={<MainLayout><Plans /></MainLayout>} />
        <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
        <Route path="/admin" element={<MainLayout><AdminPanel /></MainLayout>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ThemeProvider>
  )
}

export default App
