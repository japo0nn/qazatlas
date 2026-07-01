import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import useEmblaCarousel from 'embla-carousel-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getAttraction } from '../api/attractions'
import { Header } from '../components/Header'
import type { Attraction } from '../types/attraction'

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

function Carousel({ images }: { images: Array<{ url: string }> }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: images.length > 1 })
  const [current, setCurrent] = useState(0)

  const prev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const next = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setCurrent(emblaApi.selectedScrollSnap())
    emblaApi.on('select', onSelect)
    return () => { emblaApi.off('select', onSelect) }
  }, [emblaApi])

  const btnStyle: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.55)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    backdropFilter: 'blur(4px)',
    zIndex: 2,
  }

  return (
    <div style={{ position: 'relative', background: '#000', width: '100%' }}>
      <div ref={emblaRef} style={{ overflow: 'hidden', width: '100%' }}>
        <div style={{ display: 'flex' }}>
          {images.map((img, i) => (
            <div key={i} style={{ flex: '0 0 100%', minWidth: 0, position: 'relative', overflow: 'hidden' }}>
              {/* Blurred backdrop — same image, cover + scale to hide blur edges */}
              <img
                src={img.url}
                alt=""
                aria-hidden="true"
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  objectFit: 'cover',
                  filter: 'blur(28px)',
                  transform: 'scale(1.18)',
                  opacity: 0.55,
                }}
              />
              {/* Dark scrim for contrast */}
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.28)' }} />
              {/* Main image — contain, full resolution visible */}
              <img
                src={img.url}
                alt=""
                className="hero-image"
                style={{ width: '100%', position: 'relative', zIndex: 1 }}
              />
            </div>
          ))}
        </div>
      </div>
      {images.length > 1 && (
        <>
          <button onClick={prev} style={{ ...btnStyle, left: 16 }}>‹</button>
          <button onClick={next} style={{ ...btnStyle, right: 16 }}>›</button>
          <div style={{
            position: 'absolute', bottom: 14, left: 0, right: 0,
            display: 'flex', justifyContent: 'center', gap: 6, zIndex: 2,
          }}>
            {images.map((_, i) => (
              <span
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                style={{
                  width: i === current ? 18 : 6,
                  height: 6,
                  borderRadius: 9999,
                  cursor: 'pointer',
                  background: i === current ? '#fff' : 'rgba(255,255,255,0.45)',
                  display: 'inline-block',
                  transition: 'all 0.2s',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function AttractionPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [attraction, setAttraction] = useState<Attraction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getAttraction(id)
      .then(setAttraction)
      .catch(e => setError(e.message ?? 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [id])

  const color = attraction ? (CATEGORY_COLORS[attraction.category] ?? '#888') : '#888'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header showBack onBack={() => navigate(-1)} regionLabel={attraction?.region} />

      <main style={{ paddingTop: 60 }}>
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
            <span style={{ color: 'var(--muted)', fontSize: 14 }}>Загрузка…</span>
          </div>
        )}

        {error && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
            <span style={{ color: '#ef4444', fontSize: 14 }}>{error}</span>
          </div>
        )}

        {attraction && (
          <>
            {(attraction.images?.length ?? 0) > 0 ? (
              <Carousel images={attraction.images!} />
            ) : (
              <div className="hero-image" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--surface-2)',
              }}>
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>Нет фотографий</span>
              </div>
            )}

            <div className="mx-auto max-w-[760px] px-4 pt-7 pb-20 sm:px-6 sm:pt-9 sm:pb-24">
              {/* Category */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color,
                marginBottom: 12,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
                {CATEGORY_LABELS[attraction.category] ?? attraction.category}
              </span>

              {/* Title */}
              <h1 className="text-2xl sm:text-[32px]" style={{ fontWeight: 700, color: 'var(--text)', margin: '0 0 8px', lineHeight: 1.2 }}>
                {attraction.name}
              </h1>

              {/* Region */}
              <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 32px', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ opacity: 0.6, flexShrink: 0 }}>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                {attraction.region}
              </p>

              <div style={{ borderTop: '1px solid var(--border)', marginBottom: 32 }} />

              {attraction.description ? (
                <div className="md-prose">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {attraction.description}
                  </ReactMarkdown>
                </div>
              ) : (
                <p style={{ color: 'var(--muted)', fontSize: 14 }}>Описание не добавлено.</p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
