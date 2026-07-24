import type { AuthUser } from '../types/app'
import { apiFetch, clearCsrfToken } from './client'

type LoginResponse =
  | { message?: string; user?: AuthUser }
  | { errors?: Record<string, string | string[]> }

export async function getCurrentUser() {
  const response = await apiFetch('/me')

  if (response.status === 401) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Session check failed with ${response.status}`)
  }

  const data = (await response.json()) as { user: AuthUser }
  return data.user
}

export async function login(email: string, password: string) {
  const response = await apiFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })

  const data = (await response.json()) as LoginResponse

  if (!response.ok || !('user' in data) || !data.user) {
    if ('errors' in data && data.errors?.email) {
      const emailError = Array.isArray(data.errors.email) ? data.errors.email[0] : data.errors.email
      throw new Error(emailError)
    }

    throw new Error('Login failed.')
  }

  return data.user
}

export async function register(email: string, password: string, passwordConfirmation: string) {
  const response = await apiFetch('/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      password_confirmation: passwordConfirmation,
    }),
  })

  const data = (await response.json()) as LoginResponse

  if (!response.ok || !('user' in data) || !data.user) {
    if ('errors' in data && data.errors) {
      const firstError = Object.values(data.errors).flat()[0]
      throw new Error(firstError ?? 'Registration failed.')
    }

    throw new Error('Registration failed.')
  }

  return data.user
}

export async function logout() {
  await apiFetch('/logout', { method: 'POST' })
  clearCsrfToken()
}
