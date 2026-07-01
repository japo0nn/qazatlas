import { Link } from 'react-router-dom'
import AdminLayout from '../components/admin/AdminLayout'
import { useAttractions } from '../hooks/useAttractions'
import { deleteAttraction } from '../api/attractions'
import type { Category } from '../types/attraction'

const CATEGORY_META: Record<Category, { label: string; color: string }> = {
  HISTORICAL: { label: 'Исторические', color: '#F5A623' },
  NATURE: { label: 'Природа', color: '#22C55E' },
  ARCHITECTURAL: { label: 'Архитектура', color: '#3B82F6' },
  CULTURAL: { label: 'Культура', color: '#EF4444' },
}

function CategoryBadge({ category }: { category: Category }) {
  const { label, color } = CATEGORY_META[category] ?? { label: category, color: '#888' }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: `${color}20`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: color }} />
      {label}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default function AdminDashboard() {
  const { attractions, loading, error, reload } = useAttractions()

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Удалить «${name}»? Действие необратимо.`)) return
    try {
      await deleteAttraction(id)
      reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления')
    }
  }

  return (
    <AdminLayout>
      <div className="px-8 py-8">
        {/* Header */}
        <div className="mb-7 flex items-end justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest" style={{ color: '#555' }}>
              Панель администратора
            </p>
            <h1 className="text-2xl font-bold text-white">Точки</h1>
            {!loading && (
              <p className="mt-0.5 text-sm" style={{ color: '#666' }}>
                {attractions.length} достопримечательностей
              </p>
            )}
          </div>
          <Link
            to="/admin/points/new"
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: '#F5A623', color: '#111', textDecoration: 'none' }}
          >
            + Новая точка
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <span style={{ color: '#555', fontSize: 14 }}>Загружаю…</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-2xl px-5 py-4 text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171' }}>
            {error}
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <div className="overflow-hidden rounded-2xl" style={{ border: '1px solid rgba(255,255,255,0.07)', background: '#1A1A1A' }}>
            {attractions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm" style={{ color: '#555' }}>Точек пока нет</p>
                <Link
                  to="/admin/points/new"
                  className="mt-3 text-sm font-medium transition-opacity hover:opacity-70"
                  style={{ color: '#F5A623', textDecoration: 'none' }}
                >
                  Добавить первую →
                </Link>
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['Название', 'Регион', 'Категория', 'Дата', 'Действия'].map(col => (
                      <th
                        key={col}
                        className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ color: '#555' }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {attractions.map((attr, i) => (
                    <tr
                      key={attr.id}
                      style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : undefined }}
                    >
                      <td className="px-5 py-4 font-medium text-white">{attr.name}</td>
                      <td className="px-5 py-4 text-sm" style={{ color: '#888' }}>{attr.region}</td>
                      <td className="px-5 py-4">
                        <CategoryBadge category={attr.category} />
                      </td>
                      <td className="px-5 py-4 tabular-nums text-sm" style={{ color: '#666' }}>
                        {formatDate(attr.created_at)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/admin/points/${attr.id}/edit`}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-70"
                            style={{
                              background: 'rgba(255,255,255,0.07)',
                              color: '#CCC',
                              textDecoration: 'none',
                            }}
                          >
                            Изменить
                          </Link>
                          <button
                            onClick={() => handleDelete(attr.id, attr.name)}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-70"
                            style={{ background: 'rgba(239,68,68,0.12)', color: '#F87171' }}
                          >
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
