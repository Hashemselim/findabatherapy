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
 * Cost estimate: ~1,582 geocoding requests = ~$6 one-time
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
    console.warn(
      `  WARNING: Could not geocode "${cityName}, ${stateName}": ${data.status}`
    );
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
  const cityPattern =
    /\{ name: "([^"]+)", slug: "[^"]+", state: "[^"]+", stateName: "([^"]+)", lat: 0, lng: 0 \}/g;

  // Collect all matches first
  const matches: Array<{
    fullMatch: string;
    cityName: string;
    stateName: string;
  }> = [];
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
    console.log(
      `\nWARNING: ${failCount} cities failed geocoding. Re-run the script to retry.`
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
