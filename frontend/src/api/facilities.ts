import type { FacilitiesData, FacilityPayload } from '../types/app'
import { apiFetch, readJson } from './client'

export async function fetchFacilities() {
  return readJson<FacilitiesData>(await apiFetch('/facilities'), 'Facilities failed')
}

export async function createFacility(payload: FacilityPayload) {
  return readJson(await apiFetch('/facilities', {
    method: 'POST',
    body: JSON.stringify(payload),
  }), 'Create facility failed')
}

export async function updateFacility(facilityId: number, payload: FacilityPayload) {
  return readJson(await apiFetch(`/facilities/${facilityId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }), 'Update facility failed')
}

export async function deleteFacility(facilityId: number) {
  return readJson(await apiFetch(`/facilities/${facilityId}`, {
    method: 'DELETE',
  }), 'Delete facility failed')
}
