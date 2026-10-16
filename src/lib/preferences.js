export function validatePreferences(value) {
  return {
    radius: [1000, 3000, 5000, 10000].includes(value?.radius) ? value.radius : 3000,
    sort: ['default', 'distance', 'rating'].includes(value?.sort) ? value.sort : 'default',
    travelMode: ['driving', 'walking', 'bicycling'].includes(value?.travelMode) ? value.travelMode : 'driving',
  }
}
export function readPreferences() {
  try { return validatePreferences(JSON.parse(localStorage.getItem('brewspot-preferences'))) }
  catch { return validatePreferences(null) }
}
export function readNotes() {
  try {
    const value = JSON.parse(localStorage.getItem('brewspot-personal-notes'))
    return value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).filter(([, note]) => typeof note === 'string').map(([id, note]) => [id, note.slice(0, 500)])) : {}
  } catch { return {} }
}
