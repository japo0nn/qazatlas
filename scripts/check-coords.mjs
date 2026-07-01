import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
config()

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
)

const { data } = await supabase
  .from('attractions')
  .select('name, region, lat, lng')
  .eq('region', 'Aqmola')
  .order('name')

console.log('\nAqmola attractions in DB:\n')
for (const r of data ?? []) {
  console.log(`  lat=${r.lat.toFixed(4)} lng=${r.lng.toFixed(4)}  ${r.name}`)
}
