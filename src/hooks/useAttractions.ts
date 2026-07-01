import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getAttractions } from '../api/attractions'
import type { Attraction } from '../types/attraction'

export function useAttractions() {
  const [attractions, setAttractions] = useState<Attraction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      try {
        const data = await getAttractions()
        if (mounted) {
          setAttractions(data)
          setError(null)
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Ошибка загрузки')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()

    // Realtime: reload on any change to attractions table
    const channel = supabase
      .channel('attractions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attractions' }, load)
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  return { attractions, loading, error, reload: () => getAttractions().then(setAttractions) }
}
