import type { FormEvent } from 'react'

type LoginPageProps = {
  email: string
  error: string | null
  isSubmitting: boolean
  password: string
  onEmailChange: (email: string) => void
  onPasswordChange: (password: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function LoginPage({
  email,
  error,
  isSubmitting,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginPageProps) {
  return (
    <main className="app-shell">
      <section className="auth-panel">
        <p className="eyebrow">StageBali access</p>
        <h1>Log in to the monitoring platform.</h1>
        <p className="lede">
          This first page uses a Laravel session cookie stored by the browser after a successful login.
        </p>

        <form className="login-form" onSubmit={onSubmit}>
          <label>
            <span>Email</span>
            <input
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
            />
          </label>

          <label>
            <span>Password</span>
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <p className="dev-hint">
          Dev account: <code>admin@stagebali.test</code> / <code>password</code>
        </p>
      </section>
    </main>
  )
}
