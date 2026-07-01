import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const NAV = [
  { to: '/admin/dashboard', label: 'Точки', icon: '▤' },
  { to: '/admin/points/new', label: 'Добавить точку', icon: '+' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/admin/login')
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#0F0F0F' }}>
      {/* Sidebar */}
      <aside
        className="flex w-[220px] shrink-0 flex-col"
        style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base"
            style={{ background: '#F5A623', color: '#0F0F0F' }}
          >
            △
          </div>
          <span className="text-sm font-bold text-white">QazAtlas</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 px-3 pt-2">
          {NAV.map(({ to, label, icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
                style={{
                  background: active ? '#F5A623' : 'transparent',
                  color: active ? '#0F0F0F' : 'rgba(255,255,255,0.55)',
                  textDecoration: 'none',
                }}
              >
                <span className="text-base leading-none">{icon}</span>
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="mt-auto flex flex-col gap-1 px-3 pb-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}
          >
            <span>↗</span>
            Открыть карту
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
          >
            <span>⊗</span>
            Выйти
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto" style={{ background: '#141414' }}>
        {children}
      </main>
    </div>
  )
}
