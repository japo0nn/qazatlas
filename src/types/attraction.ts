export type Category = 'HISTORICAL' | 'NATURE' | 'ARCHITECTURAL' | 'CULTURAL'

export interface AttractionImage {
  id: string
  attraction_id: string
  url: string
  order_index: number
}

export interface Attraction {
  id: string
  name: string
  description: string
  lat: number
  lng: number
  region: string
  category: Category
  created_at: string
  images?: AttractionImage[]
}
