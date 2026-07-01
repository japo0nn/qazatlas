import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

interface MapPickerProps {
  lat: number
  lng: number
  onChange: (lat: number, lng: number) => void
}

export default function MapPicker({ lat, lng, onChange }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    if (!containerRef.current) return

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [lng, lat],
      zoom: 5,
    })
    mapRef.current = map

    const marker = new mapboxgl.Marker({ color: '#F5A623', draggable: true })
      .setLngLat([lng, lat])
      .addTo(map)
    markerRef.current = marker

    marker.on('dragend', () => {
      const { lat: newLat, lng: newLng } = marker.getLngLat()
      onChangeRef.current(newLat, newLng)
    })

    map.on('click', (e) => {
      marker.setLngLat(e.lngLat)
      onChangeRef.current(e.lngLat.lat, e.lngLat.lng)
    })

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, []) // init once

  // Sync marker when inputs change
  useEffect(() => {
    markerRef.current?.setLngLat([lng, lat])
  }, [lat, lng])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: 260, borderRadius: 12, overflow: 'hidden' }}
    />
  )
}
