# Pre-compute City Coordinates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate ~46,700 monthly Geocoding API calls ($183/mo) by baking lat/lng coordinates into the static cities dataset and reading them at build time instead of geocoding at runtime.

**Architecture:** Add `lat` and `lng` fields to the `City` interface in `src/lib/data/cities.ts`. Run a one-time seeding script to geocode all 1,583 cities and write coordinates back into the file. Update the city page to read coordinates from static data. Add build-time validation to prevent deploys with missing coordinates.

**Tech Stack:** TypeScript, Google Geocoding API (one-time), Node.js `fs` for file rewriting, Next.js build-time checks.

**Design doc:** `docs/plans/2026-03-01-precompute-city-coordinates-design.md`

---

### Task 1: Update the `City` Interface

**Files:**
- Modify: `src/lib/data/cities.ts:8-13`

**Step 1: Add `lat` and `lng` to the `City` interface**

Open `src/lib/data/cities.ts` and change the interface from:

```ts
export interface City {
  name: string;
  slug: string;
  state: string;
  stateName: string;
}
```

to:

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

**Step 2: Add temporary placeholder coordinates to every city entry**

Every city object in `CITIES_BY_STATE` needs `lat: 0, lng: 0` appended so TypeScript compiles while we work on the seeding script. There are 1,583 entries. Use a find-and-replace:

Find (regex):
```
stateName: "([^"]+)" \}
```

Replace:
```
stateName: "$1", lat: 0, lng: 0 }
```

Verify the file still has the same number of city entries after replacement.

**Step 3: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: PASS (all city objects now have `lat` and `lng`)

**Step 4: Commit**

```bash
git add src/lib/data/cities.ts
git commit -m "feat: add lat/lng fields to City interface with placeholder values"
```

---

### Task 2: Create the Seeding Script

**Files:**
- Create: `scripts/seed-city-coordinates.ts`

**Step 1: Write the seeding script**

Create `scripts/seed-city-coordinates.ts`:

```ts
/**
 * One-time City Coordinates Seeding Script
 *
 * Geocodes all cities in src/lib/data/cities.ts and writes lat/lng back into the file.
 *
 * Run with: npx tsx scripts/seed-city-coordinates.ts
 *
 * Prerequisites:
 * - GOOGLE_MAPS_API_KEY environment variable (in .env.local)
 *
 * Cost estimate: ~1,583 geocoding requests = ~$6 one-time
 *
 * The script:
 * 1. Reads the current cities.ts file
 * 2. Finds all city entries with lat: 0, lng: 0
 * 3. Geocodes each via Google Geocoding API
 * 4. Writes updated coordinates back to the file
 * 5. Skips cities that already have non-zero coordinates (safe to re-run)
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import * as fs from "fs";
import * as path from "path";

// Configuration
const DELAY_BETWEEN_REQUESTS_MS = 100; // 10 requests/sec, well within Google's 50/sec limit
const CITIES_FILE_PATH = path.join(__dirname, "../src/lib/data/cities.ts");

// Environment validation
const apiKey = process.env.GOOGLE_MAPS_API_KEY;
if (!apiKey) {
  console.error("ERROR: GOOGLE_MAPS_API_KEY environment variable is required");
  process.exit(1);
}

interface GeocodeResult {
  lat: number;
  lng: number;
}

async function geocodeCity(
  cityName: string,
  stateName: string
): Promise<GeocodeResult | null> {
  const address = encodeURIComponent(`${cityName}, ${stateName}, USA`);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${address}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "OK" || !data.results?.[0]) {
    console.warn(`  WARNING: Could not geocode "${cityName}, ${stateName}": ${data.status}`);
    return null;
  }

  const location = data.results[0].geometry.location;
  return { lat: location.lat, lng: location.lng };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("=== City Coordinates Seeding Script ===\n");

  // Read the file
  let fileContent = fs.readFileSync(CITIES_FILE_PATH, "utf-8");

  // Match city entries that have lat: 0, lng: 0 (not yet geocoded)
  // Pattern: { name: "CityName", slug: "city-slug", state: "XX", stateName: "StateName", lat: 0, lng: 0 }
  const cityPattern =
    /\{ name: "([^"]+)", slug: "[^"]+", state: "[^"]+", stateName: "([^"]+)", lat: 0, lng: 0 \}/g;

  // Collect all matches first
  const matches: Array<{ fullMatch: string; cityName: string; stateName: string }> = [];
  let match;
  while ((match = cityPattern.exec(fileContent)) !== null) {
    matches.push({
      fullMatch: match[0],
      cityName: match[1],
      stateName: match[2],
    });
  }

  console.log(`Found ${matches.length} cities needing coordinates.\n`);

  if (matches.length === 0) {
    console.log("All cities already have coordinates. Nothing to do.");
    return;
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < matches.length; i++) {
    const { fullMatch, cityName, stateName } = matches[i];
    const progress = `[${i + 1}/${matches.length}]`;

    const result = await geocodeCity(cityName, stateName);

    if (result) {
      // Replace this specific entry in the file content
      const updatedEntry = fullMatch.replace(
        "lat: 0, lng: 0",
        `lat: ${result.lat}, lng: ${result.lng}`
      );
      fileContent = fileContent.replace(fullMatch, updatedEntry);
      successCount++;
      console.log(
        `${progress} ${cityName}, ${stateName} => ${result.lat}, ${result.lng}`
      );
    } else {
      failCount++;
    }

    // Rate limit
    if (i < matches.length - 1) {
      await sleep(DELAY_BETWEEN_REQUESTS_MS);
    }

    // Write progress every 100 cities (in case of crash)
    if ((i + 1) % 100 === 0) {
      fs.writeFileSync(CITIES_FILE_PATH, fileContent, "utf-8");
      console.log(`\n  [Checkpoint] Saved progress at ${i + 1} cities.\n`);
    }
  }

  // Final write
  fs.writeFileSync(CITIES_FILE_PATH, fileContent, "utf-8");

  console.log(`\n=== Done ===`);
  console.log(`  Geocoded: ${successCount}`);
  console.log(`  Failed:   ${failCount}`);
  console.log(`  Total:    ${matches.length}`);

  if (failCount > 0) {
    console.log(`\nWARNING: ${failCount} cities failed geocoding. Re-run the script to retry.`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
```

**Step 2: Verify the script compiles**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 3: Commit**

```bash
git add scripts/seed-city-coordinates.ts
git commit -m "feat: add one-time city coordinates seeding script"
```

---

### Task 3: Run the Seeding Script

**Files:**
- Modify: `src/lib/data/cities.ts` (automated by the script)

**Step 1: Run the script**

```bash
npx tsx scripts/seed-city-coordinates.ts
```

Expected: The script geocodes all 1,583 cities and writes coordinates into `cities.ts`. Takes ~3 minutes at 100ms delay. Cost: ~$6 one-time on Google Geocoding API.

**Step 2: Verify no zeros remain**

```bash
grep "lat: 0, lng: 0" src/lib/data/cities.ts
```

Expected: No output (no remaining placeholder coordinates).

**Step 3: Spot-check a few known cities**

Open `src/lib/data/cities.ts` and verify:
- Anchorage, AK should be roughly `lat: 61.2, lng: -149.9`
- New York, NY should be roughly `lat: 40.7, lng: -74.0`
- Los Angeles, CA should be roughly `lat: 34.0, lng: -118.2`

**Step 4: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/data/cities.ts
git commit -m "data: populate lat/lng for all 1,583 cities via geocoding"
```

---

### Task 4: Update the City Page to Use Static Coordinates

**Files:**
- Modify: `src/app/(site)/[state]/[city]/page.tsx`

**Step 1: Remove the `geocodeCityState` import**

In `src/app/(site)/[state]/[city]/page.tsx`, delete line 20:

```ts
import { geocodeCityState } from "@/lib/geo/geocode";
```

**Step 2: Update `generateMetadata()` to use `city.lat`/`city.lng`**

In `generateMetadata()` (around lines 63-116), remove the geocoding call and use static data:

Replace:
```ts
  // Geocode for geo meta tags
  const coords = await geocodeCityState(city.name, city.stateName);
```

With nothing (delete the line entirely).

Then update the `other` metadata section. Replace:
```ts
    other: {
      "geo.region": `US-${stateAbbrev}`,
      "geo.placename": city.name,
      ...(coords && {
        "geo.position": `${coords.latitude};${coords.longitude}`,
        ICBM: `${coords.latitude}, ${coords.longitude}`,
      }),
    },
```

With:
```ts
    other: {
      "geo.region": `US-${stateAbbrev}`,
      "geo.placename": city.name,
      "geo.position": `${city.lat};${city.lng}`,
      ICBM: `${city.lat}, ${city.lng}`,
    },
```

**Step 3: Update the page component to use `city.lat`/`city.lng`**

In the `CityPage` component (around lines 118-156), replace:

```ts
  // Geocode the city to get coordinates for proximity search
  const cityCoords = await geocodeCityState(city.name, city.stateName);

  // Search for providers in the state, sorted by proximity to this city
  // NOTE: We intentionally do NOT pass the city filter - we want ALL state providers
  // sorted by distance to this city, not filtered to only this city
  const result = await searchProviderLocationsWithGooglePlaces(
    {
      state: city.stateName,
      // Don't pass city - it would filter results instead of just sorting
      userLat: cityCoords?.latitude,
      userLng: cityCoords?.longitude,
    },
    {
      limit: 50, // Show more results on city pages
      sortBy: "distance",
    }
  );
```

With:
```ts
  // Search for providers in the state, sorted by proximity to this city
  // NOTE: We intentionally do NOT pass the city filter - we want ALL state providers
  // sorted by distance to this city, not filtered to only this city
  const result = await searchProviderLocationsWithGooglePlaces(
    {
      state: city.stateName,
      // Don't pass city - it would filter results instead of just sorting
      userLat: city.lat,
      userLng: city.lng,
    },
    {
      limit: 50, // Show more results on city pages
      sortBy: "distance",
    }
  );
```

**Step 4: Update the `hasProximitySearch` variable**

Replace:
```ts
  // City pages have proximity search if geocoding succeeded
  const hasProximitySearch = cityCoords !== null;
```

With:
```ts
  // City pages always have proximity search since coordinates are pre-computed
  const hasProximitySearch = true;
```

**Step 5: Run TypeScript type check**

Run: `npx tsc --noEmit`
Expected: PASS. No remaining references to `geocodeCityState` in this file.

**Step 6: Verify no other files import `geocodeCityState` for city pages**

```bash
grep -r "geocodeCityState" src/ --include="*.ts" --include="*.tsx"
```

Expected: Only `src/lib/geo/geocode.ts` should define it. No other files should import it (the city page was the only consumer). If other files reference it, they need updating too — but per the audit, only the city page uses it.

**Step 7: Commit**

```bash
git add src/app/(site)/[state]/[city]/page.tsx
git commit -m "perf: use pre-computed city coordinates instead of runtime geocoding

Eliminates ~46,700 monthly Google Geocoding API calls ($183/mo).
City pages now read lat/lng from static data (zero API calls, zero latency)."
```

---

### Task 5: Add Build-Time Validation

**Files:**
- Create: `src/lib/data/__tests__/cities-coordinates.test.ts`

**Step 1: Write the validation test**

Create `src/lib/data/__tests__/cities-coordinates.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getAllCities } from "../cities";

describe("City coordinates validation", () => {
  const allCities = getAllCities();

  it("should have cities loaded", () => {
    expect(allCities.length).toBeGreaterThan(1500);
  });

  it("every city must have non-zero lat/lng", () => {
    const missingCoords = allCities.filter(
      (city) => city.lat === 0 && city.lng === 0
    );

    if (missingCoords.length > 0) {
      const examples = missingCoords
        .slice(0, 5)
        .map((c) => `${c.name}, ${c.state}`)
        .join(", ");
      fail(
        `${missingCoords.length} cities missing coordinates. Examples: ${examples}. ` +
          `Run: npx tsx scripts/seed-city-coordinates.ts`
      );
    }

    expect(missingCoords).toHaveLength(0);
  });

  it("all latitudes should be in continental US range (24-72)", () => {
    const outOfRange = allCities.filter(
      (city) => city.lat < 17 || city.lat > 72
    );

    if (outOfRange.length > 0) {
      const examples = outOfRange
        .slice(0, 5)
        .map((c) => `${c.name}, ${c.state}: ${c.lat}`)
        .join(", ");
      fail(`Cities with out-of-range latitudes: ${examples}`);
    }

    expect(outOfRange).toHaveLength(0);
  });

  it("all longitudes should be in US range (-180 to -64)", () => {
    const outOfRange = allCities.filter(
      (city) => city.lng < -180 || city.lng > -64
    );

    if (outOfRange.length > 0) {
      const examples = outOfRange
        .slice(0, 5)
        .map((c) => `${c.name}, ${c.state}: ${c.lng}`)
        .join(", ");
      fail(`Cities with out-of-range longitudes: ${examples}`);
    }

    expect(outOfRange).toHaveLength(0);
  });
});
```

**Step 2: Check if vitest is configured**

```bash
grep -l "vitest" package.json
```

If vitest is not in the project, the tests can use Jest or any existing test runner. Check `package.json` for the test script. If no test runner exists, this can be done as a simple Node script instead:

Create `scripts/validate-city-coordinates.ts` as a fallback:

```ts
import { getAllCities } from "../src/lib/data/cities";

const cities = getAllCities();
const missing = cities.filter((c) => c.lat === 0 && c.lng === 0);

if (missing.length > 0) {
  console.error(`ERROR: ${missing.length} cities missing coordinates!`);
  missing.slice(0, 10).forEach((c) => console.error(`  - ${c.name}, ${c.state}`));
  console.error("Run: npx tsx scripts/seed-city-coordinates.ts");
  process.exit(1);
}

const badLat = cities.filter((c) => c.lat < 17 || c.lat > 72);
const badLng = cities.filter((c) => c.lng < -180 || c.lng > -64);

if (badLat.length > 0 || badLng.length > 0) {
  console.error("ERROR: Cities with out-of-range coordinates!");
  [...badLat, ...badLng].slice(0, 10).forEach((c) =>
    console.error(`  - ${c.name}, ${c.state}: ${c.lat}, ${c.lng}`)
  );
  process.exit(1);
}

console.log(`All ${cities.length} cities have valid coordinates.`);
```

**Step 3: Run the validation**

If using vitest/jest:
```bash
npx vitest run src/lib/data/__tests__/cities-coordinates.test.ts
```

If using the script:
```bash
npx tsx scripts/validate-city-coordinates.ts
```

Expected: PASS — all cities have valid coordinates in range.

**Step 4: Commit**

```bash
git add src/lib/data/__tests__/cities-coordinates.test.ts
# or: git add scripts/validate-city-coordinates.ts
git commit -m "test: add build-time validation for city coordinates"
```

---

### Task 6: Full Build Verification

**Files:** None (verification only)

**Step 1: Run TypeScript type check**

```bash
npx tsc --noEmit
```

Expected: PASS

**Step 2: Run lint**

```bash
npm run lint
```

Expected: PASS. No unused imports (the `geocodeCityState` import was removed).

**Step 3: Run full build**

```bash
npm run build 2>&1 | tail -100
```

Expected: PASS. The city pages should now build without making any geocoding API calls. Build output should show `/[state]/[city]` pages compiling successfully.

**Step 4: Verify locally (optional but recommended)**

```bash
npm run dev
```

Open `http://localhost:3000/new-jersey/edison` and:
- Check the page loads with provider results sorted by distance
- Inspect page source for `geo.position` meta tag with real coordinates
- Confirm no geocoding API calls in the terminal logs

**Step 5: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix: address build issues from city coordinates migration"
```

---

### Task 7: Final Cleanup and Push

**Files:** None

**Step 1: Review all commits**

```bash
git log --oneline -10
```

Verify the commit history tells a clear story:
1. `feat: add lat/lng fields to City interface with placeholder values`
2. `feat: add one-time city coordinates seeding script`
3. `data: populate lat/lng for all 1,583 cities via geocoding`
4. `perf: use pre-computed city coordinates instead of runtime geocoding`
5. `test: add build-time validation for city coordinates`

**Step 2: Push to main**

```bash
git push origin HEAD:main
```

This triggers Vercel deploy. After deploy, the monthly Geocoding API cost drops from ~$183 to ~$1-2.

---

## Post-Deployment Verification

After Vercel deploy completes:
1. Visit a city page (e.g., `/new-jersey/edison`) and confirm providers load with distance sorting
2. Check page source for `geo.position` meta tag
3. Monitor Google Cloud Console over 24 hours to confirm geocoding calls dropped dramatically
4. The remaining ~50-200 calls/month will be from provider location management (`addLocation`/`updateLocation`) and the "Use My Location" reverse geocoding feature — both are correct and expected

## Adding New Cities in the Future

When adding new cities to `CITIES_BY_STATE`:
1. Add the entry with `lat: 0, lng: 0`
2. Run `npx tsx scripts/seed-city-coordinates.ts` — it only geocodes cities with `lat: 0, lng: 0`
3. The validation test will catch any cities missing coordinates before deploy
