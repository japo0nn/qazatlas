import { useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useEmblaCarousel from 'embla-carousel-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Attraction } from '../types/attraction'

const CATEGORY_LABELS: Record<string, string> = {
  HISTORICAL:    'Исторические',
  NATURE:        'Природа',
  ARCHITECTURAL: 'Архитектура',
  CULTURAL:      'Культура',
}
const CATEGORY_COLORS: Record<string, string> = {
  HISTORICAL:    '#F5A623',
  NATURE:        '#22C55E',
  ARCHITECTURAL: '#3B82F6',
  CULTURAL:      '#EF4444',
}

function Carousel({ images }: { images: Array<{ url: string }> }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: images.length > 1 })
  const prev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const next = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

  const btnBase: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.55)',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    lineHeight: 1,
    backdropFilter: 'blur(4px)',
    zIndex: 2,
  }

  return (
    <div style={{ position: 'relative', background: '#000', flexShrink: 0 }}>
      <div ref={emblaRef} style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex' }}>
          {images.map((img, i) => (
            <div key={i} style={{ flex: '0 0 100%', minWidth: 0 }}>
              <img
                src={img.url}
                alt=""
                style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' }}
              />
            </div>
          ))}
        </div>
      </div>
      {images.length > 1 && (
        <>
          <button onClick={prev} style={{ ...btnBase, left: 10 }}>‹</button>
          <button onClick={next} style={{ ...btnBase, right: 10 }}>›</button>
          {/* Dot count */}
          <div style={{
            position: 'absolute', bottom: 10, left: 0, right: 0,
            display: 'flex', justifyContent: 'center', gap: 5, zIndex: 2,
          }}>
            {images.map((_, i) => (
              <span
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                style={{
                  width: 6, height: 6, borderRadius: '50%', cursor: 'pointer',
                  background: 'rgba(255,255,255,0.7)',
                  display: 'inline-block',
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

interface Props {
  attraction: Attraction | null
  onClose: () => void
}

export default function AttractionModal({ attraction, onClose }: Props) {
  const color = attraction ? (CATEGORY_COLORS[attraction.category] ?? '#888') : '#888'

  return (
    <AnimatePresence>
      {attraction && (
        <>
          {/* Backdrop */}
          <motion.div
            style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.35)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Slide-in panel */}
          <motion.div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 'min(560px, 100vw)',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--surface)',
              borderLeft: '1px solid var(--border)',
              overflow: 'hidden',
            }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                zIndex: 10,
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: 18,
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(4px)',
              }}
              aria-label="Закрыть"
            >
              ×
            </button>

            {/* Carousel / placeholder */}
            {(attraction.images?.length ?? 0) > 0 ? (
              <Carousel images={attraction.images!} />
            ) : (
              <div style={{
                height: 180, flexShrink: 0,
                background: 'var(--surface-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>Нет фотографий</span>
              </div>
            )}

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 36px' }}>
              {/* Category */}
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color,
                marginBottom: 8,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, display: 'inline-block' }} />
                {CATEGORY_LABELS[attraction.category] ?? attraction.category}
              </span>

              {/* Title */}
              <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: '0 0 4px' }}>
                {attraction.name}
              </h2>

              {/* Region */}
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 20px' }}>
                {attraction.region}
              </p>

              {/* Divider */}
              {attraction.description && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
                  <div className="md-prose">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {attraction.description}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
