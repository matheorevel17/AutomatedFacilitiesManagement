import type { MaintenanceTaskPayload, MaintenanceTasksData } from '../types/app'
import { apiFetch, readJson } from './client'

export async function fetchMaintenanceTasks() {
  return readJson<MaintenanceTasksData>(
    await apiFetch('/maintenance-tasks'),
    'Maintenance tasks failed',
  )
}

export async function createMaintenanceTask(payload: MaintenanceTaskPayload) {
  return readJson(await apiFetch('/maintenance-tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  }), 'Create maintenance task failed')
}

export async function updateMaintenanceTask(taskId: number, payload: MaintenanceTaskPayload) {
  return readJson(await apiFetch(`/maintenance-tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }), 'Update maintenance task failed')
}

export async function updateMaintenanceTaskStatus(taskId: number, status: string) {
  return readJson(await apiFetch(`/maintenance-tasks/${taskId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }), 'Update maintenance task status failed')
}

export async function deleteMaintenanceTask(taskId: number) {
  return readJson(await apiFetch(`/maintenance-tasks/${taskId}`, {
    method: 'DELETE',
  }), 'Delete maintenance task failed')
}
