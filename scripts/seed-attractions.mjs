#!/usr/bin/env node
/**
 * Seed Kazakhstan attractions into Supabase.
 *
 * Setup:
 *   1. Add SUPABASE_SERVICE_ROLE_KEY to your .env (from Supabase → Settings → API)
 *   2. Add ANTHROPIC_API_KEY to your .env
 *   3. npm run seed
 *
 * Re-running is safe — existing attractions (matched by name) are skipped.
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !ANTHROPIC_KEY) {
  console.error('Missing env vars. Need: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY')
  process.exit(1)
}

const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── Attractions list ──────────────────────────────────────────────────────────
// Region names must match NAME_1 values in your kazakhstan-regions.geojson.
// Run the app, click regions, and compare if any attractions appear in wrong place.

const ATTRACTIONS = [
  // ── Almaty (city) ──
  { name: 'Zenkov Cathedral', region: 'Almaty', lat: 43.2667, lng: 76.9333, category: 'ARCHITECTURAL' },
  { name: 'Kok-Tobe Hill', region: 'Almaty', lat: 43.2417, lng: 76.9567, category: 'ARCHITECTURAL' },
  { name: 'Medeu Skating Rink', region: 'Almaty', lat: 43.1497, lng: 77.0036, category: 'ARCHITECTURAL' },
  { name: 'Green Bazaar Almaty', region: 'Almaty', lat: 43.2572, lng: 76.9486, category: 'CULTURAL' },
  { name: 'Central State Museum of Kazakhstan', region: 'Almaty', lat: 43.2583, lng: 76.9283, category: 'CULTURAL' },
  { name: 'Almaty Opera and Ballet Theater', region: 'Almaty', lat: 43.2617, lng: 76.9417, category: 'CULTURAL' },
  { name: 'First President Park Almaty', region: 'Almaty', lat: 43.2361, lng: 76.9394, category: 'ARCHITECTURAL' },
  { name: 'Shymbulak Ski Resort', region: 'Almaty', lat: 43.1333, lng: 77.0167, category: 'NATURE' },
  { name: 'Big Almaty Lake', region: 'Almaty', lat: 43.0539, lng: 76.9833, category: 'NATURE' },

  // ── Almaty Region (oblast) ──
  { name: 'Charyn Canyon', region: 'Almaty', lat: 43.3522, lng: 79.0667, category: 'NATURE' },
  { name: 'Kolsai Lakes', region: 'Almaty', lat: 42.9833, lng: 78.3833, category: 'NATURE' },
  { name: 'Lake Kaindy', region: 'Almaty', lat: 42.9672, lng: 78.4544, category: 'NATURE' },
  { name: 'Altyn Emel National Park', region: 'Almaty', lat: 43.8167, lng: 78.5, category: 'NATURE' },
  { name: 'Singing Barkhan', region: 'Almaty', lat: 43.7167, lng: 78.6333, category: 'NATURE' },
  { name: 'Tamgaly Petroglyphs', region: 'Almaty', lat: 43.8333, lng: 75.5333, category: 'HISTORICAL' },
  { name: 'Turgen Gorge', region: 'Almaty', lat: 43.35, lng: 77.8333, category: 'NATURE' },
  { name: 'Kapchagai Reservoir', region: 'Almaty', lat: 43.8833, lng: 77.0833, category: 'NATURE' },
  { name: 'Ile-Alatau National Park', region: 'Almaty', lat: 43.15, lng: 77.0, category: 'NATURE' },
  { name: 'Aktau Mountains', region: 'Almaty', lat: 43.75, lng: 79.0, category: 'NATURE' },

  // ── Aqmola (incl. Astana capital) ──
  { name: 'Bayterek Tower', region: 'Aqmola', lat: 51.1283, lng: 71.4305, category: 'ARCHITECTURAL' },
  { name: 'Khan Shatyr Entertainment Center', region: 'Aqmola', lat: 51.1333, lng: 71.4167, category: 'ARCHITECTURAL' },
  { name: 'Palace of Peace and Reconciliation', region: 'Aqmola', lat: 51.1225, lng: 71.4642, category: 'ARCHITECTURAL' },
  { name: 'Hazrat Sultan Mosque', region: 'Aqmola', lat: 51.1167, lng: 71.4667, category: 'ARCHITECTURAL' },
  { name: 'National Museum of Kazakhstan', region: 'Aqmola', lat: 51.1266, lng: 71.4695, category: 'CULTURAL' },
  { name: 'Nur-Alem Sphere', region: 'Aqmola', lat: 51.0839, lng: 71.4047, category: 'ARCHITECTURAL' },
  { name: 'Ak Orda Presidential Palace', region: 'Aqmola', lat: 51.1253, lng: 71.4586, category: 'ARCHITECTURAL' },
  { name: 'Central Concert Hall Astana', region: 'Aqmola', lat: 51.1167, lng: 71.4417, category: 'CULTURAL' },

  // ── South Kazakhstan (Turkestan) ──
  { name: 'Mausoleum of Khoja Ahmed Yasawi', region: 'South Kazakhstan', lat: 43.2975, lng: 68.2722, category: 'HISTORICAL' },
  { name: 'Arystan-Bab Mausoleum', region: 'South Kazakhstan', lat: 42.8667, lng: 67.9833, category: 'HISTORICAL' },
  { name: 'Ruins of Sauran', region: 'South Kazakhstan', lat: 43.0333, lng: 68.1, category: 'HISTORICAL' },
  { name: 'Otrar Ruins', region: 'South Kazakhstan', lat: 42.8667, lng: 68.2, category: 'HISTORICAL' },
  { name: 'Aksu-Zhabagly Nature Reserve', region: 'South Kazakhstan', lat: 42.4833, lng: 70.6833, category: 'NATURE' },
  { name: 'Shymkent Historical Museum', region: 'South Kazakhstan', lat: 42.3, lng: 69.5972, category: 'CULTURAL' },

  // ── Mangghystau ──
  { name: 'Bozzhyra Valley', region: 'Mangghystau', lat: 43.3667, lng: 52.7833, category: 'NATURE' },
  { name: 'Karagiye Depression', region: 'Mangghystau', lat: 43.5, lng: 51.8, category: 'NATURE' },
  { name: 'Sherkala Mountain', region: 'Mangghystau', lat: 44.15, lng: 53.0333, category: 'NATURE' },
  { name: 'Torysh Valley of Balls', region: 'Mangghystau', lat: 44.0833, lng: 53.25, category: 'NATURE' },
  { name: 'Shakpak-Ata Underground Mosque', region: 'Mangghystau', lat: 44.4167, lng: 50.5, category: 'HISTORICAL' },
  { name: 'Sultan-Epe Underground Mosque', region: 'Mangghystau', lat: 44.5833, lng: 50.55, category: 'HISTORICAL' },
  { name: 'Mangyshlak Peninsula Coastline', region: 'Mangghystau', lat: 43.65, lng: 51.17, category: 'NATURE' },
  { name: 'Ustyurt Plateau', region: 'Mangghystau', lat: 43.9, lng: 55.0, category: 'NATURE' },

  // ── East Kazakhstan ──
  { name: 'Markakol Lake', region: 'East Kazakhstan', lat: 49.0, lng: 85.6, category: 'NATURE' },
  { name: 'Katon-Karagay National Park', region: 'East Kazakhstan', lat: 49.25, lng: 85.617, category: 'NATURE' },
  { name: 'Bukhtarma Reservoir', region: 'East Kazakhstan', lat: 49.5, lng: 84.0, category: 'NATURE' },
  { name: 'Ablaykit Monastery Ruins', region: 'East Kazakhstan', lat: 49.567, lng: 82.0, category: 'HISTORICAL' },
  { name: 'Belukha Mountain', region: 'East Kazakhstan', lat: 49.806, lng: 86.594, category: 'NATURE' },

  // ── Aqmola ──
  { name: 'Burabay National Park', region: 'Aqmola', lat: 53.0833, lng: 70.2833, category: 'NATURE' },
  { name: 'Lake Shchuchye', region: 'Aqmola', lat: 53.1167, lng: 70.2833, category: 'NATURE' },
  { name: 'ALZHIR Memorial Complex', region: 'Aqmola', lat: 51.2667, lng: 71.0833, category: 'HISTORICAL' },

  // ── Pavlodar ──
  { name: 'Bayanaul National Park', region: 'Pavlodar', lat: 50.8, lng: 75.7, category: 'NATURE' },
  { name: 'Mashkhur Zhusup Mosque', region: 'Pavlodar', lat: 52.2833, lng: 76.9667, category: 'ARCHITECTURAL' },
  { name: 'Ekibastuz Power Plant', region: 'Pavlodar', lat: 51.7167, lng: 75.3167, category: 'ARCHITECTURAL' },

  // ── Zhambyl ──
  { name: 'Aisha Bibi Mausoleum', region: 'Zhambyl', lat: 42.9, lng: 71.0667, category: 'HISTORICAL' },
  { name: 'Akyrtas Palace Complex', region: 'Zhambyl', lat: 42.8333, lng: 72.2167, category: 'HISTORICAL' },
  { name: 'Taraz Ancient City', region: 'Zhambyl', lat: 42.9, lng: 71.3833, category: 'HISTORICAL' },

  // ── Qyzylorda ──
  { name: 'Baikonur Cosmodrome', region: 'Qyzylorda', lat: 45.9647, lng: 63.3053, category: 'HISTORICAL' },
  { name: 'Korkyt-Ata Monument', region: 'Qyzylorda', lat: 44.8, lng: 65.5, category: 'CULTURAL' },
  { name: 'Aral Sea Remnants', region: 'Qyzylorda', lat: 44.5, lng: 60.0, category: 'NATURE' },

  // ── Qaraghandy ──
  { name: 'Karlag Memorial Museum', region: 'Qaraghandy', lat: 49.8, lng: 73.09, category: 'HISTORICAL' },
  { name: 'Spassk Memorial Complex', region: 'Qaraghandy', lat: 49.7167, lng: 73.3167, category: 'HISTORICAL' },
  { name: 'Karaganda Regional Museum', region: 'Qaraghandy', lat: 49.8028, lng: 73.0878, category: 'CULTURAL' },

  // ── North Kazakhstan ──
  { name: 'Imantau Lake', region: 'North Kazakhstan', lat: 53.25, lng: 67.95, category: 'NATURE' },
  { name: 'Syrymbet Estate Museum', region: 'North Kazakhstan', lat: 54.15, lng: 69.9333, category: 'CULTURAL' },

  // ── Atyrau ──
  { name: 'Europe-Asia Border Monument Atyrau', region: 'Atyrau', lat: 47.1167, lng: 51.8833, category: 'ARCHITECTURAL' },

  // ── West Kazakhstan ──
  { name: 'Oral Regional Museum', region: 'West Kazakhstan', lat: 51.2333, lng: 51.3667, category: 'CULTURAL' },

  // ── Qostanay ──
  { name: 'Tobol River Embankment Kostanay', region: 'Qostanay', lat: 53.2167, lng: 63.6333, category: 'ARCHITECTURAL' },

  // ── Aqtöbe ──
  { name: 'Mugalzhar Mountains', region: 'Aqtöbe', lat: 49.0, lng: 58.5, category: 'NATURE' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABEL = {
  HISTORICAL: 'historical',
  NATURE: 'natural',
  ARCHITECTURAL: 'architectural',
  CULTURAL: 'cultural',
}

async function generateDescription(name, region, category) {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 700,
    messages: [{
      role: 'user',
      content: `Write a travel guide description for "${name}", a ${CATEGORY_LABEL[category] ?? 'notable'} attraction in ${region}, Kazakhstan.

Format (strict):
- 220–320 words, English
- Opening paragraph: compelling overview, no heading
- ## Highlights — 3 to 4 bullet points with **bold** key terms
- End with one sentence in *italics* as a practical visitor tip

Be accurate and engaging. No generic filler.`,
    }],
  })
  const block = msg.content[0]
  return block.type === 'text' ? block.text.trim() : ''
}

async function getWikimediaImages(name, limit = 4) {
  try {
    const q = encodeURIComponent(`${name} Kazakhstan`)
    const url =
      `https://commons.wikimedia.org/w/api.php?action=query` +
      `&generator=search&gsrnamespace=6&gsrsearch=${q}&gsrlimit=20` +
      `&prop=imageinfo&iiprop=url&iiurlwidth=1200` +
      `&format=json&origin=*`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    const pages = Object.values(data?.query?.pages ?? {})
    return pages
      .map(p => p.imageinfo?.[0]?.url ?? '')
      .filter(u =>
        /\.(jpg|jpeg|png)$/i.test(u) &&
        !/(_map|_Map|Map_|flag|Flag|icon|Icon|logo|Logo|coa|Coa|coat|Coat|seal|Seal)/i.test(u)
      )
      .slice(0, limit)
      .map((url, order_index) => ({ url, order_index }))
  } catch {
    return []
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log(`\n🚀 Seeding ${ATTRACTIONS.length} attractions into Supabase\n`)
  let created = 0, skipped = 0, failed = 0

  for (let i = 0; i < ATTRACTIONS.length; i++) {
    const a = ATTRACTIONS[i]
    process.stdout.write(`[${String(i + 1).padStart(2)}/${ATTRACTIONS.length}] ${a.name} ... `)

    // Skip if already exists
    const { data: existing } = await supabase
      .from('attractions')
      .select('id')
      .eq('name', a.name)
      .maybeSingle()

    if (existing) {
      console.log('⏭  skip')
      skipped++
      continue
    }

    // Generate description
    let description = ''
    try {
      description = await generateDescription(a.name, a.region, a.category)
    } catch (e) {
      console.log(`❌ Claude error: ${e.message}`)
      failed++
      await sleep(3000)
      continue
    }

    // Insert attraction
    const { data: inserted, error: dbErr } = await supabase
      .from('attractions')
      .insert({ name: a.name, region: a.region, lat: a.lat, lng: a.lng, category: a.category, description })
      .select('id')
      .single()

    if (dbErr) {
      console.log(`❌ DB: ${dbErr.message}`)
      failed++
      continue
    }

    // Fetch & insert images
    const images = await getWikimediaImages(a.name)
    if (images.length > 0) {
      await supabase
        .from('attraction_images')
        .insert(images.map(img => ({ ...img, attraction_id: inserted.id })))
    }

    console.log(`✅ +${images.length} imgs`)
    created++
    await sleep(1200) // Claude rate limit buffer
  }

  console.log(`\n─────────────────────────────`)
  console.log(`✅ Created : ${created}`)
  console.log(`⏭  Skipped : ${skipped}`)
  console.log(`❌ Failed  : ${failed}`)
  console.log(`─────────────────────────────\n`)
}

seed().catch(e => {
  console.error('\nFatal:', e.message)
  process.exit(1)
})
