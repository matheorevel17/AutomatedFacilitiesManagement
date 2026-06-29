import type { MaintenanceTasksData } from '../types/app'
import { apiFetch, readJson } from './client'

export async function fetchMaintenanceTasks() {
  return readJson<MaintenanceTasksData>(
    await apiFetch('/maintenance-tasks'),
    'Maintenance tasks failed',
  )
}
