#!/usr/bin/env node
/**
 * Geocode all attractions via Nominatim (OpenStreetMap) and update lat/lng in DB.
 * Safe to re-run — only updates if geocoding succeeds and returns a result in Kazakhstan.
 *
 * Usage: node scripts/fix-coordinates.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
)

const sleep = ms => new Promise(r => setTimeout(r, ms))

// Kazakhstan bounding box (rough)
const KZ_BOUNDS = { minLat: 40.5, maxLat: 55.5, minLng: 50.0, maxLng: 87.5 }

function inKazakhstan(lat, lng) {
  return lat >= KZ_BOUNDS.minLat && lat <= KZ_BOUNDS.maxLat &&
         lng >= KZ_BOUNDS.minLng && lng <= KZ_BOUNDS.maxLng
}

async function geocode(name) {
  const q = encodeURIComponent(`${name}, Kazakhstan`)
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&countrycodes=kz`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'QazAtlas/1.0 (aibos271@gmail.com)' },
  })
  if (!res.ok) return null
  const results = await res.json()
  if (!results.length) return null

  // Prefer results inside Kazakhstan bounds
  for (const r of results) {
    const lat = parseFloat(r.lat)
    const lng = parseFloat(r.lon)
    if (inKazakhstan(lat, lng)) return { lat, lng, display: r.display_name }
  }
  // Fallback: first result regardless of bounds
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon), display: results[0].display_name }
}

async function main() {
  const { data: attractions, error } = await supabase
    .from('attractions')
    .select('id, name, lat, lng')
    .order('name')

  if (error) { console.error('DB error:', error.message); process.exit(1) }

  console.log(`\nGeocoding ${attractions.length} attractions via Nominatim...\n`)
  let updated = 0, skipped = 0, failed = 0

  for (let i = 0; i < attractions.length; i++) {
    const { id, name, lat: oldLat, lng: oldLng } = attractions[i]
    process.stdout.write(`[${String(i + 1).padStart(2)}/${attractions.length}] ${name} ... `)

    let result = null
    try {
      result = await geocode(name)
    } catch (e) {
      console.log(`❌ fetch error: ${e.message}`)
      failed++
      await sleep(2000)
      continue
    }

    if (!result) {
      console.log(`⚠️  no result`)
      skipped++
      await sleep(1100)
      continue
    }

    const { lat, lng, display } = result
    const moved = Math.abs(lat - oldLat) > 0.01 || Math.abs(lng - oldLng) > 0.01

    if (!moved) {
      console.log(`✓ same (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
      skipped++
      await sleep(1100)
      continue
    }

    const { error: upErr } = await supabase
      .from('attractions')
      .update({ lat, lng })
      .eq('id', id)

    if (upErr) {
      console.log(`❌ DB: ${upErr.message}`)
      failed++
    } else {
      console.log(`✅ (${oldLat.toFixed(4)},${oldLng.toFixed(4)}) → (${lat.toFixed(4)},${lng.toFixed(4)})`)
      console.log(`        → ${display.slice(0, 80)}`)
      updated++
    }

    // Nominatim rate limit: max 1 req/sec
    await sleep(1200)
  }

  console.log(`\nDone. updated=${updated} same=${skipped} failed=${failed}`)
}

main()
