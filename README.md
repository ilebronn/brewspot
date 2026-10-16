# BrewSpot

A café finder built with React, Vite, JavaScript and plain CSS, using Google Maps and Places (New).

## Run locally

```sh
npm install
npm run dev
```

Create `.env.local` with your restricted browser key and JavaScript map ID:

```env
VITE_GOOGLE_MAPS_API_KEY=your_restricted_browser_key
VITE_GOOGLE_MAPS_MAP_ID=your_javascript_map_id
```

See [Google Maps setup](GOOGLE_MAPS_SETUP.md) for billing, API restrictions, and attribution requirements. Vite variables are public browser configuration; never use server secrets here. Local environment files are excluded from Git.

## Features

Nearby, city and map-area search; matching cards and markers; ratings, hours, photos, contact links and directions; distance/rating sorting and filters; sharing and comparison; favorites, personal notes, visited labels, collections and JSON backups.

Only Google place IDs and user-authored data are persisted. Business information is fetched from Google and kept in memory.

## Checks

```sh
npm run build
npm run lint
node --test tests/discovery.test.js
```

## Deployment

Vercel uses `vercel.json`. Configure the two `VITE_` variables in Vercel before deployment, and allow the production domain in your browser key's website restrictions. See [map styling instructions](maps/README.md) to publish the warm Cloud map style.
