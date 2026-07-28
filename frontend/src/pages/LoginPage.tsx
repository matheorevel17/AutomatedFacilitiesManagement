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
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)
  const isRegisterMode = mode === 'register'

  function handleModeChange() {
    setShowPassword(false)
    setShowPasswordConfirmation(false)
    onPasswordConfirmationChange('')

    if (isRegisterMode) {
      onEmailChange('admin@stagebali.test')
      onPasswordChange('password')
      setMode('login')
      return
    }

    onEmailChange('')
    onPasswordChange('')
    setMode('register')
  }

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
            <div className="password-field">
              <input
                autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                required
              />
              <button
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                type="button"
                onClick={() => setShowPassword((current) => !current)}
              >
                👁️
              </button>
            </div>
          </label>

          {isRegisterMode ? (
            <label>
              <span>Confirm password</span>
              <div className="password-field">
                <input
                  autoComplete="new-password"
                  type={showPasswordConfirmation ? 'text' : 'password'}
                  value={passwordConfirmation}
                  onChange={(event) => onPasswordConfirmationChange(event.target.value)}
                  required
                />
                <button
                  aria-label={
                    showPasswordConfirmation ? 'Hide password confirmation' : 'Show password confirmation'
                  }
                  type="button"
                  onClick={() => setShowPasswordConfirmation((current) => !current)}
                >
                  👁️
                </button>
              </div>
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
          onClick={handleModeChange}
        >
          {isRegisterMode ? 'Already have an account? Login' : 'Create a new account'}
        </button>
      </section>
    </main>
  )
}
