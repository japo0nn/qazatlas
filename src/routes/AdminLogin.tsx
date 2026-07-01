import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  )
}

export default function AdminLogin() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#1E1E1E',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: '12px 16px',
    color: '#E8E8E8',
    fontSize: 14,
    outline: 'none',
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{ background: '#111' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Icon */}
        <div
          className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: '#F5A623', color: '#111' }}
        >
          <HomeIcon />
        </div>

        <h1 className="mb-1 text-2xl font-bold text-white">QazAtlas Admin</h1>
        <p className="mb-6 text-sm" style={{ color: '#777' }}>
          Войдите, чтобы управлять точками карты
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: '#CCC' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@qazatlas.kz"
              required
              style={inputStyle}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: '#CCC' }}>
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <p className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.12)', color: '#F87171' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl py-3 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: '#F5A623', color: '#111' }}
          >
            {loading ? 'Вхожу…' : 'Войти →'}
          </button>
        </form>

        <div className="mt-5 text-center text-xs" style={{ color: '#555' }}>
          <Link to="/" style={{ color: '#777', textDecoration: 'none' }}>
            ← Вернуться к карте
          </Link>
        </div>
      </div>
    </div>
  )
}
