export const SEARCH_RADII = [1000, 3000, 5000, 10000]

function coordinates(location) {
  if (!location) return null
  const lat = typeof location.lat === 'function' ? location.lat() : location.lat
  const lng = typeof location.lng === 'function' ? location.lng() : location.lng
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null
}

// Great-circle distance, not walking/driving distance or an estimated travel time.
export function distanceMeters(origin, destination) {
  const a = coordinates(origin)
  const b = coordinates(destination)
  if (!a || !b) return undefined
  const radians = value => value * Math.PI / 180
  const h = Math.sin(radians(b.lat - a.lat) / 2) ** 2
    + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(radians(b.lng - a.lng) / 2) ** 2
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))))
}

export function formatDistance(meters) {
  if (!Number.isFinite(meters) || meters < 0) return null
  if (meters < 50) return 'Under 50 m'
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`
  return `${(meters / 1000).toFixed(1)} km`
}

export function sortCafes(cafes, sort) {
  const missingLast = (a, b, direction = 1) => {
    const validA = Number.isFinite(a)
    const validB = Number.isFinite(b)
    if (!validA || !validB) return validA ? -1 : validB ? 1 : 0
    return (a - b) * direction
  }
  return [...cafes].sort((a, b) => {
    if (sort === 'distance') return missingLast(a.distance, b.distance)
    if (sort === 'rating') return missingLast(a.rating, b.rating, -1) || missingLast(a.reviews, b.reviews, -1)
    return 0
  })
}

export function matchesMinimumRating(cafe, minimum) {
  return minimum === 0 || (Number.isFinite(cafe.rating) && cafe.rating >= minimum)
}

export function matchesCafeName(cafe, query) {
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
  const needle = normalize(query)
  return !needle || normalize(cafe.name || '').includes(needle)
}

export function pickCafe(cafes, random = Math.random) {
  return cafes.length ? cafes[Math.min(cafes.length - 1, Math.floor(random() * cafes.length))] : undefined
}
