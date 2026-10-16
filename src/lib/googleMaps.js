import { SEARCH_RADII } from './discovery'
import { openingStatus } from './openingHours'
// Browser keys are public. Restrict this key in Google Cloud; .env does not hide it.
export const mapsConfigured = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY)
let loading
export function loadGoogleMaps() {
  if (!mapsConfigured) return Promise.reject(new Error('Google Maps is not configured. Follow GOOGLE_MAPS_SETUP.md and restart Vite.'))
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps)
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      let settled = false
      const fail = message => { if (!settled) { settled = true; clearTimeout(timer); reject(new Error(message)) } }
      const timer = setTimeout(() => fail('Google Maps timed out. Check your connection and try reloading.'), 20000)
      window.gm_authFailure = () => fail('Google Maps authorization failed. Check billing, enabled APIs, and API key restrictions, then reload.')
      window.brewSpotMapsReady = () => { if (!settled) { settled = true; clearTimeout(timer); resolve(window.google.maps) } }
      const params = new URLSearchParams({ key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY, v: 'weekly', loading: 'async', callback: 'brewSpotMapsReady' })
      script.src = `https://maps.googleapis.com/maps/api/js?${params}`
      script.async = true
      script.onerror = () => fail('Google Maps could not load. Check your internet connection and reload.')
      document.head.append(script)
    })
  }
  return loading
}
const fields = ['id', 'displayName', 'location', 'formattedAddress', 'googleMapsURI', 'rating', 'userRatingCount', 'currentOpeningHours', 'regularOpeningHours', 'photos', 'businessStatus', 'attributions', 'utcOffsetMinutes', 'websiteURI', 'internationalPhoneNumber', 'nationalPhoneNumber']
export function normalizePlace(place) {
  return {
    id: place.id, name: place.displayName, location: place.location,
    address: place.formattedAddress, rating: place.rating, reviews: place.userRatingCount,
    open: openingStatus(place.currentOpeningHours, place.utcOffsetMinutes),
    hours: place.currentOpeningHours?.weekdayDescriptions || place.regularOpeningHours?.weekdayDescriptions,
    businessStatus: place.businessStatus, photo: place.photos?.[0], photos: place.photos || [],
    website: place.websiteURI, phone: place.internationalPhoneNumber || place.nationalPhoneNumber,
    attributions: place.attributions || [], googleMapsURI: place.googleMapsURI,
  }
}
export async function findCafes({ center, query, radius = 3000 }) {
  if (!query && !SEARCH_RADII.includes(radius)) throw new Error('Choose a supported search radius.')
  const maps = await loadGoogleMaps()
  const { Place, SearchNearbyRankPreference } = await maps.importLibrary('places')
  const response = query
    ? await Place.searchByText({ textQuery: `cafes in ${query}`, includedType: 'cafe', fields, maxResultCount: 20 })
    : await Place.searchNearby({ fields, locationRestriction: { center, radius }, includedTypes: ['cafe'], maxResultCount: 20, rankPreference: SearchNearbyRankPreference.DISTANCE })
  return (response.places || []).map(normalizePlace)
}
export function directionsURL(cafe, travelMode = 'driving') {
  const params = new URLSearchParams({ api: '1', destination: cafe.address || cafe.name || cafe.location?.toUrlValue(), destination_place_id: cafe.id })
  if (['walking', 'driving', 'bicycling'].includes(travelMode)) params.set('travelmode', travelMode)
  return `https://www.google.com/maps/dir/?${params}`
}

export async function fetchSavedCafe(id) {
  const maps = await loadGoogleMaps()
  const { Place } = await maps.importLibrary('places')
  const place = new Place({ id })
  await place.fetchFields({ fields })
  return normalizePlace(place)
}
