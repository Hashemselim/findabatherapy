import { describe, it, expect } from "vitest";
import type { PlanTier } from "@/lib/plans/features";

/**
 * Pure functions extracted from searchLocationsWithGooglePlaces for testing
 * These mirror the actual sorting and sectioning logic
 */

// Types
interface MockRealListing {
  locationId: string;
  agencyName: string;
  planTier: PlanTier;
  isFeatured: boolean;
  distanceMiles?: number;
}

interface MockGooglePlacesListing {
  id: string;
  name: string;
  distanceMiles?: number;
  isPrePopulated: true;
}

type SearchResultSection = "featured" | "nearby" | "other";

// Sorting functions (copied from search.ts for testing)
function sortByTierAndDistance(a: MockRealListing, b: MockRealListing) {
  const aIsPaid = a.planTier !== "free";
  const bIsPaid = b.planTier !== "free";
  if (aIsPaid && !bIsPaid) return -1;
  if (!aIsPaid && bIsPaid) return 1;
  return (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity);
}

function sortByDistance(a: MockGooglePlacesListing, b: MockGooglePlacesListing) {
  return (a.distanceMiles ?? Infinity) - (b.distanceMiles ?? Infinity);
}

// Sectioning function
function sectionResults(
  realListings: MockRealListing[],
  gpListings: MockGooglePlacesListing[],
  radiusMiles: number
) {
  // Separate featured
  const featured = realListings.filter((r) => r.isFeatured);
  const nonFeatured = realListings.filter((r) => !r.isFeatured);

  // Split non-featured by radius
  const realNearby = nonFeatured.filter(
    (r) => (r.distanceMiles ?? Infinity) <= radiusMiles
  );
  const realOther = nonFeatured.filter(
    (r) => (r.distanceMiles ?? Infinity) > radiusMiles
  );

  // Split Google Places by radius
  const gpNearby = gpListings.filter(
    (r) => (r.distanceMiles ?? Infinity) <= radiusMiles
  );
  const gpOther = gpListings.filter(
    (r) => (r.distanceMiles ?? Infinity) > radiusMiles
  );

  // Sort each group
  featured.sort(sortByTierAndDistance);
  realNearby.sort(sortByTierAndDistance);
  realOther.sort(sortByTierAndDistance);
  gpNearby.sort(sortByDistance);
  gpOther.sort(sortByDistance);

  // Combine in order
  const allResults = [
    ...featured.map((r) => ({ ...r, section: "featured" as const })),
    ...realNearby.map((r) => ({ ...r, section: "nearby" as const })),
    ...gpNearby.map((r) => ({ ...r, section: "nearby" as const })),
    ...realOther.map((r) => ({ ...r, section: "other" as const })),
    ...gpOther.map((r) => ({ ...r, section: "other" as const })),
  ];

  return {
    results: allResults,
    featuredCount: featured.length,
    nearbyCount: realNearby.length + gpNearby.length,
    otherCount: realOther.length + gpOther.length,
  };
}

// Pagination function
function paginateResults<T>(results: T[], page: number, limit: number) {
  const offset = (page - 1) * limit;
  const paginatedResults = results.slice(offset, offset + limit);
  const total = results.length;
  const totalPages = Math.ceil(total / limit);

  return {
    results: paginatedResults,
    total,
    page,
    totalPages,
    hasMore: page < totalPages,
  };
}

describe("Search Sorting Logic", () => {
  describe("sortByTierAndDistance", () => {
    it("should sort paid listings before free listings", () => {
      const listings: MockRealListing[] = [
        { locationId: "1", agencyName: "Free Co", planTier: "free", isFeatured: false, distanceMiles: 5 },
        { locationId: "2", agencyName: "Paid Co", planTier: "pro", isFeatured: false, distanceMiles: 10 },
      ];

      listings.sort(sortByTierAndDistance);

      expect(listings[0].agencyName).toBe("Paid Co");
      expect(listings[1].agencyName).toBe("Free Co");
    });

    it("should sort by distance when tiers are equal", () => {
      const listings: MockRealListing[] = [
        { locationId: "1", agencyName: "Far", planTier: "pro", isFeatured: false, distanceMiles: 50 },
        { locationId: "2", agencyName: "Near", planTier: "pro", isFeatured: false, distanceMiles: 5 },
        { locationId: "3", agencyName: "Mid", planTier: "pro", isFeatured: false, distanceMiles: 25 },
      ];

      listings.sort(sortByTierAndDistance);

      expect(listings[0].agencyName).toBe("Near");
      expect(listings[1].agencyName).toBe("Mid");
      expect(listings[2].agencyName).toBe("Far");
    });

    it("should treat enterprise and pro as equal priority", () => {
      const listings: MockRealListing[] = [
        { locationId: "1", agencyName: "Enterprise Far", planTier: "enterprise", isFeatured: false, distanceMiles: 50 },
        { locationId: "2", agencyName: "Pro Near", planTier: "pro", isFeatured: false, distanceMiles: 5 },
        { locationId: "3", agencyName: "Free", planTier: "free", isFeatured: false, distanceMiles: 1 },
      ];

      listings.sort(sortByTierAndDistance);

      // Pro should come first due to distance (both pro and enterprise are "paid")
      expect(listings[0].agencyName).toBe("Pro Near");
      expect(listings[1].agencyName).toBe("Enterprise Far");
      // Free always last, even if closer
      expect(listings[2].agencyName).toBe("Free");
    });

    it("should handle undefined distances by treating them as Infinity", () => {
      const listings: MockRealListing[] = [
        { locationId: "1", agencyName: "No Distance", planTier: "pro", isFeatured: false },
        { locationId: "2", agencyName: "Has Distance", planTier: "pro", isFeatured: false, distanceMiles: 100 },
      ];

      listings.sort(sortByTierAndDistance);

      expect(listings[0].agencyName).toBe("Has Distance");
      expect(listings[1].agencyName).toBe("No Distance");
    });
  });

  describe("sortByDistance (Google Places)", () => {
    it("should sort by distance ascending", () => {
      const listings: MockGooglePlacesListing[] = [
        { id: "1", name: "Far", distanceMiles: 50, isPrePopulated: true },
        { id: "2", name: "Near", distanceMiles: 5, isPrePopulated: true },
        { id: "3", name: "Mid", distanceMiles: 25, isPrePopulated: true },
      ];

      listings.sort(sortByDistance);

      expect(listings[0].name).toBe("Near");
      expect(listings[1].name).toBe("Mid");
      expect(listings[2].name).toBe("Far");
    });
  });
});

describe("Search Sectioning Logic", () => {
  describe("sectionResults", () => {
    it("should put featured listings first regardless of distance", () => {
      const realListings: MockRealListing[] = [
        { locationId: "1", agencyName: "Featured Far", planTier: "pro", isFeatured: true, distanceMiles: 100 },
        { locationId: "2", agencyName: "Not Featured Near", planTier: "pro", isFeatured: false, distanceMiles: 5 },
      ];
      const gpListings: MockGooglePlacesListing[] = [];

      const result = sectionResults(realListings, gpListings, 25);

      const first = result.results[0] as MockRealListing & { section: SearchResultSection };
      const second = result.results[1] as MockRealListing & { section: SearchResultSection };
      expect(first.agencyName).toBe("Featured Far");
      expect(first.section).toBe("featured");
      expect(second.agencyName).toBe("Not Featured Near");
      expect(second.section).toBe("nearby");
      expect(result.featuredCount).toBe(1);
    });

    it("should separate nearby and other by radius", () => {
      const realListings: MockRealListing[] = [
        { locationId: "1", agencyName: "Near", planTier: "free", isFeatured: false, distanceMiles: 10 },
        { locationId: "2", agencyName: "Far", planTier: "free", isFeatured: false, distanceMiles: 50 },
      ];
      const gpListings: MockGooglePlacesListing[] = [];

      const result = sectionResults(realListings, gpListings, 25);

      const first = result.results[0] as MockRealListing & { section: SearchResultSection };
      const second = result.results[1] as MockRealListing & { section: SearchResultSection };
      expect(first.section).toBe("nearby");
      expect(first.agencyName).toBe("Near");
      expect(second.section).toBe("other");
      expect(second.agencyName).toBe("Far");
      expect(result.nearbyCount).toBe(1);
      expect(result.otherCount).toBe(1);
    });

    it("should include Google Places in nearby section after real listings", () => {
      const realListings: MockRealListing[] = [
        { locationId: "1", agencyName: "Real Near", planTier: "free", isFeatured: false, distanceMiles: 10 },
      ];
      const gpListings: MockGooglePlacesListing[] = [
        { id: "gp1", name: "GP Near", distanceMiles: 15, isPrePopulated: true },
      ];

      const result = sectionResults(realListings, gpListings, 25);

      const first = result.results[0] as MockRealListing & { section: SearchResultSection };
      const second = result.results[1] as MockGooglePlacesListing & { section: SearchResultSection };
      expect(result.results.length).toBe(2);
      expect(first.agencyName).toBe("Real Near");
      expect(first.section).toBe("nearby");
      expect(second.name).toBe("GP Near");
      expect(second.section).toBe("nearby");
    });

    it("should sort paid before free within nearby section", () => {
      const realListings: MockRealListing[] = [
        { locationId: "1", agencyName: "Free Near", planTier: "free", isFeatured: false, distanceMiles: 5 },
        { locationId: "2", agencyName: "Paid Near", planTier: "pro", isFeatured: false, distanceMiles: 20 },
      ];
      const gpListings: MockGooglePlacesListing[] = [];

      const result = sectionResults(realListings, gpListings, 25);

      const first = result.results[0] as MockRealListing & { section: SearchResultSection };
      const second = result.results[1] as MockRealListing & { section: SearchResultSection };
      expect(first.agencyName).toBe("Paid Near");
      expect(second.agencyName).toBe("Free Near");
    });

    it("should handle the full sort order: Featured -> Nearby Paid -> Nearby Free -> Nearby GP -> Other Paid -> Other Free -> Other GP", () => {
      const realListings: MockRealListing[] = [
        { locationId: "1", agencyName: "Featured", planTier: "enterprise", isFeatured: true, distanceMiles: 100 },
        { locationId: "2", agencyName: "Nearby Paid", planTier: "pro", isFeatured: false, distanceMiles: 10 },
        { locationId: "3", agencyName: "Nearby Free", planTier: "free", isFeatured: false, distanceMiles: 15 },
        { locationId: "4", agencyName: "Other Paid", planTier: "pro", isFeatured: false, distanceMiles: 50 },
        { locationId: "5", agencyName: "Other Free", planTier: "free", isFeatured: false, distanceMiles: 60 },
      ];
      const gpListings: MockGooglePlacesListing[] = [
        { id: "gp1", name: "GP Nearby", distanceMiles: 20, isPrePopulated: true },
        { id: "gp2", name: "GP Other", distanceMiles: 70, isPrePopulated: true },
      ];

      const result = sectionResults(realListings, gpListings, 25);

      // Expected order:
      // 0: Featured (section: featured)
      // 1: Nearby Paid (section: nearby)
      // 2: Nearby Free (section: nearby)
      // 3: GP Nearby (section: nearby)
      // 4: Other Paid (section: other)
      // 5: Other Free (section: other)
      // 6: GP Other (section: other)

      expect(result.results.length).toBe(7);

      expect(result.results[0].section).toBe("featured");
      expect((result.results[0] as MockRealListing & { section: SearchResultSection }).agencyName).toBe("Featured");

      expect(result.results[1].section).toBe("nearby");
      expect((result.results[1] as MockRealListing & { section: SearchResultSection }).agencyName).toBe("Nearby Paid");

      expect(result.results[2].section).toBe("nearby");
      expect((result.results[2] as MockRealListing & { section: SearchResultSection }).agencyName).toBe("Nearby Free");

      expect(result.results[3].section).toBe("nearby");
      expect((result.results[3] as MockGooglePlacesListing & { section: SearchResultSection }).name).toBe("GP Nearby");

      expect(result.results[4].section).toBe("other");
      expect((result.results[4] as MockRealListing & { section: SearchResultSection }).agencyName).toBe("Other Paid");

      expect(result.results[5].section).toBe("other");
      expect((result.results[5] as MockRealListing & { section: SearchResultSection }).agencyName).toBe("Other Free");

      expect(result.results[6].section).toBe("other");
      expect((result.results[6] as MockGooglePlacesListing & { section: SearchResultSection }).name).toBe("GP Other");

      expect(result.featuredCount).toBe(1);
      expect(result.nearbyCount).toBe(3);
      expect(result.otherCount).toBe(3);
    });
  });
});

describe("Pagination Logic", () => {
  describe("paginateResults", () => {
    it("should return correct results for page 1", () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));

      const result = paginateResults(items, 1, 50);

      expect(result.results.length).toBe(50);
      expect(result.results[0].id).toBe(0);
      expect(result.results[49].id).toBe(49);
      expect(result.total).toBe(100);
      expect(result.totalPages).toBe(2);
      expect(result.hasMore).toBe(true);
    });

    it("should return correct results for page 2", () => {
      const items = Array.from({ length: 100 }, (_, i) => ({ id: i }));

      const result = paginateResults(items, 2, 50);

      expect(result.results.length).toBe(50);
      expect(result.results[0].id).toBe(50);
      expect(result.results[49].id).toBe(99);
      expect(result.page).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it("should handle partial last page", () => {
      const items = Array.from({ length: 75 }, (_, i) => ({ id: i }));

      const result = paginateResults(items, 2, 50);

      expect(result.results.length).toBe(25);
      expect(result.results[0].id).toBe(50);
      expect(result.results[24].id).toBe(74);
      expect(result.totalPages).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it("should return empty array for out-of-range page", () => {
      const items = Array.from({ length: 50 }, (_, i) => ({ id: i }));

      const result = paginateResults(items, 5, 50);

      expect(result.results.length).toBe(0);
      expect(result.total).toBe(50);
      expect(result.totalPages).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it("should handle empty results", () => {
      const items: { id: number }[] = [];

      const result = paginateResults(items, 1, 50);

      expect(result.results.length).toBe(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
      expect(result.hasMore).toBe(false);
    });
  });
});

describe("Combined Search Flow", () => {
  it("should correctly calculate totals and pagination for a realistic scenario", () => {
    // Simulate a search for NJ
    // 20 real listings, 1000 Google Places
    const realListings: MockRealListing[] = [
      // 1 featured
      { locationId: "f1", agencyName: "Featured Provider", planTier: "enterprise", isFeatured: true, distanceMiles: 45 },
      // 5 nearby paid
      ...Array.from({ length: 5 }, (_, i) => ({
        locationId: `np${i}`,
        agencyName: `Nearby Paid ${i}`,
        planTier: "pro" as PlanTier,
        isFeatured: false,
        distanceMiles: 5 + i * 3,
      })),
      // 8 nearby free
      ...Array.from({ length: 8 }, (_, i) => ({
        locationId: `nf${i}`,
        agencyName: `Nearby Free ${i}`,
        planTier: "free" as PlanTier,
        isFeatured: false,
        distanceMiles: 10 + i * 2,
      })),
      // 6 other (beyond 25 miles)
      ...Array.from({ length: 6 }, (_, i) => ({
        locationId: `o${i}`,
        agencyName: `Other ${i}`,
        planTier: (i < 2 ? "pro" : "free") as PlanTier,
        isFeatured: false,
        distanceMiles: 30 + i * 5,
      })),
    ];

    // 15 nearby GP, 985 other GP
    const gpListings: MockGooglePlacesListing[] = [
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `gpn${i}`,
        name: `GP Nearby ${i}`,
        distanceMiles: 5 + i,
        isPrePopulated: true as const,
      })),
      ...Array.from({ length: 985 }, (_, i) => ({
        id: `gpo${i}`,
        name: `GP Other ${i}`,
        distanceMiles: 30 + i,
        isPrePopulated: true as const,
      })),
    ];

    const sectionedResults = sectionResults(realListings, gpListings, 25);
    const paginatedPage1 = paginateResults(sectionedResults.results, 1, 50);
    const paginatedPage2 = paginateResults(sectionedResults.results, 2, 50);

    // Total should be 20 real + 1000 GP = 1020
    expect(paginatedPage1.total).toBe(1020);
    expect(paginatedPage1.totalPages).toBe(Math.ceil(1020 / 50)); // 21 pages

    // Page 1 should have 50 results
    expect(paginatedPage1.results.length).toBe(50);
    expect(paginatedPage1.hasMore).toBe(true);

    // First result should be featured
    expect(paginatedPage1.results[0].section).toBe("featured");

    // Section counts should be correct
    expect(sectionedResults.featuredCount).toBe(1);
    expect(sectionedResults.nearbyCount).toBe(5 + 8 + 15); // 28 (nearby paid + nearby free + nearby GP)
    expect(sectionedResults.otherCount).toBe(6 + 985); // 991 (other real + other GP)

    // Page 2 should continue from where page 1 left off
    expect(paginatedPage2.results.length).toBe(50);
    expect(paginatedPage2.page).toBe(2);
  });
});
