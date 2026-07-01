import { supabase } from '../lib/supabase'
import type { Attraction } from '../types/attraction'

type AttractionInput = Omit<Attraction, 'id' | 'created_at' | 'images'>

export async function getAttractions(): Promise<Attraction[]> {
  const { data, error } = await supabase
    .from('attractions')
    .select('*, images:attraction_images(*)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map(row => ({
    ...row,
    // Only first image for list/map views — detail page uses getAttraction() which returns all
    images: (row.images ?? []).sort((a: any, b: any) => a.order_index - b.order_index).slice(0, 1),
  }))
}

export async function getAttraction(id: string): Promise<Attraction> {
  const { data, error } = await supabase
    .from('attractions')
    .select('*, images:attraction_images(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return {
    ...data,
    images: (data.images ?? []).sort((a: any, b: any) => a.order_index - b.order_index),
  }
}

export async function createAttraction(input: AttractionInput): Promise<Attraction> {
  const { data, error } = await supabase
    .from('attractions')
    .insert(input)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateAttraction(id: string, input: Partial<AttractionInput>): Promise<void> {
  const { error } = await supabase.from('attractions').update(input).eq('id', id)
  if (error) throw error
}

export async function deleteAttraction(id: string): Promise<void> {
  const { error } = await supabase.from('attractions').delete().eq('id', id)
  if (error) throw error
}
