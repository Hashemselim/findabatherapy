/**
 * Build-time validation for city coordinates
 *
 * Ensures all cities in the dataset have valid lat/lng coordinates.
 * Run before deploy to catch missing coordinates.
 *
 * Run with: npx tsx scripts/validate-city-coordinates.ts
 */

import { getAllCities } from "../src/lib/data/cities";

const cities = getAllCities();

console.log(`Validating ${cities.length} cities...\n`);

// Check for missing coordinates
const missing = cities.filter((c) => c.lat === 0 && c.lng === 0);
if (missing.length > 0) {
  console.error(`ERROR: ${missing.length} cities missing coordinates!`);
  missing.slice(0, 10).forEach((c) => console.error(`  - ${c.name}, ${c.state}`));
  console.error("\nFix: npx tsx scripts/seed-city-coordinates.ts");
  process.exit(1);
}

// Check latitude range (US: 17° to 72° — includes Hawaii, Alaska, territories)
const badLat = cities.filter((c) => c.lat < 17 || c.lat > 72);
if (badLat.length > 0) {
  console.error("ERROR: Cities with out-of-range latitudes!");
  badLat.slice(0, 10).forEach((c) =>
    console.error(`  - ${c.name}, ${c.state}: lat=${c.lat}`)
  );
  process.exit(1);
}

// Check longitude range (US: -180° to -64° — includes Alaska, Hawaii, territories)
const badLng = cities.filter((c) => c.lng < -180 || c.lng > -64);
if (badLng.length > 0) {
  console.error("ERROR: Cities with out-of-range longitudes!");
  badLng.slice(0, 10).forEach((c) =>
    console.error(`  - ${c.name}, ${c.state}: lng=${c.lng}`)
  );
  process.exit(1);
}

console.log(`All ${cities.length} cities have valid coordinates.`);
