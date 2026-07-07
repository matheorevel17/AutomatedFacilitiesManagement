export type AppPage = 'dashboard' | 'facilities' | 'automated-tools' | 'alerts' | 'maintenance'

export type AuthUser = {
  email: string
  id: number
  name: string
  role: string
}

export type DashboardData = {
  facilities: Array<{
    id: number
    location: string
    name: string
    open_alerts_count: number
    status: string
    tools_count: number
    type: string
  }>
  maintenance_tasks: Array<{
    assignedTo?: { id: number; name: string } | null
    facility?: { id: number; name: string } | null
    id: number
    status: string
    title: string
    tool?: { id: number; name: string } | null
    updated_at: string
  }>
  recent_alerts: Array<{
    alert_type: string
    facility?: { id: number; name: string } | null
    id: number
    message: string
    severity: string
    status: string
    tool?: { id: number; name: string } | null
    triggered_at: string
  }>
  stats: {
    active_tasks: number
    facilities: number
    open_alerts: number
    tools: number
  }
}

export type FacilitiesData = {
  facilities: Array<{
    active_tasks_count: number
    alerts: Array<{
      id: number
      alert_type: string
      severity: string
      status: string
      message: string
      triggered_at: string
    }>
    automated_tools: Array<{
      id: number
      installation_date: string | null
      latest_sensor_reading?: {
        recorded_at: string
        status: string
        unit: string
        value: string
      } | null
      location: string
      name: string
      normal_max: string
      normal_min: string
      open_alerts_count: number
      status: string
      type: string
      unit: string
    }>
    description: string | null
    id: number
    location: string
    maintenance_tasks: Array<{
      assigned_to?: { id: number; name: string } | null
      id: number
      status: string
      title: string
      updated_at: string
    }>
    name: string
    open_alerts_count: number
    status: string
    tools_count: number
    type: string
  }>
}

export type FacilityPayload = {
  description: string | null
  location: string
  name: string
  status: string
  type: string
}

export type AlertsData = {
  alerts: Array<{
    alert_type: string
    facility?: {
      id: number
      location: string
      name: string
      type: string
    } | null
    facility_id: number
    id: number
    message: string
    severity: string
    status: string
    tool?: {
      id: number
      location: string
      name: string
      type: string
    } | null
    tool_id: number
    triggered_at: string
  }>
  facilities: Array<{
    id: number
    location: string
    name: string
    status: string
    type: string
  }>
  stats: {
    facilities_affected: number
    high_severity: number
    open: number
    total: number
  }
  tools: Array<{
    facility_id: number
    id: number
    location: string
    name: string
    status: string
    type: string
  }>
}

export type AlertPayload = {
  alert_type: string
  facility_id: number
  message: string
  severity: string
  status: string
  tool_id: number
  triggered_at: string
}

export type AutomatedToolPayload = {
  facility_id: number
  installation_date: string | null
  location: string
  name: string
  normal_max: number
  normal_min: number
  status: string
  type: string
  unit: string
}

export type AutomatedToolsData = {
  facilities: Array<{
    id: number
    location: string
    name: string
    status: string
    type: string
  }>
  stats: {
    active: number
    inactive: number
    maintenance: number
    total: number
  }
  tools: Array<{
    facility?: {
      id: number
      location: string
      name: string
      type: string
    } | null
    facility_id: number
    id: number
    installation_date: string | null
    latest_sensor_reading?: {
      recorded_at: string
      status: string
      unit: string
      value: string
    } | null
    location: string
    name: string
    normal_max: string
    normal_min: string
    open_alerts_count: number
    status: string
    type: string
    unit: string
  }>
}

export type MaintenanceTasksData = {
  alerts: Array<{
    alert_type: string
    facility_id: number
    id: number
    severity: string
    status: string
    tool_id: number
  }>
  facilities: Array<{
    id: number
    location: string
    name: string
    status: string
    type: string
  }>
  stats: {
    in_progress: number
    pending: number
    resolved: number
    total: number
  }
  tasks: Array<{
    alert?: {
      alert_type: string
      id: number
      severity: string
      status: string
    } | null
    alert_id: number | null
    assignedTo?: {
      id: number
      name: string
    } | null
    assigned_to_user_id: number | null
    created_at: string
    description: string | null
    facility?: {
      id: number
      location: string
      name: string
      type: string
    } | null
    facility_id: number
    id: number
    priority: string
    resolved_at: string | null
    status: string
    title: string
    tool?: {
      id: number
      location: string
      name: string
      type: string
    } | null
    tool_id: number
    updated_at: string
  }>
  tools: Array<{
    facility_id: number
    id: number
    location: string
    name: string
    status: string
    type: string
  }>
  users: Array<{
    email: string
    id: number
    name: string
    role: string
  }>
}

export type MaintenanceTaskPayload = {
  alert_id: number | null
  assigned_to_user_id: number | null
  description: string | null
  facility_id: number
  priority: string
  status: string
  title: string
  tool_id: number
}

export type NavigationItem = {
  id: AppPage
  label: string
}
