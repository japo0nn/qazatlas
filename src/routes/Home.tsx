import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Header } from '../components/Header'
import { useAttractions } from '../hooks/useAttractions'
import AttractionsDrawer from '../components/AttractionsDrawer'

type PolygonGeometry = {
  type: 'Polygon'
  coordinates: number[][][]
}

type MultiPolygonGeometry = {
  type: 'MultiPolygon'
  coordinates: number[][][][]
}

type GeoJsonFeature = {
  type: 'Feature'
  geometry: PolygonGeometry | MultiPolygonGeometry
  properties: Record<string, any>
}

type GeoJsonFeatureCollection = {
  type: 'FeatureCollection'
  features: GeoJsonFeature[]
}

function getBounds(geometry: PolygonGeometry | MultiPolygonGeometry): [[number, number], [number, number]] {
  const b = { minX: 180, minY: 90, maxX: -180, maxY: -90 }
  const addRing = (ring: number[][]) => {
    ring.forEach(([x, y]) => {
      b.minX = Math.min(b.minX, x); b.minY = Math.min(b.minY, y)
      b.maxX = Math.max(b.maxX, x); b.maxY = Math.max(b.maxY, y)
    })
  }
  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach(addRing)
  } else {
    geometry.coordinates.forEach((p) => p.forEach(addRing))
  }
  return [[b.minX, b.minY], [b.maxX, b.maxY]]
}

/**
 * World polygon with Kazakhstan as a hole — used for the outside-dimming mask.
 * Reversing GADM ring (CCW → CW) creates a valid GeoJSON hole.
 */
function createWorldMask(geometry: PolygonGeometry | MultiPolygonGeometry): GeoJsonFeature {
  const world: number[][] = [[-180, -90], [-180, 90], [180, 90], [180, -90], [-180, -90]]
  const coordinates: number[][][] = [world]
  if (geometry.type === 'Polygon') {
    coordinates.push([...geometry.coordinates[0]].reverse())
  } else {
    geometry.coordinates.forEach((poly) => coordinates.push([...poly[0]].reverse()))
  }
  return { type: 'Feature', geometry: { type: 'Polygon', coordinates }, properties: {} }
}

const REGION_SRC = 'kazakhstan-regions'
const COUNTRY_SRC = 'kazakhstan-country'
const MASK_SRC = 'world-mask'
const PINS_SRC = 'attractions-pins'
const PINS_LAYER = 'attractions-circles'
const PINS_LAYER_HALO = 'attractions-circles-halo'
const CLUSTER_LAYER = 'attractions-clusters'
const CLUSTER_COUNT_LAYER = 'attractions-cluster-count'

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

/** Theme-specific map colors */
const palette = {
  dark: {
    border: 'rgba(245, 166, 35, 0.8)',
    borderHover: 'rgba(245, 166, 35, 1)',
    fill: 'rgba(245, 166, 35, 0.09)',
    countryBorder: 'rgba(245, 166, 35, 0.9)',
    glowColor: 'rgba(245, 166, 35, 0.35)',
    maskFill: '#191a1a',   // matches dark-v11 land base — blends naturally
    maskOpacity: 0.55,
  },
  light: {
    border: 'rgba(45, 58, 140, 0.75)',
    borderHover: '#2D3A8C',
    fill: 'rgba(45, 58, 140, 0.07)',
    countryBorder: '#2D3A8C',
    glowColor: 'rgba(45, 58, 140, 0.2)',
    maskFill: '#C8C2B8',   // warm stone tint — matches light bg palette
    maskOpacity: 0.28,
  },
}

export default function Home() {
  const [theme, setTheme] = useState<'dark' | 'light'>('light')
  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [regionsGeojson, setRegionsGeojson] = useState<GeoJsonFeatureCollection | null>(null)
  const [countryGeojson, setCountryGeojson] = useState<GeoJsonFeature | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null)

  const { attractions } = useAttractions()
  const navigate = useNavigate()

  const mapRef = useRef<mapboxgl.Map | null>(null)
  const currentStyleRef = useRef('')
  const eventsAttached = useRef(false)
  const popupRef = useRef<mapboxgl.Popup | null>(null)
  const attractionsRef = useRef<typeof attractions>([])
  const pendingMoveEndRef = useRef<(() => void) | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // Refs — always fresh inside Mapbox callbacks (no stale closures)
  const regionsGeojsonRef = useRef<GeoJsonFeatureCollection | null>(null)
  const countryGeojsonRef = useRef<GeoJsonFeature | null>(null)
  const themeRef = useRef<'dark' | 'light'>('light')
  const hoveredIdRef = useRef<number | string | null>(null)
  const selectedRegionRef = useRef<string | null>(null)

  // Theme listener
  useEffect(() => {
    const root = document.documentElement
    const initial = root.classList.contains('dark') ? 'dark' : 'light'
    themeRef.current = initial
    setTheme(initial)

    const onTheme = (e: Event) => {
      const ev = e as CustomEvent<{ theme: 'dark' | 'light' }>
      if (ev.detail?.theme) {
        themeRef.current = ev.detail.theme
        setTheme(ev.detail.theme)
      }
    }
    window.addEventListener('qazatlas-theme-change', onTheme)
    return () => window.removeEventListener('qazatlas-theme-change', onTheme)
  }, [])

  // Load GeoJSON — set refs before state so callbacks see fresh data
  useEffect(() => {
    const load = async () => {
      try {
        const [rRes, cRes] = await Promise.all([
          fetch(`${import.meta.env.BASE_URL}/qazatlas/data/kazakhstan-regions.geojson`),
          fetch(`${import.meta.env.BASE_URL}/qazatlas/data/kazakhstan-country.json`),
        ])
        if (!rRes.ok || !cRes.ok) throw new Error('Не удалось загрузить GeoJSON данные.')
        const regionsData: GeoJsonFeatureCollection = await rRes.json()
        const countryData: GeoJsonFeature = await cRes.json()
        regionsGeojsonRef.current = regionsData
        countryGeojsonRef.current = countryData
        setRegionsGeojson(regionsData)
        setCountryGeojson(countryData)
      } catch (error) {
        setMapError(error instanceof Error ? error.message : 'Ошибка загрузки GeoJSON.')
      }
    }
    load()
  }, [])

  const token = import.meta.env.VITE_MAPBOX_TOKEN

  const setupMapLayers = (map: mapboxgl.Map) => {
    const regions = regionsGeojsonRef.current
    const country = countryGeojsonRef.current
    if (!regions || !country) return

    const isDark = themeRef.current === 'dark'
    const c = isDark ? palette.dark : palette.light

    const remove = (id: string) => {
      if (map.getLayer(id)) map.removeLayer(id)
      if (map.getSource(id)) map.removeSource(id)
    }

    remove('world-mask-fill')
    remove('kazakhstan-region-fill')
    remove('kazakhstan-region-glow')
    remove('kazakhstan-region-borders')
    remove('kazakhstan-country-glow')
    remove('kazakhstan-country-border')
    remove(CLUSTER_COUNT_LAYER)
    remove(CLUSTER_LAYER)
    remove(PINS_LAYER_HALO)
    remove(PINS_LAYER)
    remove(PINS_SRC)
    remove(MASK_SRC)
    remove(REGION_SRC)
    remove(COUNTRY_SRC)

    hoveredIdRef.current = null

    // ── Sources ────────────────────────────────────────────────────────
    map.addSource(MASK_SRC, {
      type: 'geojson',
      data: createWorldMask(country.geometry as PolygonGeometry | MultiPolygonGeometry),
    })
    map.addSource(COUNTRY_SRC, { type: 'geojson', data: country })
    map.addSource(REGION_SRC, { type: 'geojson', data: regions, generateId: true })

    // ── Layers (order matters) ─────────────────────────────────────────

    // 1. Outside-Kazakhstan soft dimmer
    map.addLayer({
      id: 'world-mask-fill',
      type: 'fill',
      source: MASK_SRC,
      paint: {
        'fill-color': c.maskFill,
        'fill-opacity': c.maskOpacity,
      },
    })

    // 2. Region hover fill (transparent by default, tinted on hover)
    map.addLayer({
      id: 'kazakhstan-region-fill',
      type: 'fill',
      source: REGION_SRC,
      paint: {
        'fill-color': c.border,
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          0.1,
          0,
        ],
        'fill-opacity-transition': { duration: 180, delay: 0 },
      },
    })

    // 3. Subtle glow (only dark mode — in light it's too heavy)
    if (isDark) {
      map.addLayer({
        id: 'kazakhstan-region-glow',
        type: 'line',
        source: REGION_SRC,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': c.glowColor,
          'line-width': 5,
          'line-opacity': 0.5,
          'line-blur': 3,
        },
      })
    }

    // 4. Crisp region borders
    map.addLayer({
      id: 'kazakhstan-region-borders',
      type: 'line',
      source: REGION_SRC,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': c.border,
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          2.5,
          1.5,
        ],
        'line-width-transition': { duration: 180, delay: 0 },
        'line-opacity': 0.9,
      },
    })

    // 5. Country outer glow (dark only)
    if (isDark) {
      map.addLayer({
        id: 'kazakhstan-country-glow',
        type: 'line',
        source: COUNTRY_SRC,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': c.glowColor,
          'line-width': 7,
          'line-opacity': 0.4,
          'line-blur': 4,
        },
      })
    }

    // 6. Country outer border
    map.addLayer({
      id: 'kazakhstan-country-border',
      type: 'line',
      source: COUNTRY_SRC,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': c.countryBorder,
        'line-width': 2,
        'line-opacity': 0.95,
      },
    })

    // 7. Attraction pins — clustered GeoJSON source
    map.addSource(PINS_SRC, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterMaxZoom: 13,
      clusterRadius: 44,
    })

    // Cluster bubble
    map.addLayer({
      id: CLUSTER_LAYER,
      type: 'circle',
      source: PINS_SRC,
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': isDark ? '#F5A623' : '#2D3A8C',
        'circle-opacity': 0.92,
        'circle-radius': ['step', ['get', 'point_count'], 20, 5, 26, 15, 32],
        'circle-stroke-width': 2.5,
        'circle-stroke-color': 'rgba(255,255,255,0.88)',
      },
    })

    // Cluster count label
    map.addLayer({
      id: CLUSTER_COUNT_LAYER,
      type: 'symbol',
      source: PINS_SRC,
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 13,
      },
      paint: { 'text-color': '#ffffff' },
    })

    // Halo pulse — rAF-animated, only for unclustered pins
    map.addLayer({
      id: PINS_LAYER_HALO,
      type: 'circle',
      source: PINS_SRC,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': 8,
        'circle-color': ['get', 'color'],
        'circle-opacity': 0,
        'circle-stroke-width': 0,
      },
    })
    // Main dot — unclustered only
    map.addLayer({
      id: PINS_LAYER,
      type: 'circle',
      source: PINS_SRC,
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 4, 6, 8, 11],
        'circle-color': ['get', 'color'],
        'circle-stroke-width': 2.5,
        'circle-stroke-color': 'rgba(255,255,255,0.92)',
      },
    })

    // Re-apply current pins data after style swap
    const region = selectedRegionRef.current
    if (region) {
      const features = attractionsRef.current
        .filter(a => a.region === region)
        .map(a => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [a.lng, a.lat] as [number, number] },
          properties: { id: a.id, name: a.name, color: CATEGORY_COLORS[a.category] ?? '#888' },
        }));
      (map.getSource(PINS_SRC) as mapboxgl.GeoJSONSource).setData({
        type: 'FeatureCollection', features,
      })
    }
  }

  const fitCountry = (map: mapboxgl.Map) => {
    const country = countryGeojsonRef.current
    if (!country) return
    const bounds = getBounds(country.geometry as PolygonGeometry | MultiPolygonGeometry)
    const mob = window.innerWidth < 768
    map.fitBounds(bounds as [mapboxgl.LngLatLike, mapboxgl.LngLatLike], {
      padding: mob
        ? { top: 90, bottom: 60, left: 12, right: 12 }
        : { top: 130, bottom: 90, left: 60, right: 60 },
      maxZoom: 5.8,
      duration: 900,
      essential: true,
    })
  }

  // Map init + theme switching
  useEffect(() => {
    if (!token) {
      setMapError('Токен Mapbox не задан. Проверьте .env и перезапустите dev-сервер.')
      return
    }

    mapboxgl.accessToken = token

    const style = theme === 'dark'
      ? 'mapbox://styles/mapbox/dark-v11'
      : 'mapbox://styles/mapbox/light-v11'

    const onResize = () => mapRef.current?.resize()
    window.addEventListener('resize', onResize)

    if (!mapRef.current) {
      const isMobile = window.innerWidth < 768
      try {
        mapRef.current = new mapboxgl.Map({
          container: 'map',
          style,
          center: [68.5, 48.0],
          zoom: isMobile ? 2.8 : 4.4,
          minZoom: isMobile ? 2.2 : 3.2,
          maxZoom: 7.5,
          scrollZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          dragPan: isMobile,
          dragRotate: false,
          touchZoomRotate: isMobile,
          touchPitch: false,
          keyboard: false,
        })
        currentStyleRef.current = style
      } catch (error) {
        setMapError(error instanceof Error ? error.message : 'Не удалось создать карту.')
        window.removeEventListener('resize', onResize)
        return
      }

      mapRef.current.on('load', () => {
        setMapLoaded(true)
        mapRef.current!.resize()
        fitCountry(mapRef.current!)
        setupMapLayers(mapRef.current!)

        if (!eventsAttached.current && mapRef.current) {
          const map = mapRef.current

          // Hover: feature-state
          map.on('mousemove', 'kazakhstan-region-fill', (e) => {
            if (!e.features?.length) return
            const id = (e.features[0] as any).id
            if (id === undefined) return
            if (hoveredIdRef.current !== null && hoveredIdRef.current !== id) {
              map.setFeatureState({ source: REGION_SRC, id: hoveredIdRef.current }, { hover: false })
            }
            hoveredIdRef.current = id as number
            map.setFeatureState({ source: REGION_SRC, id }, { hover: true })
            map.getCanvas().style.cursor = 'pointer'
          })

          map.on('mouseleave', 'kazakhstan-region-fill', () => {
            if (hoveredIdRef.current !== null) {
              map.setFeatureState({ source: REGION_SRC, id: hoveredIdRef.current }, { hover: false })
            }
            hoveredIdRef.current = null
            map.getCanvas().style.cursor = ''
          })

          // Cluster click → always show list popup
          map.on('click', CLUSTER_LAYER, (e) => {
            const feature = e.features?.[0] as any
            if (!feature) return
            const clusterId: number = feature.properties?.cluster_id
            const coords = (feature.geometry as any).coordinates as [number, number]
            const geoSrc = map.getSource(PINS_SRC) as mapboxgl.GeoJSONSource

            geoSrc.getClusterLeaves(clusterId, 100, 0, (err, leaves) => {
              if (err || !leaves) return
              const items = leaves
                .map(f => `<div class="cluster-item" data-id="${f.properties?.id ?? ''}" style="padding:7px 0;cursor:pointer;font-size:13px;font-weight:600;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:${f.properties?.color ?? '#888'};flex-shrink:0;display:inline-block"></span>${f.properties?.name ?? ''}</div>`)
                .join('')
              const popup = new mapboxgl.Popup({
                closeButton: true,
                maxWidth: '240px',
                className: 'pin-tooltip cluster-list-popup',
              })
                .setLngLat(coords)
                .setHTML(`<div style="max-height:240px;overflow-y:auto;padding-right:4px">${items}</div>`)
                .addTo(map)

              popup.getElement()?.addEventListener('click', ev => {
                const el = (ev.target as HTMLElement).closest('.cluster-item')
                const id = el?.getAttribute('data-id')
                if (id) { popup.remove(); navigate(`/attractions/${id}`) }
              })
            })
          })

          map.on('mouseenter', CLUSTER_LAYER, () => { map.getCanvas().style.cursor = 'pointer' })
          map.on('mouseleave', CLUSTER_LAYER, () => { map.getCanvas().style.cursor = '' })

          // Click attraction circle → navigate to detail page
          map.on('click', PINS_LAYER, (e) => {
            const id = (e.features?.[0] as any)?.properties?.id
            if (id) navigate(`/attractions/${id}`)
          })

          // Hover tooltip on attraction circles
          map.on('mouseenter', PINS_LAYER, (e) => {
            map.getCanvas().style.cursor = 'pointer'
            const feature = e.features?.[0] as any
            if (!feature) return
            const coords = (feature.geometry as any).coordinates as [number, number]
            const name: string = feature.properties?.name ?? ''
            popupRef.current?.remove()
            popupRef.current = new mapboxgl.Popup({
              closeButton: false,
              closeOnClick: false,
              offset: 14,
              className: 'pin-tooltip',
            })
              .setLngLat(coords)
              .setHTML(`<span>${name}</span>`)
              .addTo(map)
          })

          map.on('mouseleave', PINS_LAYER, () => {
            map.getCanvas().style.cursor = ''
            popupRef.current?.remove()
            popupRef.current = null
          })

          // Click region → fitBounds to show full region
          map.on('click', 'kazakhstan-region-fill', (e) => {
            // Ignore if click landed on a pin or cluster
            if (map.queryRenderedFeatures(e.point, { layers: [PINS_LAYER, CLUSTER_LAYER] }).length > 0) return

            const feature = e.features?.[0] as any
            const region: string | undefined = feature?.properties?.NAME_1 ?? feature?.properties?.name
            if (!region) return
            // Same region already selected — ignore
            if (selectedRegionRef.current === region) return

            // e.features[0].geometry is viewport-clipped — use full source geometry
            const allRegions = regionsGeojsonRef.current
            const fullFeature = allRegions?.features.find(f =>
              (f.properties?.NAME_1 ?? f.properties?.name) === region
            )
            if (!fullFeature) return

            selectedRegionRef.current = region
            setSelectedRegion(region)

            const bounds = getBounds(fullFeature.geometry as PolygonGeometry | MultiPolygonGeometry)
            map.fitBounds(bounds as [mapboxgl.LngLatLike, mapboxgl.LngLatLike], {
              padding: { top: 120, bottom: 100, left: 80, right: 80 },
              maxZoom: 7.5,
              duration: 1200,
              essential: true,
            })
          })

          // Click outside Kazakhstan → reset view
          map.on('click', (e) => {
            // Ignore pin / cluster clicks
            if (map.queryRenderedFeatures(e.point, { layers: [PINS_LAYER, CLUSTER_LAYER] }).length > 0) return
            const hits = map.queryRenderedFeatures(e.point, { layers: ['kazakhstan-region-fill'] })
            if (!hits.length) {
              selectedRegionRef.current = null
              setSelectedRegion(null)
              fitCountry(map)
            }
          })

          eventsAttached.current = true
        }
      })

      // Re-add layers after style swap — setupMapLayers reads from refs so always correct
      mapRef.current.on('style.load', () => {
        setupMapLayers(mapRef.current!)
      })

      mapRef.current.on('error', (event) => {
        const message = event.error?.message ?? 'Ошибка загрузки карты.'
        if (/style diff|Unimplemented|failed/i.test(message)) return
        setMapError(message)
      })
    }

    // Theme changed → swap style
    if (mapRef.current && currentStyleRef.current !== style) {
      mapRef.current.setStyle(style)
      currentStyleRef.current = style
      mapRef.current.resize()
    }

    return () => window.removeEventListener('resize', onResize)
  }, [theme, regionsGeojson, countryGeojson])

  // GeoJSON arrived after map already loaded (map-first race)
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.loaded()) return
    fitCountry(map)
    setupMapLayers(map)
  }, [regionsGeojson, countryGeojson])

  // Pin management — update native circle layer after fitBounds animation ends
  useEffect(() => {
    attractionsRef.current = attractions

    const map = mapRef.current

    if (pendingMoveEndRef.current) {
      pendingMoveEndRef.current()
      pendingMoveEndRef.current = null
    }

    // Clear pins immediately
    const src = () => map?.getSource(PINS_SRC) as mapboxgl.GeoJSONSource | undefined
    src()?.setData({ type: 'FeatureCollection', features: [] })

    if (!map || !mapLoaded || !selectedRegion) return

    const targetRegion = selectedRegion
    const features = attractions
      .filter(a => a.region === targetRegion)
      .map(a => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [a.lng, a.lat] as [number, number] },
        properties: { id: a.id, name: a.name, color: CATEGORY_COLORS[a.category] ?? '#888' },
      }))

    const showPins = () => {
      map.off('moveend', showPins)
      pendingMoveEndRef.current = null
      if (selectedRegionRef.current !== targetRegion) return
      src()?.setData({ type: 'FeatureCollection', features })
    }

    pendingMoveEndRef.current = () => map.off('moveend', showPins)
    map.on('moveend', showPins)
  }, [selectedRegion, attractions, mapLoaded])

  // Pulse animation — animates PINS_LAYER_HALO radius/opacity each rAF frame
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    const DOT_BASE = 8 // keep in sync with circle-radius base in setupMapLayers

    const animate = (time: number) => {
      const t = (time % 2200) / 2200 // 0→1 over 2.2 s
      const eased = 1 - (1 - t) * (1 - t)  // ease-out²
      try {
        if (map.getLayer(PINS_LAYER_HALO)) {
          map.setPaintProperty(PINS_LAYER_HALO, 'circle-radius', DOT_BASE + DOT_BASE * 2.6 * t)
          map.setPaintProperty(PINS_LAYER_HALO, 'circle-opacity', 0.55 * (1 - eased))
        }
      } catch { /* layer not ready */ }
      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [mapLoaded])

  // Cleanup
  useEffect(() => {
    return () => {
      popupRef.current?.remove()
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [])

  const handleBack = () => {
    selectedRegionRef.current = null
    setSelectedRegion(null)
    if (mapRef.current) fitCountry(mapRef.current)
  }

  return (
    <div className="relative min-h-screen w-full" style={{ background: 'var(--bg)' }}>
      <Header
        regionLabel={selectedRegion ?? undefined}
        showBack={!!selectedRegion}
        onBack={handleBack}
      />
      <main className="relative h-screen w-full">
        <div
          id="map"
          className="absolute inset-0 h-full w-full sm:right-[360px]"
          style={{ background: 'var(--bg)' }}
        />

        {/* Vignette — soft edge darkening, draws focus to center */}
        <div
          className="pointer-events-none absolute inset-0 z-[5]"
          style={{
            background: theme === 'dark'
              ? 'radial-gradient(ellipse at 50% 48%, transparent 35%, rgba(0,0,0,0.38) 100%)'
              : 'radial-gradient(ellipse at 50% 48%, transparent 40%, rgba(0,0,0,0.15) 100%)',
          }}
        />

        {/* Map error */}
        {mapError ? (
          <div
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6 text-center text-sm"
            style={{ background: 'rgba(0,0,0,0.7)' }}
          >
            <div
              className="rounded-2xl px-6 py-5"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
            >
              <p className="font-semibold">Ошибка карты</p>
              <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>{mapError}</p>
            </div>
          </div>
        ) : null}

        {/* Category legend — visible when region selected and has pins */}
        {mapLoaded && selectedRegion && attractions.filter(a => a.region === selectedRegion).length > 0 && (
          <div
            className="pointer-events-none absolute bottom-20 left-5 z-10 rounded-xl px-3.5 py-3 backdrop-blur-md"
            style={{
              background: theme === 'dark' ? 'rgba(22, 27, 34, 0.82)' : 'rgba(248, 245, 240, 0.88)',
              border: '1px solid var(--border)',
            }}
          >
            {Object.entries(CATEGORY_COLORS).map(([key, color]) => {
              const count = attractions.filter(a => a.region === selectedRegion && a.category === key).length
              if (count === 0) return null
              return (
                <div key={key} className="flex items-center gap-2 py-0.5 text-xs" style={{ color: 'var(--muted)' }}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                  {CATEGORY_LABELS[key]} · {count}
                </div>
              )
            })}
          </div>
        )}

        {/* Status badge */}
        {!mapError && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center" style={{ paddingBottom: 'max(28px, env(safe-area-inset-bottom, 0px))' }}>
            <div
              className="pointer-events-auto rounded-xl px-4 py-2 text-sm backdrop-blur-md"
              style={{
                background: theme === 'dark' ? 'rgba(22, 27, 34, 0.82)' : 'rgba(248, 245, 240, 0.88)',
                border: '1px solid var(--border)',
                color: 'var(--muted)',
              }}
            >
              {mapLoaded
                ? selectedRegion
                  ? <><span style={{ color: 'var(--text)', fontWeight: 600 }}>{selectedRegion}</span> — нажмите вне региона чтобы вернуться</>
                  : 'Нажмите на регион для просмотра'
                : 'Загружаю карту…'}
            </div>
          </div>
        )}
      </main>

      <AttractionsDrawer attractions={attractions} selectedRegion={selectedRegion} />
    </div>
  )
}
