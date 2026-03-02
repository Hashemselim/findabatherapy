# Pre-compute City Coordinates

## Problem

City pages (`/[state]/[city]`) call `geocodeCityState()` on every render, hitting the Google Geocoding API. With 1,583 cities and hourly ISR revalidation, this generates ~46,700 API calls/month ($183/month) for data that never changes.

## Solution

Bake lat/lng coordinates directly into the `City` interface in `src/lib/data/cities.ts`. Geocode all 1,583 cities once via a script, then read coordinates from the static data at runtime — zero API calls, zero cost.

## Changes

### 1. Data Model (`src/lib/data/cities.ts`)

Add `lat` and `lng` to the `City` interface:

```ts
export interface City {
  name: string;
  slug: string;
  state: string;
  stateName: string;
  lat: number;
  lng: number;
}
```

### 2. City Page (`src/app/(site)/[state]/[city]/page.tsx`)

- `generateMetadata()`: use `city.lat`/`city.lng` for geo meta tags
- Page component: pass `city.lat`/`city.lng` as `userLat`/`userLng` to search
- Remove `import { geocodeCityState }` from this file

### 3. Seeding Script (`scripts/seed-city-coordinates.ts`)

One-time script that:
1. Iterates all cities in `CITIES_BY_STATE`
2. Geocodes each via Google Geocoding API (with rate-limit delays)
3. Writes updated data back to `cities.ts`
4. Cost: ~$6 one-time

### 4. Build-time Validation

Add a check that fails the build if any city is missing `lat`/`lng`, preventing accidental deploys without coordinates.

## What Does NOT Change

- `src/lib/geo/geocode.ts` — still used by provider locations and reverse geocoding
- `src/lib/geo/distance.ts` — pure math, no API calls
- `src/lib/actions/locations.ts` — provider geocoding untouched
- `src/app/api/geocode/route.ts` — "Use My Location" reverse geocoding untouched
- `src/app/api/places/*` — autocomplete flow untouched
- All hooks (`use-places-autocomplete`, `use-location-state`, `use-geolocation`)

## Impact

| Metric | Before | After |
|---|---|---|
| Geocoding API calls/month | ~46,700 | ~50-200 |
| Monthly cost | ~$183 | ~$1-2 |
| City page latency | +100-300ms | 0ms |
