import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useMotionValue, animate } from 'framer-motion'
import type { Attraction } from '../types/attraction'

export const DRAWER_W = 360

const CATEGORY_LABELS: Record<string, string> = {
  HISTORICAL: 'Исторические',
  NATURE: 'Природа',
  ARCHITECTURAL: 'Архитектура',
  CULTURAL: 'Культура',
}
const CATEGORY_COLORS: Record<string, string> = {
  HISTORICAL: '#F5A623',
  NATURE: '#22C55E',
  ARCHITECTURAL: '#3B82F6',
  CULTURAL: '#EF4444',
}

function stripMd(text: string): string {
  return text
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`>]/g, '')
    .replace(/\n+/g, ' ')
    .trim()
}

interface CardProps {
  attraction: Attraction
  onClick: () => void
}

function AttractionCard({ attraction, onClick }: CardProps) {
  const img = attraction.images?.[0]?.url
  const color = CATEGORY_COLORS[attraction.category] ?? '#888'
  const raw = attraction.description ? stripMd(attraction.description) : ''
  const desc = raw.length > 90 ? raw.slice(0, 90) + '…' : raw

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        gap: 12,
        padding: '12px 16px',
        cursor: 'pointer',
        borderBottom: '1px solid var(--border)',
        transition: 'background 0.12s',
        contentVisibility: 'auto',
        containIntrinsicSize: '0 96px',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Thumbnail */}
      <div style={{
        width: 72, height: 72, flexShrink: 0,
        borderRadius: 10, overflow: 'hidden',
        background: 'var(--surface-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {img
          ? <img src={img} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--muted)', opacity: 0.5 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
        }
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {attraction.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
          {CATEGORY_LABELS[attraction.category] ?? attraction.category}
        </div>
        {desc && (
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {desc}
          </div>
        )}
      </div>
    </div>
  )
}

interface SearchInputProps {
  value: string
  onChange: (v: string) => void
}

function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      margin: '12px 16px',
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 10, padding: '8px 12px',
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ color: 'var(--muted)', flexShrink: 0 }}>
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Поиск…"
        style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text)', minWidth: 0 }}
      />
      {value && (
        <button onClick={() => onChange('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
      )}
    </div>
  )
}

interface Props {
  attractions: Attraction[]
  selectedRegion: string | null
}

export default function AttractionsDrawer({ attractions, selectedRegion }: Props) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const filtered = useMemo(() => {
    let list = selectedRegion
      ? attractions.filter(a => a.region === selectedRegion)
      : attractions
    const q = query.trim().toLowerCase()
    if (q) list = list.filter(a => a.name.toLowerCase().includes(q) || a.region.toLowerCase().includes(q))
    return list
  }, [attractions, selectedRegion, query])

  const title = selectedRegion ?? 'Все достопримечательности'
  const count = filtered.length

  const handleClick = (a: Attraction) => navigate(`/attractions/${a.id}`)

  const panelContent = (
    <>
      {/* Header */}
      <div style={{
        padding: '16px 16px 0',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', paddingBottom: 12 }}>
          {count} {count === 1 ? 'объект' : count >= 2 && count <= 4 ? 'объекта' : 'объектов'}
        </div>
      </div>

      {/* Search */}
      <SearchInput value={query} onChange={setQuery} />

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            Ничего не найдено
          </div>
        ) : (
          filtered.map(a => (
            <AttractionCard key={a.id} attraction={a} onClick={() => handleClick(a)} />
          ))
        )}
      </div>
    </>
  )

  // ── Mobile bottom sheet ──────────────────────────────────────────────
  const HEADER_H = 60
  const windowH = typeof window !== 'undefined' ? window.innerHeight : 800
  const SHEET_H = windowH - HEADER_H
  const SNAP_PEEK = SHEET_H - 220
  const SNAP_EXPANDED = 0
  const SNAP_COLLAPSED = SHEET_H - 52

  const y = useMotionValue(SNAP_PEEK)

  const onDragEnd = (_: unknown, info: { velocity: { y: number }; point: { y: number } }) => {
    const cur = y.get()
    const vel = info.velocity.y
    let target: number
    if (vel < -500 || cur < SHEET_H * 0.35) target = SNAP_EXPANDED
    else if (vel > 500 || cur > SHEET_H * 0.65) target = SNAP_COLLAPSED
    else target = SNAP_PEEK
    animate(y, target, { type: 'spring', damping: 28, stiffness: 260 })
  }

  if (!isMobile) {
    return (
      <div
        style={{
          position: 'fixed',
          top: HEADER_H,
          right: 0,
          bottom: 0,
          width: DRAWER_W,
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          zIndex: 15,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {panelContent}
      </div>
    )
  }

  return (
    <motion.div
      drag="y"
      dragConstraints={{ top: SNAP_EXPANDED, bottom: SNAP_COLLAPSED }}
      dragElastic={{ top: 0.05, bottom: 0.1 }}
      style={{
        y,
        position: 'fixed',
        left: 0,
        right: 0,
        top: HEADER_H,
        height: SHEET_H,
        background: 'var(--surface)',
        borderRadius: '18px 18px 0 0',
        borderTop: '1px solid var(--border)',
        zIndex: 15,
        display: 'flex',
        flexDirection: 'column',
        touchAction: 'none',
      }}
      onDragEnd={onDragEnd}
    >
      {/* Drag handle */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4, flexShrink: 0 }}>
        <div style={{ width: 36, height: 4, borderRadius: 9999, background: 'var(--border)' }} />
      </div>
      {panelContent}
    </motion.div>
  )
}
