# Connect BrewSpot to Google Maps

The code is integrated, but real requests need your Google Cloud setup. No paid services have been enabled by this code change. Never paste credentials into chat.

## Costs before enabling billing

Google requires a billing-enabled project for Maps JavaScript API and Places API (New). This app requests ratings and opening hours, which trigger Enterprise search pricing. As checked against Google's global list on October 16, 2026:

| SKU | Monthly free usage cap | First paid tier, USD per 1,000 |
| --- | --- | --- |
| Dynamic Maps | 10,000 | $7 |
| Nearby Search Enterprise | 1,000 | $35 |
| Text Search Enterprise | 1,000 | $35 |
| Place Details Photos | 1,000 | $7 |

Search is triggered only by a submitted area or nearby button; typing and filtering do not issue searches. Nearby searches return up to 20 cafés within the chosen radius (1, 3, 5, or 10 km; default 3 km). Radius changes apply only when the nearby button is clicked again. Sorting by rating or distance uses loaded results without another Places search. Distances are straight-line estimates from the latest nearby search location, not route distances; city searches do not request user location or show distances. A map load and photos can create additional billable events. Free caps apply per SKU across the billing account, not per visitor. Region-specific rates, taxes, and Google pricing changes may apply. Set low API quotas for development and budget alerts. Budget alerts do not cap spending.

Official pricing: https://developers.google.com/maps/billing-and-pricing/pricing
Usage: https://developers.google.com/maps/documentation/javascript/usage-and-billing

## Google Cloud steps

1. Create/select a project at https://console.cloud.google.com/ . Review the costs above before linking billing.
2. Enable **Maps JavaScript API** and **Places API (New)**. Legacy Places, Geolocation API, Geocoding API, and Routes API are not needed. Browser location is provided by the browser; directions use a Google Maps URL.
3. Create an API key under APIs & Services > Credentials.
4. Set application restrictions to **Websites (HTTP referrers)**. For local Vite development, allow `http://localhost:5173/*` and, if used, `http://127.0.0.1:5173/*`. If Vite picks another port, explicitly allow it or run `npm run dev -- --port 5173 --strictPort`.
5. Restrict API access to **Maps JavaScript API** and **Places API (New)**.
6. Copy `.env.example` to `.env.local`. Put the key after `VITE_GOOGLE_MAPS_API_KEY=` on your own computer. Do not share it in chat. `.env.local` is ignored by the existing `*.local` gitignore rule.
7. Restart `npm run dev`. Test on localhost, or HTTPS when deployed.
8. For deployment, use a separate restricted production key, permit only your exact HTTPS domain(s), and configure the Vite environment variable before building. Set a JavaScript map ID in `VITE_GOOGLE_MAPS_MAP_ID`; local testing defaults to Google's `DEMO_MAP_ID`.

Vite's `VITE_` variables are included in browser code. They do **not** make keys secret. HTTP-referrer and API restrictions protect a browser key. Never put service-account JSON or server credentials in a Vite variable.

Security guidance: https://developers.google.com/maps/api-security-best-practices
Supported Nearby Search: https://developers.google.com/maps/documentation/javascript/nearby-search
Supported area Text Search: https://developers.google.com/maps/documentation/javascript/place-search

## Behavior and policy

- Initial screen contains no invented café results. Location permission is requested only on a nearby button click. Denial, timeout, unsupported location, missing configuration, failed searches and empty results have messages. Area search remains available.
- Card and marker selection match. Directions open Google Maps with the destination place ID.
- Photos and returned provider credits are displayed with their attributions. Map attribution is never covered by custom overlays. Mobile cards and details carry Google Maps attribution when the map is hidden.
- Opening status is calculated from returned current opening periods and the café's UTC offset. Unknown information is omitted. Hours are not guaranteed to be real-time; users should confirm with the café.
- Favorites persist **only place IDs**. The navigation Favorites view retrieves current details for saved cafés from past searches, ten at a time. Opening it again refreshes details and generates Place Details requests; Load more and retry also make requests. Removing favorites and sorting loaded favorites do not. The Saved here filter still filters the current discovery results. Names, photos, hours, addresses and coordinates are not persisted. Place Details requests with the requested ratings/hours use the Enterprise SKU and can incur charges beyond its free allowance; consult the official pricing list before broad use.
- No Google Maps scraping or unsupported amenity claims.
- Before public launch, supply publicly accessible Terms of Use and a Privacy Policy incorporating the required Google terms/privacy references. Explain browser location use and local favorite storage. Review policies for your billing region, especially EEA terms.

Photo requirements: https://developers.google.com/maps/documentation/javascript/place-photos
Storage and attribution: https://developers.google.com/maps/documentation/places/web-service/policies

## Verify after adding the key

1. Search a city; check real results and map markers.
2. Click nearby, allow location; check the 3 km search. Deny location and verify area search still works.
3. Click a card title and its marker; verify selection. Open details and directions.
4. Save cafés from two different area searches, reload, and open Favorites. Both should load without repeating those searches. Verify removal, rating sort, retry on failures, and Load more if you have more than ten saved cafés. Return to Explore and check the prior search is preserved.
5. Test a narrow/mobile viewport, map/list controls, keyboard navigation, photo credits, and map attribution.
6. If authorization fails, inspect the browser console for Google's error; check project billing, both APIs, referrer port/domain and key restrictions.

Build/lint can run without a key. Successful live API calls cannot be verified until your restricted key and billing setup are available.

## Search this map area

After your first city or nearby search loads the map, move it to another neighborhood and click **Search this map area** above the map. The button searches within the selected radius (1, 3, 5 or 10 km) of the map center at click time; it does not search the exact rectangular viewport. No location permission is needed. Moving/zooming the map alone does not issue Places searches. Each button click makes a billable Nearby Search request under the same pricing rules as nearby location search. Controls sit outside the map so attribution remains visible.

Results and distance sorting use that searched map center as their origin, not your physical location. Changing radius requires another explicit search. On mobile, switch to Map view to use the button. Initial setup requires a city or nearby search before the button is enabled.

Check manually: search a city, pan to another neighborhood, choose a radius, click the map search button, and verify matching cards/markers, the radius label, and the map-center distance explanation. Test a no-results area, keyboard access, and the mobile Map tab.

## Café contact links

Search and saved-place requests also ask for websiteURI, internationalPhoneNumber and nationalPhoneNumber. The details panel shows Visit website and Call café only when usable values are returned. Website links open a new tab; tel links launch the device’s calling handler and never place a call automatically. Opening details does not make an additional Places request for these fields. Contact information stays in memory, with only favorite IDs persisted. Repeat a search or reopen Favorites to load the new fields for previously loaded cafés.

Official field reference: https://developers.google.com/maps/documentation/javascript/reference/place

## Comparison, recent searches, and directions modes

- Select Compare café on up to three Explore cards to compare rating, straight-line distance, address, status, hours and directions. Comparison is session-only, uses loaded data, and clears after a successful new search so distances share one origin. Unknown values are labeled as unavailable. The table scrolls horizontally within its container on mobile.
- Recent city searches store up to five user-submitted query strings locally, not Google response data or device coordinates. Click a recent query to run a fresh, potentially billable search; Clear history removes the saved list.
- Choose Driving, Walking or Cycling in Explore or café details. Directions links pass Google's supported travelmode parameter and destination place ID to Google Maps. Routes and modes depend on Google's regional availability; BrewSpot does not calculate travel times or request Routes API.

Maps URLs documentation: https://developers.google.com/maps/documentation/urls/get-started
