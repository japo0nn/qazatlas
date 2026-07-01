import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import MDEditor from '@uiw/react-md-editor'
import AdminLayout from '../components/admin/AdminLayout'
import MapPicker from '../components/admin/MapPicker'
import { REGIONS } from '../constants/regions'
import type { Category } from '../types/attraction'
import { getAttraction, createAttraction, updateAttraction, deleteAttraction } from '../api/attractions'
import { uploadImage, addImageRecord, deleteImage, reorderImages } from '../api/images'

// ── Types ──────────────────────────────────────────────────────────────
interface ImageItem {
  id: string         // stable UI key
  url: string        // public URL or object URL for preview
  file?: File        // present only for not-yet-uploaded images (create mode)
  dbId?: string      // attraction_images.id (undefined until saved to DB)
}

const CATEGORIES: { value: Category; label: string; color: string }[] = [
  { value: 'HISTORICAL',    label: 'Исторические', color: '#F5A623' },
  { value: 'NATURE',        label: 'Природа',      color: '#22C55E' },
  { value: 'ARCHITECTURAL', label: 'Архитектура',  color: '#3B82F6' },
  { value: 'CULTURAL',      label: 'Культура',     color: '#EF4444' },
]

// ── SortableImage ───────────────────────────────────────────────────────
function SortableImage({
  image,
  index,
  onDelete,
}: {
  image: ImageItem
  index: number
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: 'relative',
        width: 100,
        height: 100,
        borderRadius: 10,
        overflow: 'hidden',
        flexShrink: 0,
        cursor: 'grab',
        border: index === 0 ? '2px solid #F5A623' : '2px solid transparent',
      }}
      {...attributes}
      {...listeners}
    >
      <img
        src={image.url}
        alt=""
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        draggable={false}
      />
      {/* Delete button */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        style={{
          position: 'absolute',
          top: 4,
          right: 4,
          width: 22,
          height: 22,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.7)',
          color: '#FFF',
          border: 'none',
          cursor: 'pointer',
          fontSize: 12,
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Удалить"
      >
        ×
      </button>
      {index === 0 && (
        <span
          style={{
            position: 'absolute',
            bottom: 4,
            left: 4,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.05em',
            background: '#F5A623',
            color: '#111',
            padding: '1px 5px',
            borderRadius: 4,
          }}
        >
          ГЛАВНОЕ
        </span>
      )}
    </div>
  )
}

// ── PointEditor ─────────────────────────────────────────────────────────
interface PointEditorProps {
  mode: 'create' | 'edit'
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1E1E1E',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '11px 14px',
  color: '#E8E8E8',
  fontSize: 14,
  outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 13,
  fontWeight: 500,
  color: '#999',
}

export default function PointEditor({ mode }: PointEditorProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [region, setRegion] = useState<string>(REGIONS[0])
  const [category, setCategory] = useState<Category>('HISTORICAL')
  const [lat, setLat] = useState(48.0196)
  const [lng, setLng] = useState(66.9237)
  const [description, setDescription] = useState('')
  const [images, setImages] = useState<ImageItem[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [loadingData, setLoadingData] = useState(mode === 'edit')
  const [saving, setSaving] = useState(false)
  const [pageError, setPageError] = useState<string | null>(null)
  const attractionIdRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // Load existing data in edit mode
  useEffect(() => {
    if (mode !== 'edit' || !id) return
    getAttraction(id)
      .then((attr) => {
        attractionIdRef.current = attr.id
        setName(attr.name)
        setRegion(attr.region)
        setCategory(attr.category)
        setLat(attr.lat)
        setLng(attr.lng)
        setDescription(attr.description ?? '')
        setImages(
          (attr.images ?? []).map((img) => ({
            id: img.id,
            url: img.url,
            dbId: img.id,
          })),
        )
      })
      .catch((err) => setPageError(err.message))
      .finally(() => setLoadingData(false))
  }, [mode, id])

  // ── Image handling ──────────────────────────────────────────────────
  const handleFiles = useCallback(
    async (files: File[]) => {
      const valid = files.filter((f) => f.type.startsWith('image/'))
      if (!valid.length) return

      if (mode === 'edit' && attractionIdRef.current) {
        // Upload immediately in edit mode
        for (const file of valid) {
          try {
            const url = await uploadImage(file, attractionIdRef.current)
            const orderIndex = images.length
            const record = await addImageRecord(attractionIdRef.current, url, orderIndex)
            setImages((prev) => [...prev, { id: record.id, url, dbId: record.id }])
          } catch (err) {
            setPageError(err instanceof Error ? err.message : 'Ошибка загрузки изображения')
          }
        }
      } else {
        // Create mode: local preview, upload on save
        setImages((prev) => [
          ...prev,
          ...valid.map((file) => ({
            id: crypto.randomUUID(),
            url: URL.createObjectURL(file),
            file,
          })),
        ])
      }
    },
    [mode, images.length],
  )

  const handleDeleteImage = async (item: ImageItem) => {
    if (item.dbId) {
      try {
        await deleteImage(item.dbId, item.url)
      } catch (err) {
        setPageError(err instanceof Error ? err.message : 'Ошибка удаления изображения')
        return
      }
    } else if (item.file) {
      URL.revokeObjectURL(item.url)
    }
    setImages((prev) => prev.filter((img) => img.id !== item.id))
  }

  const handleDndEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = images.findIndex((img) => img.id === active.id)
    const newIdx = images.findIndex((img) => img.id === over.id)
    const reordered = arrayMove(images, oldIdx, newIdx)
    setImages(reordered)
    const toUpdate = reordered
      .filter((img) => img.dbId)
      .map((img, i) => ({ id: img.dbId!, order_index: i }))
    if (toUpdate.length > 0) {
      reorderImages(toUpdate).catch(() => {}) // non-critical
    }
  }

  // ── Save ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) { setPageError('Введите название'); return }
    setSaving(true)
    setPageError(null)

    try {
      if (mode === 'create') {
        const attr = await createAttraction({
          name: name.trim(),
          region,
          category,
          lat,
          lng,
          description,
        })
        // Upload images collected during form fill
        for (let i = 0; i < images.length; i++) {
          const img = images[i]
          if (img.file) {
            const url = await uploadImage(img.file, attr.id)
            await addImageRecord(attr.id, url, i)
            URL.revokeObjectURL(img.url)
          }
        }
      } else {
        if (!attractionIdRef.current) return
        await updateAttraction(attractionIdRef.current, {
          name: name.trim(),
          region,
          category,
          lat,
          lng,
          description,
        })
      }
      navigate('/admin/dashboard')
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!attractionIdRef.current) return
    if (!window.confirm(`Удалить «${name}»? Действие необратимо.`)) return
    try {
      await deleteAttraction(attractionIdRef.current)
      navigate('/admin/dashboard')
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Ошибка удаления')
    }
  }

  if (loadingData) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-32">
          <span style={{ color: '#555' }}>Загружаю…</span>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-3xl px-8 py-8">
        {/* Page title */}
        <h1 className="mb-7 text-2xl font-bold text-white">
          {mode === 'create' ? 'Новая точка' : `Редактировать: ${name}`}
        </h1>

        {pageError && (
          <div
            className="mb-5 rounded-xl px-4 py-3 text-sm"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#F87171' }}
          >
            {pageError}
          </div>
        )}

        <div className="space-y-6">

          {/* ── Название ── */}
          <div>
            <label style={labelStyle}>Название</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Байтерек"
              style={inputStyle}
            />
          </div>

          {/* ── Регион ── */}
          <div>
            <label style={labelStyle}>Регион</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* ── Категория ── */}
          <div>
            <label style={labelStyle}>Категория</label>
            <div className="flex flex-wrap gap-2 pt-1">
              {CATEGORIES.map(({ value, label, color }) => {
                const active = category === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCategory(value)}
                    className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
                    style={{
                      background: active ? `${color}22` : 'rgba(255,255,255,0.05)',
                      border: active ? `1.5px solid ${color}` : '1.5px solid transparent',
                      color: active ? color : '#888',
                    }}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ background: color, opacity: active ? 1 : 0.5 }}
                    />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Координаты ── */}
          <div>
            <label style={labelStyle}>Координаты — нажмите на карту или перетащите маркер</label>
            <MapPicker
              lat={lat}
              lng={lng}
              onChange={(newLat, newLng) => {
                setLat(+newLat.toFixed(6))
                setLng(+newLng.toFixed(6))
              }}
            />
            <div className="mt-2.5 flex gap-3">
              <div className="flex-1">
                <label style={{ ...labelStyle, marginBottom: 4 }}>Широта</label>
                <input
                  type="number"
                  step="0.000001"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
              <div className="flex-1">
                <label style={{ ...labelStyle, marginBottom: 4 }}>Долгота</label>
                <input
                  type="number"
                  step="0.000001"
                  value={lng}
                  onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* ── Изображения ── */}
          <div>
            <label style={labelStyle}>
              Изображения
              {images.length > 0 && <span style={{ color: '#555', marginLeft: 6 }}>{images.length}</span>}
            </label>

            {/* Drop zone */}
            <div
              onDrop={(e) => {
                e.preventDefault()
                setIsDragOver(false)
                handleFiles(Array.from(e.dataTransfer.files))
              }}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer items-center justify-center rounded-xl py-8 text-center transition-colors"
              style={{
                border: `2px dashed ${isDragOver ? '#F5A623' : 'rgba(255,255,255,0.12)'}`,
                background: isDragOver ? 'rgba(245,166,35,0.06)' : 'rgba(255,255,255,0.02)',
              }}
            >
              <div>
                <p className="text-sm" style={{ color: '#777' }}>
                  Перетащите изображения или{' '}
                  <span style={{ color: '#F5A623' }}>нажмите для выбора</span>
                </p>
                <p className="mt-1 text-xs" style={{ color: '#555' }}>PNG, JPG, WEBP · Первое фото — главное</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
            />

            {/* Previews with DnD */}
            {images.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDndEnd}>
                <SortableContext items={images.map(img => img.id)} strategy={horizontalListSortingStrategy}>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {images.map((img, i) => (
                      <SortableImage
                        key={img.id}
                        image={img}
                        index={i}
                        onDelete={() => handleDeleteImage(img)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* ── Описание (MD) ── */}
          <div>
            <label style={labelStyle}>Описание (Markdown)</label>
            <div data-color-mode="dark">
              <MDEditor
                value={description}
                onChange={(val) => setDescription(val ?? '')}
                height={320}
                preview="live"
              />
            </div>
          </div>
        </div>

        {/* ── Actions ── */}
        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: '#F5A623', color: '#111' }}
          >
            {saving ? 'Сохраняю…' : mode === 'create' ? 'Создать точку' : 'Сохранить'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/admin/dashboard')}
            className="rounded-xl px-5 py-3 text-sm font-medium transition-opacity hover:opacity-70"
            style={{ background: 'rgba(255,255,255,0.07)', color: '#CCC' }}
          >
            Отмена
          </button>

          {mode === 'edit' && (
            <button
              type="button"
              onClick={handleDelete}
              className="ml-auto rounded-xl px-5 py-3 text-sm font-medium transition-opacity hover:opacity-70"
              style={{ background: 'rgba(239,68,68,0.12)', color: '#F87171' }}
            >
              Удалить точку
            </button>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
