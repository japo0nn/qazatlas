import { supabase } from '../lib/supabase'
import type { AttractionImage } from '../types/attraction'

const BUCKET = 'attraction-images'

export async function uploadImage(file: File, attractionId: string): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${attractionId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function addImageRecord(
  attractionId: string,
  url: string,
  orderIndex: number,
): Promise<AttractionImage> {
  const { data, error } = await supabase
    .from('attraction_images')
    .insert({ attraction_id: attractionId, url, order_index: orderIndex })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteImage(imageId: string, url: string): Promise<void> {
  try {
    const urlObj = new URL(url)
    // Extract storage path after the bucket name segment
    const match = urlObj.pathname.match(new RegExp(`/${BUCKET}/(.+)$`))
    if (match?.[1]) {
      await supabase.storage.from(BUCKET).remove([match[1]])
    }
  } catch {
    // Storage delete failure is non-fatal; still remove DB record
  }
  const { error } = await supabase.from('attraction_images').delete().eq('id', imageId)
  if (error) throw error
}

export async function reorderImages(images: { id: string; order_index: number }[]): Promise<void> {
  await Promise.all(
    images.map(({ id, order_index }) =>
      supabase.from('attraction_images').update({ order_index }).eq('id', id),
    ),
  )
}
