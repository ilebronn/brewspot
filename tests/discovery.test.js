import assert from 'node:assert/strict'
import test from 'node:test'
import { distanceMeters, formatDistance, sortCafes } from '../src/lib/discovery.js'

test('distance handles literals, Google LatLng objects, and unknown locations', () => {
  assert.equal(distanceMeters({ lat: 0, lng: 0 }, { lat: () => 0, lng: () => 0 }), 0)
  assert.ok(Math.abs(distanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }) - 111195) < 1)
  assert.equal(distanceMeters(null, { lat: 0, lng: 0 }), undefined)
  assert.equal(distanceMeters({ lat: 100, lng: 0 }, { lat: 0, lng: 0 }), undefined)
  assert.ok(Number.isFinite(distanceMeters({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })))
})
test('distance labels distinguish very close, metres, kilometres and missing data', () => {
  assert.equal(formatDistance(0), 'Under 50 m')
  assert.equal(formatDistance(258), '260 m')
  assert.equal(formatDistance(1234), '1.2 km')
  assert.equal(formatDistance(undefined), null)
})
test('sorting keeps unknown values last and does not mutate source data', () => {
  const cafes = [{ id: 'unknown' }, { id: 'far', distance: 500, rating: 4.8, reviews: 10 }, { id: 'near', distance: 0, rating: 4.8, reviews: 50 }, { id: 'low', distance: 100, rating: 4.2 }]
  assert.deepEqual(sortCafes(cafes, 'distance').map(c => c.id), ['near', 'low', 'far', 'unknown'])
  assert.deepEqual(sortCafes(cafes, 'rating').map(c => c.id), ['near', 'far', 'low', 'unknown'])
  assert.deepEqual(sortCafes(cafes, 'default'), cafes)
  assert.equal(cafes[0].id, 'unknown')
})

test('minimum rating includes boundaries and excludes unknown ratings only when filtering', async () => {
  const { matchesMinimumRating } = await import('../src/lib/discovery.js')
  assert.equal(matchesMinimumRating({ rating: 4.5 }, 4.5), true)
  assert.equal(matchesMinimumRating({ rating: 4.4 }, 4.5), false)
  assert.equal(matchesMinimumRating({ rating: 4 }, 4), true)
  assert.equal(matchesMinimumRating({}, 4), false)
  assert.equal(matchesMinimumRating({ rating: null }, 4), false)
  assert.equal(matchesMinimumRating({}, 0), true)
})

test('local name search ignores case and accents, and handles missing names', async () => {
  const { matchesCafeName } = await import('../src/lib/discovery.js')
  assert.equal(matchesCafeName({ name: 'Café Moss' }, ' CAFE '), true)
  assert.equal(matchesCafeName({ name: 'Daily Grind' }, 'moss'), false)
  assert.equal(matchesCafeName({}, 'moss'), false)
  assert.equal(matchesCafeName({}, ' '), true)
})
test('random selection handles empty, single and filtered result sets', async () => {
  const { pickCafe } = await import('../src/lib/discovery.js')
  assert.equal(pickCafe([]), undefined)
  const cafes = [{ id: 1 }, { id: 2 }]
  assert.equal(pickCafe(cafes, () => 0), cafes[0])
  assert.equal(pickCafe(cafes, () => 0.99), cafes[1])
  assert.equal(pickCafe([cafes[1]]), cafes[1])
})

test('search history deduplicates, trims and keeps only five typed queries', async () => {
  const { addRecentSearch } = await import('../src/lib/searchHistory.js')
  assert.deepEqual(addRecentSearch(['Manila', 'Cebu'], ' manila '), ['manila', 'Cebu'])
  assert.deepEqual(addRecentSearch(['A'], '   '), ['A'])
  assert.deepEqual(addRecentSearch(['A', 'B', 'C', 'D', 'E'], 'F'), ['F', 'A', 'B', 'C', 'D'])
})

test('saved preferences validate allowed values and recover invalid data', async () => {
  const { validatePreferences } = await import('../src/lib/preferences.js')
  assert.deepEqual(validatePreferences(null), { radius: 3000, sort: 'default', travelMode: 'driving' })
  assert.deepEqual(validatePreferences({ radius: -1, sort: 'unknown', travelMode: 'plane' }), validatePreferences(null))
  assert.deepEqual(validatePreferences({ radius: 5000, sort: 'rating', travelMode: 'walking' }), { radius: 5000, sort: 'rating', travelMode: 'walking' })
})

test('backups contain only IDs and user data and validate imports', async () => {
  const { createBackup, parseBackup } = await import('../src/lib/favoritesBackup.js')
  const backup = createBackup(['abc', 'abc'], { abc: 'My note', other: 'Not saved' }, ['abc', 'other'])
  assert.deepEqual(backup, { version: 1, favorites: ['abc'], notes: { abc: 'My note' }, visited: ['abc'] })
  assert.deepEqual(parseBackup(JSON.stringify(backup)), { favorites: ['abc'], notes: { abc: 'My note' }, visited: ['abc'] })
  assert.throws(() => parseBackup('bad json'))
  assert.throws(() => parseBackup(JSON.stringify({ version: 2, favorites: [] })))
  assert.throws(() => parseBackup(JSON.stringify({ version: 1, favorites: [123] })))
  assert.equal(parseBackup(JSON.stringify({ version: 1, favorites: ['abc'], notes: { abc: 'x'.repeat(600) } })).notes.abc.length, 500)
})

test('collections validate user data and backup only saved membership', async () => {
  const { sanitizeCollections, matchesNote } = await import('../src/lib/collections.js')
  const { createBackup, parseBackup } = await import('../src/lib/favoritesBackup.js')
  const collections = sanitizeCollections([{ id: 'weekend', name: ' Weekend ', placeIds: ['a', 'a', 'b'] }, { id: 'bad', name: '' }], ['a'])
  assert.deepEqual(collections, [{ id: 'weekend', name: 'Weekend', placeIds: ['a'] }])
  assert.deepEqual(parseBackup(JSON.stringify(createBackup(['a'], {}, [], collections))).collections, collections)
  assert.equal(matchesNote('Try iced LATTE', ' latte '), true)
  assert.equal(matchesNote(undefined, 'latte'), false)
  assert.equal(matchesNote(undefined, ''), true)
})
