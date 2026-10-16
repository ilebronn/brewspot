# BrewSpot warm map style

Coffee markers, selection labels, light mode, the map header, zoom buttons and Show all cafés are implemented in the app. Google base-map colors must be published through Cloud map styling because this app uses a map ID for Advanced Markers. Do not set a local MapOptions.styles array alongside mapId.

1. In the same Google Cloud project, go to Google Maps Platform > Map Styles.
2. Create a light map style and open its JSON editor/import option. Import `maps/brewspot-warm.json` (cloud style schema, not the legacy styles array).
3. Preview the style and save/publish as **BrewSpot Warm**.
4. Associate it with your JavaScript map ID. If you currently use DEMO_MAP_ID, create your own JavaScript map ID first.
5. Set VITE_GOOGLE_MAPS_MAP_ID to that ID in `.env.local` and in Vercel's Production environment variables, then rebuild/redeploy if the ID changed. A map ID is not the API key.
6. When the style is published for an existing configured ID, allow time for propagation and refresh the map. No application rebuild is needed for a style-only update on the same map ID.

Palette: cream land, pale streets, sage parks, muted green water, espresso labels. Other points-of-interest labels are hidden to keep the café markers clear. The app leaves Google's map attribution and fullscreen control visible. Custom controls are outside the Google map viewport.

Official documentation:
https://developers.google.com/maps/documentation/javascript/cloud-customization/map-styles
https://developers.google.com/maps/documentation/javascript/cloud-customization/json-reference
