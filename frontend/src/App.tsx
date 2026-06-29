import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { fetchAlerts } from './api/alerts'
import { getCurrentUser, login as loginRequest, logout as logoutRequest } from './api/auth'
import { fetchDashboard } from './api/dashboard'
import { fetchFacilities } from './api/facilities'
import { fetchMaintenanceTasks } from './api/maintenanceTasks'
import './App.css'
import { TopNav } from './components/TopNav'
import { AlertsPage } from './pages/AlertsPage'
import { DashboardPage } from './pages/DashboardPage'
import { FacilitiesPage } from './pages/FacilitiesPage'
import { LoginPage } from './pages/LoginPage'
import { MaintenanceTasksPage } from './pages/MaintenanceTasksPage'
import { SessionLoadingPage } from './pages/SessionLoadingPage'
import type { AlertsData, AppPage, AuthUser, DashboardData, FacilitiesData, MaintenanceTasksData } from './types/app'

function App() {
  const [activePage, setActivePage] = useState<AppPage>('dashboard')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [facilitiesData, setFacilitiesData] = useState<FacilitiesData | null>(null)
  const [alertsData, setAlertsData] = useState<AlertsData | null>(null)
  const [maintenanceTasksData, setMaintenanceTasksData] = useState<MaintenanceTasksData | null>(null)
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null)
  const [email, setEmail] = useState('admin@stagebali.test')
  const [password, setPassword] = useState('password')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  async function loadDashboard() {
    setDashboard(await fetchDashboard())
  }

  async function loadFacilities() {
    const facilitiesPayload = await fetchFacilities()
    setFacilitiesData(facilitiesPayload)
    setSelectedFacilityId((current) => current ?? facilitiesPayload.facilities[0]?.id ?? null)
  }

  async function loadAlerts() {
    setAlertsData(await fetchAlerts())
  }

  async function loadMaintenanceTasks() {
    setMaintenanceTasksData(await fetchMaintenanceTasks())
  }

  async function loadAppData() {
    await Promise.all([loadDashboard(), loadFacilities(), loadAlerts(), loadMaintenanceTasks()])
  }

  function resetAppData() {
    setUser(null)
    setDashboard(null)
    setFacilitiesData(null)
    setAlertsData(null)
    setMaintenanceTasksData(null)
    setSelectedFacilityId(null)
    setActivePage('dashboard')
  }

  useEffect(() => {
    async function loadSession() {
      try {
        const currentUser = await getCurrentUser()

        if (!currentUser) {
          resetAppData()
          return
        }

        setUser(currentUser)
        await loadAppData()
      } catch (fetchError) {
        if (fetchError instanceof Error) {
          setError(fetchError.message)
        }
      } finally {
        setIsCheckingSession(false)
      }
    }

    loadSession()
  }, [])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const authenticatedUser = await loginRequest(email, password)
      setUser(authenticatedUser)
      setActivePage('dashboard')
      await loadAppData()
    } catch (loginError) {
      if (loginError instanceof Error) {
        setError(loginError.message)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLogout() {
    setError(null)

    try {
      await logoutRequest()
      resetAppData()
    } catch (logoutError) {
      if (logoutError instanceof Error) {
        setError(logoutError.message)
      }
    }
  }

  if (isCheckingSession) {
    return <SessionLoadingPage />
  }

  if (!user) {
    return (
      <LoginPage
        email={email}
        error={error}
        isSubmitting={isSubmitting}
        password={password}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onSubmit={handleLogin}
      />
    )
  }

  return (
    <main className="app-shell">
      <TopNav activePage={activePage} user={user} onPageChange={setActivePage} />

      {activePage === 'dashboard' ? (
        <DashboardPage dashboard={dashboard} user={user} onLogout={handleLogout} />
      ) : null}

      {activePage === 'facilities' ? (
        <FacilitiesPage
          facilitiesData={facilitiesData}
          selectedFacilityId={selectedFacilityId}
          onLogout={handleLogout}
          onSelectedFacilityChange={setSelectedFacilityId}
        />
      ) : null}

      {activePage === 'alerts' ? <AlertsPage alertsData={alertsData} onLogout={handleLogout} /> : null}

      {activePage === 'maintenance' ? (
        <MaintenanceTasksPage maintenanceTasksData={maintenanceTasksData} onLogout={handleLogout} />
      ) : null}
    </main>
  )
}

export default App
