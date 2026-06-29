import { navigationItems } from '../constants/navigation'
import type { AppPage, AuthUser } from '../types/app'

type TopNavProps = {
  activePage: AppPage
  user: AuthUser
  onPageChange: (page: AppPage) => void
}

export function TopNav({ activePage, user, onPageChange }: TopNavProps) {
  return (
    <section className="topbar-panel">
      <div className="topbar-title">
        <p className="eyebrow">StageBali platform</p>
        <strong>{user.name}</strong>
      </div>

      <nav className="page-nav" aria-label="Primary">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.id === activePage ? 'nav-link active' : 'nav-link'}
            onClick={() => onPageChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </section>
  )
}
