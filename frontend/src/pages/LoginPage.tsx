import type { FormEvent } from 'react'
import { useState } from 'react'

type LoginPageProps = {
  email: string
  error: string | null
  isSubmitting: boolean
  password: string
  passwordConfirmation: string
  onEmailChange: (email: string) => void
  onPasswordChange: (password: string) => void
  onPasswordConfirmationChange: (password: string) => void
  onRegister: (event: FormEvent<HTMLFormElement>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function LoginPage({
  email,
  error,
  isSubmitting,
  password,
  passwordConfirmation,
  onEmailChange,
  onPasswordChange,
  onPasswordConfirmationChange,
  onRegister,
  onSubmit,
}: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const isRegisterMode = mode === 'register'

  return (
    <main className="app-shell">
      <section className="auth-panel">
        <h1>{isRegisterMode ? 'Create account' : 'Login'}</h1>

        <form className="login-form" noValidate onSubmit={isRegisterMode ? onRegister : onSubmit}>
          <label>
            <span>Email</span>
            <input
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              required
            />
          </label>

          <label>
            <span>Password</span>
            <input
              autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              required
            />
          </label>

          {isRegisterMode ? (
            <label>
              <span>Confirm password</span>
              <input
                autoComplete="new-password"
                type="password"
                value={passwordConfirmation}
                onChange={(event) => onPasswordConfirmationChange(event.target.value)}
                required
              />
            </label>
          ) : null}

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait...' : isRegisterMode ? 'Create account' : 'Login'}
          </button>
        </form>

        <button
          className="auth-switch-button"
          type="button"
          onClick={() => setMode((current) => (current === 'login' ? 'register' : 'login'))}
        >
          {isRegisterMode ? 'Already have an account? Login' : 'Create a new account'}
        </button>
      </section>
    </main>
  )
}
