import { getGeoConfig, type GeocodingResult, type GeoProvider } from "./config";

// Simple in-memory cache for geocoding results
const geocodeCache = new Map<string, GeocodingResult>();

/**
 * Geocode an address string to coordinates
 */
export async function geocodeAddress(
  address: string
): Promise<GeocodingResult | null> {
  if (!address.trim()) return null;

  // Check cache first
  const cacheKey = address.toLowerCase().trim();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  const config = getGeoConfig();
  if (!config) {
    return null;
  }

  try {
    let result: GeocodingResult | null = null;

    switch (config.provider) {
      case "google":
        result = await geocodeWithGoogle(address, config.apiKey);
        break;
      case "mapbox":
        result = await geocodeWithMapbox(address, config.apiKey);
        break;
      case "opencage":
        result = await geocodeWithOpenCage(address, config.apiKey);
        break;
    }

    if (result) {
      geocodeCache.set(cacheKey, result);
    }

    return result;
  } catch {
    return null;
  }
}

/**
 * Geocode city/state to coordinates
 */
export async function geocodeCityState(
  city: string,
  state: string
): Promise<GeocodingResult | null> {
  return geocodeAddress(`${city}, ${state}, USA`);
}

/**
 * Geocode a ZIP code to coordinates
 */
export async function geocodeZipCode(
  zipCode: string
): Promise<GeocodingResult | null> {
  return geocodeAddress(`${zipCode}, USA`);
}

/**
 * Google Maps Geocoding API
 */
async function geocodeWithGoogle(
  address: string,
  apiKey: string
): Promise<GeocodingResult | null> {
  const encodedAddress = encodeURIComponent(address);
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "OK" || !data.results?.[0]) {
    return null;
  }

  const result = data.results[0];
  const location = result.geometry.location;

  // Extract address components
  let city: string | undefined;
  let state: string | undefined;
  let postalCode: string | undefined;
  let country: string | undefined;

  for (const component of result.address_components) {
    if (component.types.includes("locality")) {
      city = component.long_name;
    }
    if (component.types.includes("administrative_area_level_1")) {
      state = component.short_name;
    }
    if (component.types.includes("postal_code")) {
      postalCode = component.long_name;
    }
    if (component.types.includes("country")) {
      country = component.short_name;
    }
  }

  return {
    latitude: location.lat,
    longitude: location.lng,
    formattedAddress: result.formatted_address,
    city,
    state,
    postalCode,
    country,
  };
}

/**
 * Mapbox Geocoding API
 */
async function geocodeWithMapbox(
  address: string,
  apiKey: string
): Promise<GeocodingResult | null> {
  const encodedAddress = encodeURIComponent(address);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${apiKey}&country=US&types=address,place,postcode`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.features?.[0]) {
    return null;
  }

  const feature = data.features[0];
  const [longitude, latitude] = feature.center;

  // Extract context components
  let city: string | undefined;
  let state: string | undefined;
  let postalCode: string | undefined;
  let country: string | undefined;

  for (const ctx of feature.context || []) {
    if (ctx.id.startsWith("place.")) {
      city = ctx.text;
    }
    if (ctx.id.startsWith("region.")) {
      state = ctx.short_code?.replace("US-", "");
    }
    if (ctx.id.startsWith("postcode.")) {
      postalCode = ctx.text;
    }
    if (ctx.id.startsWith("country.")) {
      country = ctx.short_code?.toUpperCase();
    }
  }

  return {
    latitude,
    longitude,
    formattedAddress: feature.place_name,
    city,
    state,
    postalCode,
    country,
  };
}

/**
 * OpenCage Geocoding API
 */
async function geocodeWithOpenCage(
  address: string,
  apiKey: string
): Promise<GeocodingResult | null> {
  const encodedAddress = encodeURIComponent(address);
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodedAddress}&key=${apiKey}&countrycode=us&limit=1`;

  const response = await fetch(url);
  const data = await response.json();

  if (!data.results?.[0]) {
    return null;
  }

  const result = data.results[0];
  const components = result.components;

  return {
    latitude: result.geometry.lat,
    longitude: result.geometry.lng,
    formattedAddress: result.formatted,
    city: components.city || components.town || components.village,
    state: components.state_code,
    postalCode: components.postcode,
    country: components.country_code?.toUpperCase(),
  };
}

/**
 * Clear the geocoding cache
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
}

/**
 * Get the current geocoding provider
 */
export function getGeocodeProvider(): GeoProvider | null {
  const config = getGeoConfig();
  return config?.provider || null;
}
