export const STONE_TYPES = ['Batu Besscoss', 'Batu Split 5/7', 'Batu Split 2/3', 'Batu Split 1/2', 'Pasir']

const LEGACY_STONE_TYPES = {
  'Batu A': STONE_TYPES[0],
  'Batu B': STONE_TYPES[1],
  'Batu C': STONE_TYPES[2],
  'Batu D': STONE_TYPES[3],
}

export function canonicalStoneType(type) {
  return LEGACY_STONE_TYPES[type] || type
}
