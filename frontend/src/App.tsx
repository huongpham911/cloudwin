import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import { TokenSyncProvider } from './contexts/TokenSyncContext'
// import { AutoLogoutProvider } from './contexts/AutoLogoutContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/auth/AdminRoute'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import AuthSuccess from './pages/auth/AuthSuccess'
import AuthError from './pages/auth/AuthError'
import OAuthCallback from './pages/auth/OAuthCallback'
import DashboardHome from './components/dashboard/DashboardHome'
import Dashboard from './pages/Dashboard'
import VolumesPage from './pages/VolumesPage'
import TestRegister from './pages/TestRegister'
import CreateVPS from './pages/CreateVPS'
import CreateWinVPS from './pages/CreateWinVPS'
import DropletsList from './components/droplets/DropletsList'
import DropletDetail from './pages/DropletDetail'
import Settings from './components/dashboard/Settings'
import Analytics from './components/analytics/Analytics'
import TerminalPage from './components/terminal/TerminalPage'
import Sidebar from './components/layout/Sidebar'
import SpacesStorage from './components/spaces/SpacesStorage'
import ErrorBoundary from './components/ErrorBoundary'
import AIAgents from './pages/AIAgents'
// import TestAutoLogout from './pages/TestAutoLogout'

// Admin Components
import AdminLayout from './components/admin/AdminLayout'
import AdminDashboard from './components/admin/AdminDashboard'
import UserManagement from './components/admin/UserManagement'
import CreateUser from './components/admin/CreateUser'
import EditUser from './components/admin/EditUser'
import AdminManagement from './components/admin/AdminManagement'
import SystemLogs from './components/admin/SystemLogs'
import SystemAnalytics from './components/admin/SystemAnalytics'
import AdminDropletsView from './components/admin/AdminDropletsView'
import AdminSpacesView from './components/admin/AdminSpacesView'
import TokenManagement from './components/admin/TokenManagement'
import AdminSettings from './components/admin/AdminSettings'
import AdminAgents from './components/admin/AdminAgents'
import UserProfile from './components/dashboard/UserProfile'

// Security Components
import CsrfProtection from './utils/csrf'
import Logger from './utils/logger'

// Initialize security features on app startup
CsrfProtection.initialize().catch(err => {
  Logger.warn('CSRF protection initialization failed:', err)
})

// Dashboard with proper layout
function FullDashboard() {
  return <Dashboard />
}

// Main App Layout Component
function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { isDark } = useTheme()

  return (
    <div className={`flex h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-100'} transition-colors duration-300`}>
      <Sidebar isCollapsed={sidebarCollapsed} setIsCollapsed={setSidebarCollapsed} />

      <div className={`flex-1 overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'ml-0' : 'ml-0'}`}>
        <main className={`h-full overflow-y-auto ${isDark ? 'bg-gray-900' : 'bg-gray-100'}`}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <FullDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/droplets" element={
              <ProtectedRoute>
                <DropletsList />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/droplets/new" element={
              <ProtectedRoute>
                <CreateVPS />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/create-vps-win" element={
              <ProtectedRoute>
                <CreateWinVPS />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/create-vps-do" element={
              <ProtectedRoute>
                <CreateVPS />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/spaces" element={
              <ProtectedRoute>
                <SpacesStorage />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/droplets/:id" element={
              <ProtectedRoute>
                <DropletDetail />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/terminal" element={
              <ProtectedRoute>
                <TerminalPage />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/analytics" element={
              <ProtectedRoute>
                <Analytics />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/ai-agents" element={
              <ProtectedRoute>
                <AIAgents />
              </ProtectedRoute>
            } />
            <Route path="/ai-agents" element={
              <AIAgents />
            } />
            {/* <Route path="/dashboard/test-autologout" element={
              <ProtectedRoute>
                <TestAutoLogout />
              </ProtectedRoute>
            } /> */}
            <Route path="/dashboard/profile" element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            } />

            <Route path="/volumes" element={
              <ProtectedRoute>
                <VolumesPage />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          {/* <AutoLogoutProvider timeoutMinutes={5} warningMinutes={1}> */}
            <TokenSyncProvider>
            <Routes>
              {/* Auth Routes (without sidebar) */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/register" element={<Register />} />
              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/auth/success" element={<AuthSuccess />} />
              <Route path="/auth/error" element={<AuthError />} />
              <Route path="/auth/callback" element={<OAuthCallback />} />
              <Route path="/test-register" element={<TestRegister />} />

              {/* Admin Routes (separate layout) */}
              <Route path="/admin/*" element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="users/create" element={<CreateUser />} />
                <Route path="users/edit/:id" element={<EditUser />} />
                <Route path="admins" element={<AdminManagement />} />
                <Route path="logs" element={<SystemLogs />} />
                <Route path="analytics" element={<SystemAnalytics />} />
                <Route path="droplets" element={<AdminDropletsView />} />
                <Route path="agents" element={<AdminAgents />} />
                <Route path="spaces" element={<AdminSpacesView />} />
                <Route path="tokens" element={<TokenManagement />} />
                <Route path="settings" element={<AdminSettings />} />
              </Route>

              {/* Dashboard Routes (with sidebar) */}
              <Route path="/*" element={<AppLayout />} />
            </Routes>
            </TokenSyncProvider>
          {/* </AutoLogoutProvider> */}
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
