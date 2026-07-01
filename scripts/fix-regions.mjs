import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
)

const FIXES = [
  { from: 'Astana',     to: 'Aqmola' },
  { from: 'Turkestan',  to: 'South Kazakhstan' },
  { from: 'Karaganda',  to: 'Qaraghandy' },
  { from: 'Kostanay',   to: 'Qostanay' },
  { from: 'Mangystau',  to: 'Mangghystau' },
  { from: 'Akmola',     to: 'Aqmola' },
  { from: 'Aktobe',     to: 'Aqtöbe' },
  { from: 'Kyzylorda',  to: 'Qyzylorda' },
  { from: 'Jambyl',     to: 'Zhambyl' },
]

for (const { from, to } of FIXES) {
  const { count, error } = await supabase
    .from('attractions')
    .update({ region: to })
    .eq('region', from)
    .select('id', { count: 'exact', head: true })

  if (error) console.error(`❌ ${from}: ${error.message}`)
  else console.log(`✅ ${from} → ${to} (${count ?? '?'} rows)`)
}

console.log('\nDone.')
