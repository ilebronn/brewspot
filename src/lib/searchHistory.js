export function addRecentSearch(history, query) {
  const value = query.trim().slice(0, 160)
  if (!value) return history
  return [value, ...history.filter(item => item.toLowerCase() !== value.toLowerCase())].slice(0, 5)
}
export function readSearchHistory() {
  try {
    const values = JSON.parse(localStorage.getItem('brewspot-recent-searches'))
    return Array.isArray(values) ? values.filter(item => typeof item === 'string' && item.trim()).map(item => item.slice(0, 160)).slice(0, 5) : []
  } catch { return [] }
}
