/** Exact NAME_1 values from kazakhstan-regions.geojson (GADM) */
export const REGIONS = [
  'Almaty',
  'Aqmola',
  'Aqtöbe',
  'Atyrau',
  'East Kazakhstan',
  'Mangghystau',
  'North Kazakhstan',
  'Pavlodar',
  'Qaraghandy',
  'Qostanay',
  'Qyzylorda',
  'South Kazakhstan',
  'West Kazakhstan',
  'Zhambyl',
] as const

export type Region = typeof REGIONS[number]
