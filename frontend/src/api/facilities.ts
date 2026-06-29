import type { FacilitiesData } from '../types/app'
import { apiFetch, readJson } from './client'

export async function fetchFacilities() {
  return readJson<FacilitiesData>(await apiFetch('/facilities'), 'Facilities failed')
}
