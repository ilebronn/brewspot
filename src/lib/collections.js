export function sanitizeCollections(value, favorites) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  return value.slice(0, 30).flatMap(item => {
    if (typeof item?.id !== 'string' || !/^[\w-]{1,100}$/.test(item.id) || seen.has(item.id) || typeof item.name !== 'string' || !item.name.trim()) return []
    seen.add(item.id)
    return [{ id: item.id, name: item.name.trim().slice(0, 50), placeIds: Array.isArray(item.placeIds) ? [...new Set(item.placeIds.filter(id => typeof id === 'string' && (!favorites || favorites.includes(id))))].slice(0, 1000) : [] }]
  })
}
export function readCollections() {
  try { return sanitizeCollections(JSON.parse(localStorage.getItem('brewspot-collections'))) } catch { return [] }
}
export function matchesNote(note, query) {
  return !query.trim() || (typeof note === 'string' && note.toLowerCase().includes(query.trim().toLowerCase()))
}
