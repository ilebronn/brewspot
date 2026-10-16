import { sanitizeCollections } from './collections.js'
export function parseBackup(text) {
  if (text.length > 1000000) throw new Error('Backup is too large (maximum 1 MB).')
  let data
  try { data = JSON.parse(text) } catch { throw new Error('Choose a valid BrewSpot JSON backup.') }
  if (data?.version !== 1 || !Array.isArray(data.favorites) || data.favorites.length > 1000) throw new Error('Unsupported backup. Use a version 1 BrewSpot backup with up to 1,000 favorites.')
  if (data.favorites.some(id => typeof id !== 'string' || !/^[\w-]{1,300}$/.test(id))) throw new Error('Backup contains invalid place IDs.')
  const favorites = [...new Set(data.favorites)]
  const notes = Object.fromEntries(favorites.filter(id => typeof data.notes?.[id] === 'string').map(id => [id, data.notes[id].slice(0, 500)]))
  const visited = Array.isArray(data.visited) ? favorites.filter(id => data.visited.includes(id)) : []
  return { favorites, notes, visited, ...(data.collections ? { collections: sanitizeCollections(data.collections, favorites) } : {}) }
}
export function createBackup(favorites, notes, visited, collections) {
  return { version: 1, favorites: [...new Set(favorites)], notes: Object.fromEntries(favorites.filter(id => typeof notes[id] === 'string').map(id => [id, notes[id].slice(0, 500)])), visited: visited.filter(id => favorites.includes(id)), ...(collections ? { collections: sanitizeCollections(collections, favorites) } : {}) }
}
export function readVisited() {
  try { const ids = JSON.parse(localStorage.getItem('brewspot-visited')); return Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : [] } catch { return [] }
}
