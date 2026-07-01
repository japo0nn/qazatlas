import { Link } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'

interface HeaderProps {
  regionLabel?: string
  onBack?: () => void
  showBack?: boolean
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  )
}

export function Header({ regionLabel, onBack, showBack }: HeaderProps) {
  return (
    <header
      className="fixed inset-x-0 top-0 z-20 backdrop-blur-md"
      style={{
        background: 'var(--header-bg)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="mx-auto flex h-[60px] max-w-screen-xl items-center justify-between gap-6 px-5 sm:px-8">

        {/* Logo */}
        <a
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          style={{ textDecoration: 'none' }}
        >
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <HomeIcon />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold leading-none" style={{ color: 'var(--text)' }}>QazAtlas</p>
            <p className="mt-0.5 text-[10px] leading-none" style={{ color: 'var(--muted)' }}>
              Достопримечательности
            </p>
          </div>
        </a>

        {/* Center: breadcrumb or back */}
        <div className="flex flex-1 items-center justify-center">
          {showBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:opacity-70 sm:px-4"
              style={{
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text)',
              }}
            >
              <span>←</span>
              <span className="hidden sm:inline">Назад к Казахстану</span>
              <span className="sm:hidden">Назад</span>
            </button>
          ) : (
            <div className="flex min-w-0 items-center gap-1.5 text-sm select-none sm:gap-2">
              <span className="hidden sm:inline shrink-0" style={{ color: 'var(--muted)' }}>Казахстан</span>
              {regionLabel && regionLabel !== 'Казахстан' && (
                <>
                  <span className="hidden sm:inline shrink-0" style={{ color: 'var(--muted)' }}>›</span>
                  <span className="truncate font-semibold" style={{ color: 'var(--text)' }}>
                    {regionLabel}
                  </span>
                </>
              )}
              {!regionLabel && (
                <span className="sm:hidden" style={{ color: 'var(--muted)' }}>Казахстан</span>
              )}
            </div>
          )}
        </div>

        {/* Right: admin + theme toggle */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/admin/login"
            title="Войти как администратор"
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-opacity hover:opacity-70"
            style={{
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--muted)',
              textDecoration: 'none',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
