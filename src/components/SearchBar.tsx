import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Attraction } from '../types/attraction'

const CATEGORY_COLORS: Record<string, string> = {
  HISTORICAL:    '#F5A623',
  NATURE:        '#22C55E',
  ARCHITECTURAL: '#3B82F6',
  CULTURAL:      '#EF4444',
}

const CATEGORY_LABELS: Record<string, string> = {
  HISTORICAL:    'Исторические',
  NATURE:        'Природа',
  ARCHITECTURAL: 'Архитектура',
  CULTURAL:      'Культура',
}

function highlight(text: string, query: string) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'var(--accent)', color: 'var(--accent-fg)', borderRadius: 3, padding: '0 2px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

interface Props {
  attractions: Attraction[]
}

export default function SearchBar({ attractions }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const q = query.trim().toLowerCase()
  const results = q.length < 1 ? [] : attractions
    .filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.region.toLowerCase().includes(q) ||
      (CATEGORY_LABELS[a.category] ?? '').toLowerCase().includes(q)
    )
    .slice(0, 8)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const select = (a: Attraction) => {
    setQuery('')
    setOpen(false)
    navigate(`/attractions/${a.id}`)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open || !results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      select(results[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div
      ref={rootRef}
      style={{ position: 'relative', width: '100%' }}
    >
      {/* Input */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: open && results.length ? '12px 12px 0 0' : 12,
        padding: '9px 14px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        transition: 'border-radius 0.1s',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
          style={{ color: 'var(--muted)', flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setActiveIdx(-1) }}
          onFocus={() => { if (q) setOpen(true) }}
          onKeyDown={handleKey}
          placeholder="Поиск достопримечательностей…"
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            fontSize: 13,
            color: 'var(--text)',
            minWidth: 0,
          }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus() }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--muted)', fontSize: 16, lineHeight: 1,
              padding: 0, display: 'flex', alignItems: 'center',
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderTop: 'none',
          borderRadius: '0 0 12px 12px',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
          zIndex: 50,
          maxHeight: 360,
          overflowY: 'auto',
        }}>
          {results.map((a, i) => {
            const color = CATEGORY_COLORS[a.category] ?? '#888'
            const isActive = i === activeIdx
            return (
              <div
                key={a.id}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseDown={() => select(a)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  background: isActive ? 'var(--surface-2)' : 'transparent',
                  borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'background 0.1s',
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: color, flexShrink: 0,
                }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {highlight(a.name, query.trim())}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                    {a.region} · {CATEGORY_LABELS[a.category] ?? a.category}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* No results */}
      {open && q.length >= 1 && results.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderTop: 'none',
          borderRadius: '0 0 12px 12px',
          padding: '12px 14px',
          fontSize: 13,
          color: 'var(--muted)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
          zIndex: 50,
        }}>
          Ничего не найдено
        </div>
      )}
    </div>
  )
}
