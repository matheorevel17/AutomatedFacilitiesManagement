export type AppPage = 'dashboard' | 'facilities' | 'automated-tools' | 'simulation' | 'alerts' | 'maintenance'

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
  tools_monitoring: {
    delayed: number
    not_reporting: number
    recent: Array<{
      id: number
      latest_sensor_reading?: {
        recorded_at: string
        status: string
        unit: string
        value: string
      } | null
      minutes_since_last_reading: number | null
      name: string
      reporting_level: string
      reporting_status: string
      status: string
    }>
    reporting: number
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
    delayed: number
    inactive: number
    maintenance: number
    not_reporting: number
    reporting: number
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
    minutes_since_last_reading: number | null
    name: string
    normal_max: string
    normal_min: string
    normal_reference_note: string
    open_alerts_count: number
    range_thresholds: {
      critical: {
        above: number
        below: number
      }
      normal: {
        max: number
        min: number
      }
      rule: string
      warning: {
        high_max: number
        high_min: number
        low_max: number
        low_min: number
      }
      warning_buffer: number
    }
    reporting_level: string
    reporting_status: string
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

export type SimulationData = {
  facilities: Array<{
    id: number
    location: string
    name: string
    status: string
    type: string
  }>
  recent_readings: Array<{
    id: number
    recorded_at: string
    status: string
    tool?: {
      facility?: {
        id: number
        location: string
        name: string
        type: string
      } | null
      facility_id: number
      id: number
      name: string
      type: string
      unit: string
    } | null
    tool_id: number
    unit: string
    value: string
  }>
  stats: {
    critical: number
    normal: number
    readings: number
    warning: number
  }
  tools: Array<{
    facility_id: number
    id: number
    location: string
    name: string
    normal_max: string
    normal_min: string
    status: string
    type: string
    unit: string
  }>
}

export type SimulationGeneratePayload = {
  count: number
  facility_id: number
  mean: number
  normal_max: number
  normal_min: number
  scenario: string
  standard_deviation: number
  tool_id: number
}

export type SimulationDetectionPayload = {
  facility_id: number
  scenario: string
  tool_id: number
}

export type SimulationActionResult = {
  alert?: AlertsData['alerts'][number] | null
  message: string
  summary?: {
    abnormal?: number
    checked?: number
    critical: number
    generated?: number
    normal?: number
    warning?: number
  }
}

export type NavigationItem = {
  id: AppPage
  label: string
}
