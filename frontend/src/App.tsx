import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { fetchAlerts } from './api/alerts'
import { fetchAutomatedTools } from './api/automatedTools'
import { getCurrentUser, login as loginRequest, logout as logoutRequest } from './api/auth'
import { fetchDashboard } from './api/dashboard'
import { fetchFacilities } from './api/facilities'
import { fetchMaintenanceTasks } from './api/maintenanceTasks'
import { fetchSimulationData } from './api/simulation'
import './App.css'
import { TopNav } from './components/TopNav'
import { AlertsPage } from './pages/AlertsPage'
import { AutomatedToolsPage } from './pages/AutomatedToolsPage'
import { DashboardPage } from './pages/DashboardPage'
import { FacilitiesPage } from './pages/FacilitiesPage'
import { LoginPage } from './pages/LoginPage'
import { MaintenanceTasksPage } from './pages/MaintenanceTasksPage'
import { SimulationPage } from './pages/SimulationPage'
import { SessionLoadingPage } from './pages/SessionLoadingPage'
import type {
  AlertsData,
  AppPage,
  AuthUser,
  AutomatedToolsData,
  DashboardData,
  FacilitiesData,
  MaintenanceTasksData,
  SimulationData,
} from './types/app'

function App() {
  const [activePage, setActivePage] = useState<AppPage>('dashboard')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [facilitiesData, setFacilitiesData] = useState<FacilitiesData | null>(null)
  const [automatedToolsData, setAutomatedToolsData] = useState<AutomatedToolsData | null>(null)
  const [alertsData, setAlertsData] = useState<AlertsData | null>(null)
  const [maintenanceTasksData, setMaintenanceTasksData] = useState<MaintenanceTasksData | null>(null)
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null)
  const [selectedFacilityId, setSelectedFacilityId] = useState<number | null>(null)
  const [email, setEmail] = useState('admin@stagebali.test')
  const [password, setPassword] = useState('password')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCheckingSession, setIsCheckingSession] = useState(true)

  const loadDashboard = useCallback(async function loadDashboard() {
    setDashboard(await fetchDashboard())
  }, [])

  const loadFacilities = useCallback(async function loadFacilities() {
    const facilitiesPayload = await fetchFacilities()
    setFacilitiesData(facilitiesPayload)
    setSelectedFacilityId((current) => current ?? facilitiesPayload.facilities[0]?.id ?? null)
  }, [])

  const loadAlerts = useCallback(async function loadAlerts() {
    setAlertsData(await fetchAlerts())
  }, [])

  const loadAutomatedTools = useCallback(async function loadAutomatedTools() {
    setAutomatedToolsData(await fetchAutomatedTools())
  }, [])

  const loadMaintenanceTasks = useCallback(async function loadMaintenanceTasks() {
    setMaintenanceTasksData(await fetchMaintenanceTasks())
  }, [])

  const loadSimulationData = useCallback(async function loadSimulationData() {
    setSimulationData(await fetchSimulationData())
  }, [])

  const loadAppData = useCallback(async function loadAppData() {
    await Promise.all([
      loadDashboard(),
      loadFacilities(),
      loadAutomatedTools(),
      loadSimulationData(),
      loadAlerts(),
      loadMaintenanceTasks(),
    ])
  }, [loadAlerts, loadAutomatedTools, loadDashboard, loadFacilities, loadMaintenanceTasks, loadSimulationData])

  const resetAppData = useCallback(function resetAppData() {
    setUser(null)
    setDashboard(null)
    setFacilitiesData(null)
    setAutomatedToolsData(null)
    setAlertsData(null)
    setMaintenanceTasksData(null)
    setSimulationData(null)
    setSelectedFacilityId(null)
    setActivePage('dashboard')
  }, [])

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
  }, [loadAppData, resetAppData])

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
      <TopNav activePage={activePage} user={user} onLogout={handleLogout} onPageChange={setActivePage} />

      {activePage === 'dashboard' ? (
        <DashboardPage dashboard={dashboard} user={user} />
      ) : null}

      {activePage === 'facilities' ? (
        <FacilitiesPage
          facilitiesData={facilitiesData}
          selectedFacilityId={selectedFacilityId}
          onDataChanged={loadAppData}
          onSelectedFacilityChange={setSelectedFacilityId}
        />
      ) : null}

      {activePage === 'automated-tools' ? (
        <AutomatedToolsPage
          automatedToolsData={automatedToolsData}
          onDataChanged={loadAppData}
        />
      ) : null}

      {activePage === 'simulation' ? (
        <SimulationPage
          simulationData={simulationData}
          onAlertCreated={() => setActivePage('alerts')}
          onDataChanged={loadAppData}
        />
      ) : null}

      {activePage === 'alerts' ? (
        <AlertsPage alertsData={alertsData} onDataChanged={loadAppData} />
      ) : null}

      {activePage === 'maintenance' ? (
        <MaintenanceTasksPage
          maintenanceTasksData={maintenanceTasksData}
          onDataChanged={loadAppData}
        />
      ) : null}
    </main>
  )
}

export default App
