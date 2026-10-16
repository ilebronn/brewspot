import { useEffect, useMemo, useRef, useState } from 'react'
import { directionsURL, fetchSavedCafe, findCafes, loadGoogleMaps, mapsConfigured } from './lib/googleMaps'
import { distanceMeters, formatDistance, matchesMinimumRating, matchesCafeName, pickCafe, SEARCH_RADII, sortCafes } from './lib/discovery'
import { addRecentSearch, readSearchHistory } from './lib/searchHistory'
import { readNotes, readPreferences } from './lib/preferences'
import { createBackup, parseBackup, readVisited } from './lib/favoritesBackup'
import { matchesNote, readCollections } from './lib/collections'
import './App.css'

function Icon({ name, size = 20, ...props }) {
  const paths = {
    coffee: <><path d="M4 8h13v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z"/><path d="M17 9h2a3 3 0 0 1 0 6h-2M7 2v3m4-3v3m4-3v3M2 23h18"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
    arrow: <><path d="m14 5 7 7-7 7M21 12H3"/></>,
    locate: <><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/></>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>,
    website: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/></>,
    share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m9 10 6-3M9 14l6 3"/></>,
    copy: <><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/></>,
    phone: <path d="M5 3h4l2 5-3 2a15 15 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2C10 21 3 14 3 5a2 2 0 0 1 2-2Z"/>,
    filter: <><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>
}

function Attribution({ cafe }) {
  return <>{cafe.attributions.map((item, i) => <a className="provider-credit" key={i} href={item.providerURI} target="_blank" rel="noreferrer">{item.provider}</a>)}</>
}
function CafePhoto({ cafe, photo = cafe.photo }) {
  const [failed, setFailed] = useState(false)
  return <div className="photo-wrap">{photo && !failed ? <><img src={photo.getURI({ maxWidth: 600 })} alt={cafe.name || 'Café'} loading="lazy" onError={() => setFailed(true)}/><div className="photo-credit">{photo.googleMapsURI && <a href={photo.googleMapsURI} target="_blank" rel="noreferrer">View photo on Google Maps</a>}{photo.authorAttributions.map((author, i) => <a key={i} href={author.uri} target="_blank" rel="noreferrer">{author.photoURI && <img className="author-avatar" src={author.photoURI} alt=""/>}Photo: {author.displayName}</a>)}</div></> : <div className="no-photo"><Icon name="coffee" size={30}/><span>No photo available</span></div>}</div>
}
function PhotoGallery({ cafe }) {
  const photos = cafe.photos?.length ? cafe.photos : cafe.photo ? [cafe.photo] : []
  const [index, setIndex] = useState(0)
  return <section className="photo-gallery" aria-label="Café photos"><CafePhoto key={index} cafe={cafe} photo={photos[index]}/>{photos.length > 1 && <div className="gallery-controls"><button disabled={index === 0} onClick={() => setIndex(index - 1)} aria-label="Previous café photo"><Icon name="arrow" size={18} style={{ transform: 'rotate(180deg)' }}/></button><span role="status">Photo {index + 1} of {photos.length}</span><button disabled={index === photos.length - 1} onClick={() => setIndex(index + 1)} aria-label="Next café photo"><Icon name="arrow" size={18}/></button></div>}</section>
}
function ResultTools({ query, onChange, cafes, onPick, loading, id }) {
  return <div className="result-tools"><label className="result-search" htmlFor={id}><Icon name="search" size={17}/><span className="sr-only">Search loaded cafés by name</span><input id={id} type="search" placeholder="Find a café in these results" value={query} onChange={e => onChange(e.target.value)}/>{query && <button aria-label="Clear café name search" onClick={() => onChange('')}><Icon name="close" size={16}/></button>}</label><button className="surprise-button" disabled={loading || !cafes.length} onClick={() => { const cafe = pickCafe(cafes); if (cafe) onPick(cafe) }}><Icon name="coffee" size={17}/>Surprise me</button><p>Search and random picks use only your matching loaded cafés.</p></div>
}

function FavoriteButton({ cafe, saved, onToggle }) {
  return <button className={`favorite ${saved ? 'saved' : ''}`} aria-label={`${saved ? 'Unsave' : 'Save'} ${cafe.name || 'café'}`} aria-pressed={saved} onClick={() => onToggle(cafe.id)}><Icon name="heart"/></button>
}
function BusinessInfo({ cafe }) {
  return <>{Number.isFinite(cafe.distance) && <p className="distance-label"><Icon name="locate" size={14}/>{formatDistance(cafe.distance)} away <span>· straight-line</span></p>}{cafe.rating != null && <p className="rating"><Icon name="star" size={14}/>{cafe.rating}{cafe.reviews != null && <small>({cafe.reviews} reviews)</small>}</p>}{cafe.address && <p className="address"><Icon name="pin" size={15}/>{cafe.address}</p>}{cafe.businessStatus === 'CLOSED_PERMANENTLY' ? <p className="status closed">Permanently closed</p> : cafe.businessStatus === 'CLOSED_TEMPORARILY' ? <p className="status closed">Temporarily closed</p> : typeof cafe.open === 'boolean' && <p className={`status ${cafe.open ? '' : 'closed'}`}><span/>{cafe.open ? 'Open now' : 'Closed now'}</p>}<Attribution cafe={cafe}/></>
}
function CafeCard({ cafe, selected, saved, onToggle, onSelect, onDetails, onCompare, compared, compareFull, travelMode }) {
  return <article className={`cafe-card ${selected ? 'selected' : ''}`}><div className="card-photo"><CafePhoto cafe={cafe}/><FavoriteButton cafe={cafe} saved={saved} onToggle={onToggle}/></div><div className="card-content"><div className="card-title"><button onClick={() => onSelect(cafe.id)}>{cafe.name || 'View café'}</button></div><BusinessInfo cafe={cafe}/><div className="card-actions"><button onClick={() => onDetails(cafe)}>View details <Icon name="arrow" size={15}/></button><a href={directionsURL(cafe, travelMode)} target="_blank" rel="noreferrer">Directions <Icon name="arrow" size={14}/></a></div>{onCompare && <label className="compare-check"><input type="checkbox" checked={compared} disabled={!compared && compareFull} onChange={() => onCompare(cafe)}/>Compare café</label>}</div></article>
}
function coffeeMarker(cafe) {
  const node = document.createElement('div')
  node.className = 'coffee-map-pin'
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M4 8h13v8a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4ZM17 9h2a3 3 0 0 1 0 6h-2M7 2v3m4-3v3m4-3v3M2 23h18')
  svg.append(path); node.append(svg)
  const label = document.createElement('span'); label.className = 'coffee-pin-label'; label.textContent = cafe.name || 'Café'; node.append(label)
  return node
}

function CafeMap({ results, selected, center, onSelect, visible, onError, onSearchArea, radius, loading }) {
  const [ready, setReady] = useState(false)
  const container = useRef(null)
  const mapRef = useRef(null)
  const markers = useRef([])
  const selectedRef = useRef(selected)
  useEffect(() => { selectedRef.current = selected }, [selected])
  const selectRef = useRef(onSelect)
  useEffect(() => { selectRef.current = onSelect }, [onSelect])
  useEffect(() => {
    if (!center) return
    let cancelled = false
    async function renderMap() {
      try {
        const maps = await loadGoogleMaps()
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([maps.importLibrary('maps'), maps.importLibrary('marker')])
        if (cancelled) return
        if (!mapRef.current) mapRef.current = new Map(container.current, { center, zoom: 14, mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID', mapTypeControl: false, streetViewControl: false, colorScheme: maps.ColorScheme.LIGHT, zoomControl: false, fullscreenControl: true, rotateControl: false, cameraControl: false, gestureHandling: 'cooperative', clickableIcons: false })
        const map = mapRef.current
        setReady(true)
        markers.current.forEach(marker => { marker.map = null })
        const bounds = new maps.LatLngBounds()
        markers.current = results.filter(c => c.location).map(cafe => {
          bounds.extend(cafe.location)
          const pin = coffeeMarker(cafe)
          const marker = new AdvancedMarkerElement({ map, position: cafe.location, title: cafe.name, content: pin })
          marker.cafeId = cafe.id
          marker.zIndex = cafe.id === selectedRef.current ? 10 : 1
          pin.classList.toggle('selected-pin', cafe.id === selectedRef.current)
          marker.addListener('click', () => selectRef.current(cafe.id))
          return marker
        })
        if (results.some(c => c.location)) map.fitBounds(bounds, 65)
        else { map.setCenter(center); map.setZoom(14) }
      } catch (error) { if (!cancelled) onError(error.message) }
    }
    renderMap()
    return () => { cancelled = true; markers.current.forEach(marker => { marker.map = null }) }
  }, [results, center, onError])
  useEffect(() => {
    const map = mapRef.current
    markers.current.forEach(marker => { marker.zIndex = marker.cafeId === selected ? 10 : 1; marker.content?.classList.toggle('selected-pin', marker.cafeId === selected) })
    const cafe = results.find(c => c.id === selected)
    if (map && cafe?.location) map.panTo(cafe.location)
  }, [selected, results, visible])
  function fitCafes() {
    if (!mapRef.current || !markers.current.length) return
    const bounds = new window.google.maps.LatLngBounds()
    markers.current.forEach(marker => bounds.extend(marker.position))
    mapRef.current.fitBounds(bounds, 65)
  }
  function zoomMap(delta) { const map = mapRef.current; if (map) map.setZoom(Math.max(3, Math.min(20, (map.getZoom() || 14) + delta))) }
  function searchArea() {
    const mapCenter = mapRef.current?.getCenter()
    if (mapCenter && !loading) onSearchArea(mapCenter.toJSON())
  }
  return <div className="map-pane"><div className="map-search-toolbar"><div><strong><Icon name="coffee" size={18}/>Your coffee neighborhood</strong><p>Search within {radius / 1000} km of the map center.</p></div><button className="primary" disabled={!ready || loading} onClick={searchArea}><Icon name="search" size={16}/>{loading ? 'Searching…' : 'Search this map area'}</button></div><div className="map-controls-row"><span><i/>Cafés <span className="map-legend-selected"/>Selected café</span><div><button onClick={fitCafes} disabled={!ready || !results.length}>Show all cafés</button><button aria-label="Zoom out" onClick={() => zoomMap(-1)} disabled={!ready}>−</button><button aria-label="Zoom in" onClick={() => zoomMap(1)} disabled={!ready}>+</button></div></div><div className="demo-map real-map"><div ref={container} className="google-map"/>{!center && <div className="map-placeholder"><Icon name="pin" size={34}/><h3>Your next café is out there.</h3><p>Search a city first, then move the map to explore another neighborhood.</p></div>}</div></div>
}
function ContactLinks({ cafe }) {
  let website
  try {
    const url = new URL(cafe.website)
    if (['https:', 'http:'].includes(url.protocol)) website = url
  } catch { /* Omit missing or invalid website URLs. */ }
  const phone = typeof cafe.phone === 'string' ? cafe.phone.trim() : ''
  const dial = phone.replace(/[\s().-]/g, '')
  const canCall = /^\+?[0-9]{3,15}$/.test(dial)
  if (!website && !canCall) return null
  return <section className="contact-section" aria-label="Café contact information"><h3>Contact the café</h3><div className="contact-links">{website && <a href={website.href} target="_blank" rel="noopener noreferrer"><Icon name="website" size={20}/><span><strong>Visit website</strong><small>{website.hostname.replace(/^www\./, '')}</small></span><Icon name="arrow" size={16}/><span className="sr-only"> for {cafe.name || 'this café'} (opens in a new tab)</span></a>}{canCall && <a href={`tel:${dial}`}><Icon name="phone" size={20}/><span><strong>Call café</strong><small>{phone}</small></span><Icon name="arrow" size={16}/><span className="sr-only">: {cafe.name || 'this café'}</span></a>}</div></section>
}

function ShareCafe({ cafe }) {
  const [message, setMessage] = useState('')
  const [manualCopy, setManualCopy] = useState(false)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)
  const url = cafe.googleMapsURI
  useEffect(() => { if (manualCopy) { inputRef.current?.focus(); inputRef.current?.select() } }, [manualCopy])
  if (!url) return null

  async function copyLink() {
    setBusy(true); setMessage(''); setManualCopy(false)
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(url)
      setMessage('Google Maps link copied.')
    } catch {
      setManualCopy(true)
      setMessage('Automatic copying is unavailable. Select the link below and copy it manually.')
    } finally { setBusy(false) }
  }
  async function share() {
    const data = { title: cafe.name || 'Café on Google Maps', url }
    if (!navigator.share || (navigator.canShare && !navigator.canShare(data))) { await copyLink(); return }
    setBusy(true); setMessage(''); setManualCopy(false)
    try { await navigator.share(data); setMessage('Share menu completed.') }
    catch (error) { if (error.name === 'AbortError') setMessage('Sharing canceled.'); else { await copyLink() } }
    finally { setBusy(false) }
  }
  return <div className="share-cafe"><div className="share-actions"><button disabled={busy} onClick={share}><Icon name="share" size={17}/>Share café</button><button disabled={busy} onClick={copyLink}><Icon name="copy" size={17}/>Copy link</button></div><p className="share-status" role="status">{message}</p>{manualCopy && <label className="manual-share-link">Google Maps link<input ref={inputRef} readOnly value={url} onFocus={e => e.target.select()}/></label>}</div>
}

function FavoriteNote({ value, onSave }) {
  const [draft, setDraft] = useState(value)
  const [status, setStatus] = useState('')
  return <section className="favorite-note"><label htmlFor="favorite-note">Your personal note</label><p>Written by you · Stored only on this device</p><textarea id="favorite-note" maxLength={500} rows={3} placeholder="Try the iced latte next time…" value={draft} onChange={e => { setDraft(e.target.value); setStatus('') }}/><div><small>{draft.length}/500</small><button onClick={() => setStatus(onSave(draft) ? 'Note saved on this device.' : 'Note saved for this session. Device storage is unavailable.')}>Save note</button>{(value || draft) && <button onClick={() => { setDraft(''); setStatus(onSave('') ? 'Note deleted.' : 'Note deleted for this session; device storage is unavailable.') }}>Delete note</button>}</div><p role="status">{status}</p></section>
}

function BackupTools({ favorites, notes, visited, onImport, collections }) {
  const [status, setStatus] = useState('')
  const [reading, setReading] = useState(false)
  const input = useRef(null)
  function download() {
    const blob = new Blob([JSON.stringify(createBackup(favorites, notes, visited, collections), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = 'brewspot-favorites.json'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setStatus('Backup downloaded: saved place IDs, your notes, and visited labels.')
  }
  async function importFile(e) {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setReading(true)
    try {
      if (file.size > 1000000) throw new Error('Choose a backup smaller than 1 MB.')
      const data = parseBackup(await file.text())
      const persisted = onImport(data)
      setStatus(`Merged ${data.favorites.length} saved cafés. Existing notes are kept. ${persisted ? 'Saved on this device.' : 'Device storage is unavailable; changes are available for this session.'} Use Load more below to retrieve imported cafés.`)
    } catch (error) { setStatus(error.message) }
    finally { setReading(false) }
  }
  return <section className="backup-tools" aria-label="Favorites backup"><div><strong>Keep your coffee list</strong><p>Backup includes your personal notes. Imported items merge into your favorites.</p></div><button disabled={!favorites.length} onClick={download}>Export backup</button><button disabled={reading} onClick={() => input.current?.click()}>{reading ? 'Importing…' : 'Import backup'}</button><input ref={input} type="file" accept=".json,application/json" hidden onChange={importFile}/><p className="backup-status" role="status">{status}</p></section>
}

function CollectionsManager({ collections, onChange }) {
  const [name, setName] = useState('')
  const [status, setStatus] = useState('')
  function create(e) {
    e.preventDefault()
    if (!name.trim()) return
    if (collections.some(c => c.name.toLowerCase() === name.trim().toLowerCase())) { setStatus('A collection with that name already exists.'); return }
    onChange([...collections, { id: crypto.randomUUID(), name: name.trim(), placeIds: [] }]); setName(''); setStatus('Collection created. Add cafés from their details panel.')
  }
  return <details className="collections-manager"><summary>Manage collections ({collections.length}/30)</summary><form onSubmit={create}><label htmlFor="collection-name">New collection name</label><input id="collection-name" maxLength={50} value={name} onChange={e => setName(e.target.value)} placeholder="Weekend coffee spots"/><button disabled={!name.trim() || collections.length >= 30}>Create collection</button></form><p role="status">{status}</p>{collections.map(c => <div className="collection-row" key={c.id}><span>{c.name}</span><button onClick={() => { onChange(collections.filter(item => item.id !== c.id)); setStatus('Collection deleted. Your saved cafés remain in Favorites.') }} aria-label={`Delete collection ${c.name}`}>Delete collection</button></div>)}</details>
}
function CollectionMembership({ cafe, collections, onChange }) {
  if (!collections.length) return <p className="discovery-hint">Create a collection in Favorites to organize this café.</p>
  return <fieldset className="collection-membership"><legend>Add to collections</legend>{collections.map(c => <label key={c.id}><input type="checkbox" checked={c.placeIds.includes(cafe.id)} onChange={() => onChange(collections.map(item => item.id === c.id ? { ...item, placeIds: item.placeIds.includes(cafe.id) ? item.placeIds.filter(id => id !== cafe.id) : [...item.placeIds, cafe.id] } : item))}/>{c.name}</label>)}</fieldset>
}

function Details({ cafe, onClose, saved, onToggle, travelMode, onTravelMode, note, onSaveNote, onMap, visited, onVisited, collections, onCollections }) {
  const closeRef = useRef(null)
  useEffect(() => { closeRef.current?.focus(); const old = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = old } }, [])
  return <div className="modal-backdrop" onClick={onClose}><section className="details" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') onClose(); if (e.key === 'Tab') { const controls = [...e.currentTarget.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)')]; const first = controls[0]; const last = controls.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() } } }}><button ref={closeRef} className="close-button" onClick={onClose} aria-label="Close café details"><Icon name="close"/></button><PhotoGallery key={cafe.id} cafe={cafe}/><div className="details-body"><span className="eyebrow">Business information</span><p className="google-attribution" translate="no">Google Maps</p><h2 id="detail-title">{cafe.name || 'Café details'}</h2><BusinessInfo cafe={cafe}/><ContactLinks cafe={cafe}/>{cafe.hours?.length > 0 && <><h3 className="hours-title">Opening hours</h3><ul className="hours">{cafe.hours.map(line => <li key={line}>{line}</li>)}</ul></>}<p className="detail-notice">Hours and business information can change. Check with the café before traveling.</p><TravelMode value={travelMode} onChange={onTravelMode}/><a className="primary" href={directionsURL(cafe, travelMode)} target="_blank" rel="noreferrer">Get directions <Icon name="arrow" size={16}/></a><button className="save-detail" onClick={() => onToggle(cafe.id)}><Icon name="heart" size={17}/>{saved ? 'Remove from favorites' : 'Save café'}</button><button className="save-detail" disabled={!cafe.location} onClick={() => onMap(cafe)}><Icon name="pin" size={17}/>Open café on map</button><button className="save-detail" aria-pressed={visited} onClick={() => onVisited(cafe.id)}>{visited ? 'Visited · Mark as want to try' : 'Want to try · Mark as visited'}</button>{saved && <CollectionMembership cafe={cafe} collections={collections} onChange={onCollections}/>} {saved && <FavoriteNote key={cafe.id} value={note || ''} onSave={onSaveNote}/>}<ShareCafe key={cafe.id} cafe={cafe}/>{cafe.googleMapsURI && <a className="google-link" href={cafe.googleMapsURI} target="_blank" rel="noreferrer">View on Google Maps</a>}</div></section></div>
}
function TravelMode({ value, onChange }) {
  return <label className="travel-mode">Directions mode<select value={value} onChange={e => onChange(e.target.value)}><option value="driving">Driving</option><option value="walking">Walking</option><option value="bicycling">Cycling</option></select></label>
}
function Comparison({ cafes, onRemove, onClear, travelMode }) {
  if (!cafes.length) return null
  return <section className="comparison" aria-labelledby="compare-title"><div className="comparison-heading"><div><h3 id="compare-title">Compare your coffee stops</h3><p role="status">{cafes.length} of 3 selected · Select Compare café on another card to add it.</p></div><button onClick={onClear}>Clear comparison</button></div><div className="comparison-scroll" tabIndex={0} aria-label="Café comparison table"><table><thead><tr><th scope="col">Café information</th>{cafes.map(c => <th scope="col" key={c.id}>{c.name || 'Café'}<button onClick={() => onRemove(c)} aria-label={`Remove ${c.name || 'café'} from comparison`}><Icon name="close" size={15}/></button></th>)}</tr></thead><tbody>{[
    ['Rating', c => c.rating != null ? `${c.rating} / 5${c.reviews != null ? ` (${c.reviews} reviews)` : ''}` : 'Not provided'],
    ['Straight-line distance', c => formatDistance(c.distance) || 'Not available'],
    ['Address', c => c.address || 'Not provided'],
    ['Business status', c => c.businessStatus === 'CLOSED_PERMANENTLY' ? 'Permanently closed' : c.businessStatus === 'CLOSED_TEMPORARILY' ? 'Temporarily closed' : typeof c.open === 'boolean' ? c.open ? 'Open now' : 'Closed now' : 'Not provided'],
    ['Opening hours', c => c.hours?.length ? <ul>{c.hours.map(line => <li key={line}>{line}</li>)}</ul> : 'Not provided'],
    ['Directions', c => <a href={directionsURL(c, travelMode)} target="_blank" rel="noreferrer">Get directions</a>],
  ].map(([label, render]) => <tr key={label}><th scope="row">{label}</th>{cafes.map(c => <td key={c.id}>{render(c)}<Attribution cafe={c}/></td>)}</tr>)}</tbody></table></div><p className="google-attribution" translate="no">Google Maps</p><p className="discovery-hint">Hours can change. Distance is measured from the search origin, not along a route.</p></section>
}

function RatingFilter({ value, onChange, id }) {
  return <div className="rating-filter"><label htmlFor={id}><Icon name="star" size={15}/>Minimum rating</label><select id={id} value={value} onChange={e => onChange(Number(e.target.value))}><option value="0">All ratings</option><option value="4">4.0 and up</option><option value="4.5">4.5 and up</option></select></div>
}

function FavoritesView({ favorites, onToggle, onDetails, onExplore, travelMode, visited, notes, onImport, collections, onCollections }) {
  const [collectionFilter, setCollectionFilter] = useState('all')
  const [noteQuery, setNoteQuery] = useState('')
  const [visitFilter, setVisitFilter] = useState('all')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sort, setSort] = useState('default')
  const [minimumRating, setMinimumRating] = useState(0)
  const [nameQuery, setNameQuery] = useState('')
  const started = useRef(false)
  const alive = useRef(false)
  const busy = useRef(false)
  const initialIds = useRef([...favorites])

  async function load(ids, replace = false) {
    if (busy.current || !ids.length) return
    busy.current = true; setLoading(true); setError('')
    try {
      const settled = await Promise.allSettled(ids.map(fetchSavedCafe))
      if (!alive.current) return
      const entries = settled.map((result, index) => result.status === 'fulfilled'
        ? { id: ids[index], cafe: result.value }
        : { id: ids[index], cafe: null })
      setItems(old => replace ? old.map(item => entries.find(entry => entry.id === item.id) || item) : [...old, ...entries])
      if (settled.some(result => result.status === 'rejected')) setError('Some saved cafés could not be loaded. Retry them, or remove unavailable entries.')
    } finally {
      busy.current = false
      if (alive.current) setLoading(false)
    }
  }
  useEffect(() => {
    alive.current = true
    if (!started.current) { started.current = true; load(initialIds.current.slice(0, 10)) }
    return () => { alive.current = false }
  }, [])

  const activeCollection = collections.find(c => c.id === collectionFilter)
  const visibleItems = items.filter(item => favorites.includes(item.id) && matchesNote(notes[item.id], noteQuery) && (!activeCollection || activeCollection.placeIds.includes(item.id)) && (visitFilter === 'all' || (visitFilter === 'visited' ? visited.includes(item.id) : !visited.includes(item.id))))
  const loadedIds = new Set(items.map(item => item.id))
  const remaining = favorites.filter(id => !loadedIds.has(id))
  const failed = visibleItems.filter(item => !item.cafe)
  const cafes = sortCafes(visibleItems.flatMap(item => item.cafe && matchesCafeName(item.cafe, nameQuery) && matchesMinimumRating(item.cafe, minimumRating) ? [item.cafe] : []), sort)
  return <section className="discovery favorites-page" id="favorites" aria-labelledby="favorites-title">
    <div className="discovery-top"><div><h2 id="favorites-title">Your saved coffee spots</h2><p className="favorites-subtitle">{favorites.length} saved · Current details fetched when you open this view.</p></div><button className="back-explore" onClick={onExplore}>Back to Explore <Icon name="arrow" size={15}/></button></div>
    <div className="favorites-summary" aria-label="Favorites summary"><div><strong>{favorites.length}</strong><span>Saved cafés</span></div><div><strong>{favorites.filter(id => visited.includes(id)).length}</strong><span>Visited</span></div><div><strong>{favorites.filter(id => !visited.includes(id)).length}</strong><span>Want to try</span></div></div>
    <CollectionsManager collections={collections} onChange={onCollections}/>
    <label className="travel-mode">Collection<select value={activeCollection?.id || 'all'} onChange={e => setCollectionFilter(e.target.value)}><option value="all">All collections</option>{collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label className="notes-search">Search your personal notes<input type="search" value={noteQuery} onChange={e => setNoteQuery(e.target.value)} placeholder="Search notes you wrote…"/></label>
    {(noteQuery || activeCollection) && <button className="clear-personal-filters" onClick={() => { setNoteQuery(''); setCollectionFilter('all') }}>Clear collection and note filters</button>}
    <BackupTools collections={collections} favorites={favorites} notes={notes} visited={visited} onImport={onImport}/>
    <label className="travel-mode">Visit status<select value={visitFilter} onChange={e => setVisitFilter(e.target.value)}><option value="all">All saved cafés</option><option value="visited">Visited</option><option value="want">Want to try</option></select></label>
    <p className="notice" role="status">{error || 'Your favorites stay on this device. Only place IDs are saved; business information is fetched from Google Maps.'}</p>
    {favorites.length > 0 && <div className="sort-toolbar"><label htmlFor="favorites-sort">Sort loaded cafés</label><select id="favorites-sort" value={sort} onChange={e => setSort(e.target.value)}><option value="default">Saved order</option><option value="rating">Highest rated</option></select></div>}
    {favorites.length > 0 && <><RatingFilter id="favorites-rating" value={minimumRating} onChange={setMinimumRating}/><p className="filter-summary" role="status">{cafes.length} matching cafés loaded{minimumRating > 0 && ' · Unrated cafés excluded'}{minimumRating > 0 && <button onClick={() => setMinimumRating(0)}>Clear rating filter</button>}</p></>}
    {!loading && (minimumRating > 0 || nameQuery.trim() || visitFilter !== 'all' || noteQuery.trim() || activeCollection) && !cafes.length && favorites.length > 0 && <p className="notice">No loaded favorites match. Adjust the collection, note, visit, name, or rating filters{remaining.length > 0 ? ' or load more saved cafés below.' : '.'}</p>}
    <ResultTools id="favorites-name" query={nameQuery} onChange={setNameQuery} cafes={cafes} onPick={onDetails} loading={loading}/>
    <div className="favorites-grid" aria-busy={loading}>{cafes.map(cafe => <CafeCard key={cafe.id} cafe={cafe} saved travelMode={travelMode} onToggle={onToggle} onSelect={() => onDetails(cafe)} onDetails={onDetails}/>)}
      {failed.map(item => <article className="unavailable-favorite" key={item.id}><Icon name="coffee" size={28}/><h3>Saved café unavailable</h3><p>We couldn’t retrieve this café’s details. It may be temporarily unavailable or its place ID may have changed.</p><button onClick={() => onToggle(item.id)}>Remove saved café</button></article>)}
      {loading && [1, 2].map(id => <div className="skeleton" key={`loading-${id}`} aria-label="Loading saved cafés"><div/><span/><span/></div>)}
    </div>
    {!favorites.length && <div className="empty"><Icon name="heart" size={32}/><h3>Keep your next coffee stop close.</h3><p>Tap the heart on any café to save it here.</p><button onClick={onExplore}>Discover cafés</button></div>}
    <div className="favorites-actions">{failed.length > 0 && <button disabled={loading} onClick={() => load(failed.map(item => item.id), true)}>Retry unavailable cafés</button>}{remaining.length > 0 && <button className="primary" disabled={loading} onClick={() => load(remaining.slice(0, 10))}>Load more ({remaining.length} remaining)</button>}</div>
    <p className="google-attribution" translate="no">Google Maps</p>
  </section>
}

function readFavorites() {
  try { const ids = JSON.parse(localStorage.getItem('brewspot-place-ids')); return Array.isArray(ids) ? ids.filter(id => typeof id === 'string') : [] } catch { return [] }
}
function App() {
  const [collections, setCollections] = useState(readCollections)
  useEffect(() => { try { localStorage.setItem('brewspot-collections', JSON.stringify(collections)) } catch { /* Collections remain available for this session. */ } }, [collections])
  const [visited, setVisited] = useState(readVisited)
  const [lastSearch, setLastSearch] = useState(null)
  const [preferences] = useState(readPreferences)
  const [notes, setNotes] = useState(readNotes)
  const [history, setHistory] = useState(readSearchHistory)
  const [travelMode, setTravelMode] = useState(preferences.travelMode)
  const [comparison, setComparison] = useState([])
  const [favoritesPage, setFavoritesPage] = useState(false)
  const [query, setQuery] = useState('')
  const [area, setArea] = useState('Choose an area')
  const [cafes, setCafes] = useState([])
  const [center, setCenter] = useState(null)
  const [radius, setRadius] = useState(preferences.radius)
  const [appliedRadius, setAppliedRadius] = useState(null)
  const [sort, setSort] = useState(preferences.sort)
  const [minimumRating, setMinimumRating] = useState(0)
  const [nameQuery, setNameQuery] = useState('')
  const [nearbyResults, setNearbyResults] = useState(false)
  const [mapSearchResults, setMapSearchResults] = useState(false)
  const [openOnly, setOpenOnly] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [favorites, setFavorites] = useState(readFavorites)
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [view, setView] = useState('list')
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [message, setMessage] = useState('')
  const [mapError, setMapError] = useState('')
  const detailTrigger = useRef(null)
  const request = useRef(0)
  // Only IDs persist. Names, hours, coordinates and photos stay in memory.
  useEffect(() => { try { localStorage.setItem('brewspot-place-ids', JSON.stringify(favorites)) } catch { /* Favorites still work for this session. */ } }, [favorites])
  const filteredResults = useMemo(() => cafes.filter(c => matchesCafeName(c, nameQuery) && matchesMinimumRating(c, minimumRating) && (!openOnly || (c.open === true && c.businessStatus === 'OPERATIONAL')) && (!favoritesOnly || favorites.includes(c.id))), [cafes, openOnly, favoritesOnly, favorites, minimumRating, nameQuery])
  const effectiveSort = sort === 'distance' && !nearbyResults ? 'default' : sort
  const results = useMemo(() => sortCafes(filteredResults, effectiveSort), [filteredResults, effectiveSort])
  useEffect(() => { try { localStorage.setItem('brewspot-preferences', JSON.stringify({ radius, sort, travelMode })) } catch { /* Preferences still work in memory. */ } }, [radius, sort, travelMode])
  useEffect(() => { try { localStorage.setItem('brewspot-visited', JSON.stringify(visited)) } catch { /* Session-only if storage is unavailable. */ } }, [visited])
  function toggleVisited(id) {
    setVisited(old => old.includes(id) ? old.filter(item => item !== id) : [...old, id])
    if (!favorites.includes(id)) setFavorites(old => [...old, id])
  }
  function importFavorites(data) {
    const nextFavorites = [...new Set([...favorites, ...data.favorites])]
    const nextNotes = { ...data.notes, ...notes }
    const nextVisited = [...new Set([...visited, ...data.visited])]
    const nextCollections = collections.map(collection => ({ ...collection, placeIds: [...collection.placeIds] }))
    for (const imported of data.collections || []) {
      const existing = nextCollections.find(c => c.name.toLowerCase() === imported.name.toLowerCase())
      if (existing) existing.placeIds = [...new Set([...existing.placeIds, ...imported.placeIds])]
      else if (nextCollections.length < 30) nextCollections.push({ ...imported, id: crypto.randomUUID() })
    }
    setCollections(nextCollections)
    setFavorites(nextFavorites); setNotes(nextNotes); setVisited(nextVisited)
    try {
      localStorage.setItem('brewspot-collections', JSON.stringify(nextCollections))
      localStorage.setItem('brewspot-place-ids', JSON.stringify(nextFavorites))
      localStorage.setItem('brewspot-personal-notes', JSON.stringify(nextNotes))
      localStorage.setItem('brewspot-visited', JSON.stringify(nextVisited)); return true
    } catch { return false }
  }
  function saveNote(id, value) {
    const next = { ...notes }; if (value.trim()) next[id] = value.slice(0, 500); else delete next[id]
    setNotes(next)
    try { localStorage.setItem('brewspot-personal-notes', JSON.stringify(next)); return true } catch { return false }
  }
  function openCafeMap(cafe) {
    ++request.current; setLoading(false); setDetail(null); setFavoritesPage(false); setView('map')
    setOpenOnly(false); setFavoritesOnly(false); setMinimumRating(0); setNameQuery(''); setComparison([])
    setCafes([{ ...cafe, distance: undefined }]); setCenter(cafe.location.toJSON()); setSelected(cafe.id)
    setArea(cafe.name || 'Saved café'); setNearbyResults(false); setMapSearchResults(false); setAppliedRadius(null); setHasSearched(true)
    setMessage('Showing this café. Move the map and click Search this map area to explore nearby.'); setMapError('')
    requestAnimationFrame(() => { const target = document.querySelector('.map-search-toolbar button'); target?.scrollIntoView({ block: 'center', behavior: 'auto' }); target?.focus({ preventScroll: true }) })
  }
  useEffect(() => { try { localStorage.setItem('brewspot-recent-searches', JSON.stringify(history)) } catch { /* History remains available in this session. */ } }, [history])
  function toggleCompare(cafe) { setComparison(old => old.some(c => c.id === cafe.id) ? old.filter(c => c.id !== cafe.id) : old.length < 3 ? [...old, cafe] : old) }
  function toggleFavorite(id) { setFavorites(old => old.includes(id) ? old.filter(item => item !== id) : [...old, id]) }
  async function runSearch(options, label, token) {
    setLastSearch({ options, label })
    try {
      const found = await findCafes(options)
      if (token !== request.current) return
      setComparison([]); setNameQuery(''); setCafes(found.map(cafe => ({ ...cafe, distance: options.center ? distanceMeters(options.center, cafe.location) : undefined }))); setArea(label);
      setMapSearchResults(Boolean(options.mapSearch)); setNearbyResults(Boolean(options.center)); setAppliedRadius(options.center ? options.radius : null); setHasSearched(true); setSelected(null); setDetail(null)
      setCenter(options.center || found.find(c => c.location)?.location?.toJSON() || null)
      setMessage(found.length ? 'Results from Google Maps. Opening information may change.' : 'No cafés found. Try another city or neighborhood.')
    } catch { if (token === request.current) { setMessage('Search failed. Check your connection, API key restrictions, billing, and that Maps JavaScript API and Places API (New) are enabled. Try another area or retry.'); setCafes([]); setHasSearched(true) } }
    finally { if (token === request.current) setLoading(false) }
  }
  function start() { if (!mapsConfigured) { setMessage('Google Maps needs an API key. Follow GOOGLE_MAPS_SETUP.md, add it to .env.local, and restart Vite.'); return null } setFavoritesPage(false); setLoading(true); setMessage(''); setMapError(''); return ++request.current }
  function searchAreaQuery(value) {
    if (!value.trim()) { setMessage('Enter a city or neighborhood to search.'); return }
    const token = start()
    if (token) { setQuery(value); setHistory(old => addRecentSearch(old, value)); runSearch({ query: value.trim() }, value.trim(), token) }
  }
  function search(e) { e.preventDefault(); searchAreaQuery(query) }

  function locate() {
    if (!navigator.geolocation || !window.isSecureContext) { setMessage('Location is unavailable. Use HTTPS (or localhost), or search a city above.'); return }
    const token = start(); if (!token) return
    navigator.geolocation.getCurrentPosition(position => { if (token === request.current) runSearch({ center: { lat: position.coords.latitude, lng: position.coords.longitude }, radius }, `Within ${radius / 1000} km of you`, token) }, error => { if (token !== request.current) return; setLoading(false); setMessage(error.code === 1 ? 'Location access was denied. Search a city or neighborhood above instead.' : error.code === 3 ? 'Location request timed out. Try again or search an area above.' : 'Your location is unavailable. Search a city or neighborhood above instead.') }, { timeout: 10000, maximumAge: 60000 })
  }
  function searchMapArea(mapCenter) {
    const token = start()
    if (token) runSearch({ center: mapCenter, radius, mapSearch: true }, `Within ${radius / 1000} km of the searched map center`, token)
  }
  function repeatSearch() {
    if (!lastSearch || loading) return
    const token = start()
    if (token) runSearch(lastSearch.options, lastSearch.label, token)
  }
  function closeDetails() { setDetail(null); detailTrigger.current?.focus() }
  return <><nav className="navigation"><a className="wordmark" href="#"><span className="brand-icon"><Icon name="coffee" size={23}/></span>BrewSpot</a><div className="nav-links"><a href="#explore" className={!favoritesPage ? 'current' : ''} onClick={() => { setFavoritesPage(false); setFavoritesOnly(false) }}>Explore</a><a href="#favorites" className={favoritesPage ? 'current' : ''} onClick={() => { ++request.current; setLoading(false); setDetail(null); setFavoritesPage(true) }}><Icon name="heart" size={17}/>Favorites <span className="favorite-count">{favorites.length}</span></a></div><span className="nav-note">Your neighborhood coffee finder</span></nav><main><section className="intro"><div className="eyebrow"><Icon name="pin" size={15}/>Find your coffee spot</div><h1>Find your next favorite café.</h1><p>Explore coffee spots around you, one cup at a time.</p><form className="search-form" onSubmit={search}><label className="search-box"><Icon name="search"/><span className="sr-only">Search a city or neighborhood</span><input placeholder="Search a city or neighborhood" value={query} onChange={e => setQuery(e.target.value)}/><button type="submit" aria-label="Search area" disabled={loading}><Icon name="arrow"/></button></label><label className="radius-control">Search radius<select value={radius} disabled={loading} onChange={e => setRadius(Number(e.target.value))} aria-describedby="radius-help">{SEARCH_RADII.map(value => <option key={value} value={value}>{value / 1000} km</option>)}</select></label><button className="primary" type="button" onClick={locate} disabled={loading}><Icon name="locate"/>{loading ? 'Searching…' : 'Find cafés near me'}</button></form>{history.length > 0 && <div className="recent-searches" aria-label="Recent city searches"><span>Recent</span>{history.map(item => <button key={item} disabled={loading} onClick={() => searchAreaQuery(item)}>{item}</button>)}<button className="clear-history" onClick={() => setHistory([])}>Clear history</button></div>}<p className="intro-note" id="radius-help"><Icon name="pin" size={13}/>{nearbyResults && appliedRadius !== radius ? `Radius changed to ${radius / 1000} km. Run a nearby or map search to apply.` : "Radius applies to nearby and map searches. Location is requested only for nearby search."}</p></section>{favoritesPage && <FavoritesView collections={collections} onCollections={setCollections} visited={visited} notes={notes} onImport={importFavorites} travelMode={travelMode} favorites={favorites} onToggle={toggleFavorite} onExplore={() => setFavoritesPage(false)} onDetails={c => { detailTrigger.current = document.activeElement; setDetail(c) }}/>}<section hidden={favoritesPage} className="discovery" id="explore" aria-label="Discover cafés"><div className="discovery-top"><h2>Explore cafés</h2><span className="demo-badge">{mapsConfigured ? 'Google Maps search' : 'Setup required'}</span></div><div className="notice" role="status">{message || 'Search a city or use your location to discover real cafés.'}{mapError && <p>{mapError}</p>}</div><div className="repeat-search">{lastSearch && <button disabled={loading} onClick={repeatSearch}>Search this area again</button>}{lastSearch?.options.center && <small>Repeats the previous search center and radius without requesting location again.</small>}</div><TravelMode value={travelMode} onChange={setTravelMode}/><Comparison cafes={comparison} onRemove={toggleCompare} onClear={() => setComparison([])} travelMode={travelMode}/><div className="mobile-views" aria-label="Results view"><button aria-pressed={view === 'list'} onClick={() => setView('list')}>List view</button><button aria-pressed={view === 'map'} onClick={() => setView('map')}>Map view</button></div><div className={`discovery-grid show-${view}`}><div className="list-pane"><div className="list-heading"><div><h3>{area}</h3><p>{results.length} cafés{favoritesOnly ? ' · Saved in these results' : ''}</p></div><Icon name="filter" size={19}/></div><div className="filters"><button aria-pressed={openOnly} onClick={() => setOpenOnly(!openOnly)}><span className="live-dot"/>Open now</button><button aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly(!favoritesOnly)}><Icon name="heart" size={15}/>Saved here</button><span>Up to 20 results</span></div><ResultTools id="explore-name" query={nameQuery} onChange={setNameQuery} cafes={results} loading={loading} onPick={c => { detailTrigger.current = document.activeElement; setDetail(c); setSelected(c.id) }}/><RatingFilter id="explore-rating" value={minimumRating} onChange={setMinimumRating}/>{(openOnly || favoritesOnly || minimumRating > 0 || nameQuery.trim()) && <p className="filter-summary" role="status">{results.length} of {cafes.length} loaded cafés{minimumRating > 0 && " · Unrated cafés excluded"}<button onClick={() => { setOpenOnly(false); setFavoritesOnly(false); setMinimumRating(0); setNameQuery('') }}>Clear filters</button></p>}<div className="sort-toolbar"><label htmlFor="cafe-sort">Sort cafés</label><select id="cafe-sort" value={effectiveSort} onChange={e => setSort(e.target.value)}><option value="default">Google result order</option><option value="distance" disabled={!nearbyResults}>Nearest first</option><option value="rating">Highest rated</option></select></div><p className="discovery-hint">{nearbyResults ? (mapSearchResults ? "Distances are straight-line estimates from the searched map center, not your location." : "Distances are straight-line estimates from your search location.") : "Use nearby or map search to see distances and sort by nearest."} Sorting compares only the loaded results.</p><div className="cafe-list" aria-busy={loading}>{loading ? [1,2,3].map(id => <div key={id} className="skeleton" aria-label="Loading cafés"><div/><span/><span/></div>) : results.length ? results.map(cafe => <CafeCard key={cafe.id} cafe={cafe} travelMode={travelMode} onCompare={toggleCompare} compared={comparison.some(c => c.id === cafe.id)} compareFull={comparison.length >= 3} selected={selected === cafe.id} saved={favorites.includes(cafe.id)} onToggle={toggleFavorite} onSelect={setSelected} onDetails={c => { detailTrigger.current = document.activeElement; setDetail(c); setSelected(c.id) }}/>) : <div className="empty"><Icon name="coffee" size={32}/><h3>{hasSearched ? 'No matching cafés' : 'Where shall we go?'}</h3><p>{hasSearched ? 'Try another area or clear your filters. Saved cafés appear when they are in the current search results.' : 'Use the search above to find your next coffee stop.'}</p>{(openOnly || favoritesOnly || minimumRating > 0 || nameQuery.trim()) && <button onClick={() => { setOpenOnly(false); setFavoritesOnly(false); setMinimumRating(0); setNameQuery('') }}>Clear filters</button>}</div>}</div><p className="google-attribution" translate="no">Google Maps</p></div><CafeMap results={filteredResults} selected={selected} center={center} onSelect={setSelected} visible={view} onError={setMapError} onSearchArea={searchMapArea} radius={radius} loading={loading}/></div></section></main><footer><span className="wordmark"><Icon name="coffee" size={18}/>BrewSpot</span><p>Made for the love of a good cup.</p><span>Business information provided by Google Maps</span></footer>{detail && <Details collections={collections} onCollections={setCollections} visited={visited.includes(detail.id)} onVisited={toggleVisited} note={notes[detail.id]} onSaveNote={value => saveNote(detail.id, value)} onMap={openCafeMap} travelMode={travelMode} onTravelMode={setTravelMode} cafe={detail} onClose={closeDetails} saved={favorites.includes(detail.id)} onToggle={toggleFavorite}/>}</>
}
export default App
