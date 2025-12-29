#!/usr/bin/env python3
"""
Generate expanded cities.ts from Census Bureau data.
Filters to cities with 25k+ population (2023 estimates).
"""

import csv
import re
from collections import defaultdict

# State abbreviations
STATE_ABBREV = {
    "Alabama": "AL", "Alaska": "AK", "Arizona": "AZ", "Arkansas": "AR", "California": "CA",
    "Colorado": "CO", "Connecticut": "CT", "Delaware": "DE", "Florida": "FL", "Georgia": "GA",
    "Hawaii": "HI", "Idaho": "ID", "Illinois": "IL", "Indiana": "IN", "Iowa": "IA",
    "Kansas": "KS", "Kentucky": "KY", "Louisiana": "LA", "Maine": "ME", "Maryland": "MD",
    "Massachusetts": "MA", "Michigan": "MI", "Minnesota": "MN", "Mississippi": "MS", "Missouri": "MO",
    "Montana": "MT", "Nebraska": "NE", "Nevada": "NV", "New Hampshire": "NH", "New Jersey": "NJ",
    "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", "Ohio": "OH",
    "Oklahoma": "OK", "Oregon": "OR", "Pennsylvania": "PA", "Rhode Island": "RI", "South Carolina": "SC",
    "South Dakota": "SD", "Tennessee": "TN", "Texas": "TX", "Utah": "UT", "Vermont": "VT",
    "Virginia": "VA", "Washington": "WA", "West Virginia": "WV", "Wisconsin": "WI", "Wyoming": "WY",
    "District of Columbia": "DC", "Puerto Rico": "PR"
}

def slugify(name):
    """Convert city name to URL slug."""
    # Convert to lowercase and replace spaces/special chars with hyphens
    slug = name.lower()
    slug = re.sub(r"[''`]", "", slug)  # Remove apostrophes
    slug = re.sub(r'[^a-z0-9]+', '-', slug)  # Replace non-alphanumeric with hyphens
    slug = re.sub(r'-+', '-', slug)  # Collapse multiple hyphens
    slug = slug.strip('-')  # Remove leading/trailing hyphens
    return slug

def clean_city_name(name):
    """Clean city name for display."""
    # Special cases where "City" is part of the name
    special_cities = ["Phenix City", "Oklahoma City", "Kansas City", "Jersey City", "Lake City",
                      "Johnson City", "Iowa City", "Union City", "Carson City", "Daly City",
                      "Sioux City", "Park City", "Rapid City", "Salt Lake City", "West Valley City",
                      "Redwood City", "Culver City", "Studio City", "Foster City", "Commerce City",
                      "League City", "Texas City", "Bay City", "Garden City", "Dodge City"]

    for special in special_cities:
        if name.lower().startswith(special.lower()):
            return special

    # Remove various suffixes (including "city and borough", "municipality", etc.)
    name = re.sub(r'\s+(city and borough|city and|city|town|village|borough|CDP|municipality|unified government|metro government|consolidated government).*$', '', name, flags=re.IGNORECASE)
    return name.strip()

def main():
    cities_by_state = defaultdict(list)
    seen_slugs = defaultdict(set)  # Track slugs per state to avoid duplicates

    with open('/tmp/census_cities.csv', 'r', encoding='latin-1') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Only include places (SUMLEV 162 = incorporated places, 170 = CDPs)
            if row['SUMLEV'] not in ('162', '170'):
                continue

            state_name = row['STNAME']
            if state_name not in STATE_ABBREV:
                continue  # Skip territories except PR and DC

            # Skip Puerto Rico for now (different market)
            if state_name == "Puerto Rico":
                continue

            try:
                population = int(row['POPESTIMATE2023'])
            except (ValueError, KeyError):
                continue

            # Filter to 25k+ population
            if population < 25000:
                continue

            city_name = clean_city_name(row['NAME'])
            slug = slugify(city_name)
            state_abbrev = STATE_ABBREV[state_name]

            # Skip duplicates within same state
            if slug in seen_slugs[state_abbrev]:
                continue
            seen_slugs[state_abbrev].add(slug)

            cities_by_state[state_abbrev].append({
                'name': city_name,
                'slug': slug,
                'state': state_abbrev,
                'stateName': state_name,
                'population': population
            })

    # Sort cities within each state by population (descending)
    for state in cities_by_state:
        cities_by_state[state].sort(key=lambda x: x['population'], reverse=True)

    # Generate TypeScript output
    output = '''/**
 * Comprehensive US cities for SEO landing pages
 * Generated from US Census Bureau 2023 population estimates
 * Includes all cities/places with 25,000+ population
 * Used for /[state]/[city] routes
 */

export interface City {
  name: string;
  slug: string;
  state: string; // State abbreviation
  stateName: string; // Full state name
}

// Cities by state (sorted by population within each state)
export const CITIES_BY_STATE: Record<string, City[]> = {
'''

    # Output in alphabetical order by state abbreviation
    total_cities = 0
    for state_abbrev in sorted(cities_by_state.keys()):
        cities = cities_by_state[state_abbrev]
        total_cities += len(cities)
        output += f'  {state_abbrev}: [\n'
        for city in cities:
            output += f'    {{ name: "{city["name"]}", slug: "{city["slug"]}", state: "{city["state"]}", stateName: "{city["stateName"]}" }},\n'
        output += '  ],\n'

    output += '''};

// State abbreviation to full name mapping
export const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};

// State slug (lowercase) to abbreviation mapping
export const STATE_SLUG_TO_ABBREV: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new-hampshire": "NH", "new-jersey": "NJ",
  "new-mexico": "NM", "new-york": "NY", "north-carolina": "NC", "north-dakota": "ND", ohio: "OH",
  oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode-island": "RI", "south-carolina": "SC",
  "south-dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west-virginia": "WV", wisconsin: "WI", wyoming: "WY",
  "district-of-columbia": "DC", dc: "DC",
};

// Get all cities for a state
export function getCitiesForState(stateAbbrev: string): City[] {
  return CITIES_BY_STATE[stateAbbrev.toUpperCase()] || [];
}

// Get all cities across all states (for sitemap)
export function getAllCities(): City[] {
  return Object.values(CITIES_BY_STATE).flat();
}

// Get city by state and slug
export function getCity(stateAbbrev: string, citySlug: string): City | undefined {
  const cities = CITIES_BY_STATE[stateAbbrev.toUpperCase()];
  return cities?.find((c) => c.slug === citySlug);
}

// Get all state+city combinations for static params
export function getAllStateCityParams(): Array<{ state: string; city: string }> {
  const params: Array<{ state: string; city: string }> = [];
  for (const [stateAbbrev, cities] of Object.entries(CITIES_BY_STATE)) {
    const stateSlug = STATE_NAMES[stateAbbrev].toLowerCase().replace(/\\s+/g, "-");
    for (const city of cities) {
      params.push({ state: stateSlug, city: city.slug });
    }
  }
  return params;
}

// Total count
export const TOTAL_CITIES = getAllCities().length;

/**
 * Convert any state format (name, abbreviation, or slug) to URL-friendly slug
 * Examples:
 *   "New Jersey" → "new-jersey"
 *   "NJ" → "new-jersey"
 *   "new-jersey" → "new-jersey"
 */
export function getStateSlug(state: string): string | null {
  if (!state) return null;

  const normalized = state.trim();

  // Check if it's already a valid slug
  const slugLower = normalized.toLowerCase().replace(/\\s+/g, "-");
  if (STATE_SLUG_TO_ABBREV[slugLower]) {
    return slugLower;
  }

  // Check if it's an abbreviation (2 letters uppercase)
  const upperState = normalized.toUpperCase();
  if (STATE_NAMES[upperState]) {
    return STATE_NAMES[upperState].toLowerCase().replace(/\\s+/g, "-");
  }

  // Check if it's a full state name (case insensitive)
  for (const [, name] of Object.entries(STATE_NAMES)) {
    if (name.toLowerCase() === normalized.toLowerCase()) {
      return name.toLowerCase().replace(/\\s+/g, "-");
    }
  }

  // Fallback: convert to slug format (for unknown states, returns as-is slugified)
  return slugLower;
}
'''

    # Write output
    with open('/Users/hashemselim/Code/findabatherapy/src/lib/data/cities.ts', 'w') as f:
        f.write(output)

    print(f"Generated {total_cities} cities across {len(cities_by_state)} states")

    # Print summary by state
    for state in sorted(cities_by_state.keys()):
        print(f"  {state}: {len(cities_by_state[state])} cities")

if __name__ == '__main__':
    main()
