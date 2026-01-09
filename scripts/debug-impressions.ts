import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createClient } from "@supabase/supabase-js";

// Use service role to read audit_events (RLS protected)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function debugImpressions() {
  console.log("=== SEARCH IMPRESSIONS BREAKDOWN ===\n");

  // Check all audit events with search_impression type
  const { data: allImpressions, error: allError } = await supabase
    .from("audit_events")
    .select("listing_id, created_at, metadata")
    .eq("event_type", "search_impression")
    .order("created_at", { ascending: false })
    .limit(500);

  if (allError) {
    console.log("Error fetching audit_events:", allError);
    return;
  }

  console.log(`Total search_impression events in DB: ${allImpressions?.length || 0}\n`);

  if (!allImpressions || allImpressions.length === 0) {
    console.log("No impressions found in audit_events table");
    return;
  }

  // Get unique listing IDs from impressions
  const listingIds = [...new Set(allImpressions.map(i => i.listing_id))];
  console.log(`Unique listing IDs with impressions: ${listingIds.length}`);

  // Get listing names
  const { data: listings } = await supabase
    .from("listings")
    .select("id, name")
    .in("id", listingIds);

  const listingMap = new Map((listings || []).map(l => [l.id, l.name]));

  // Group by listing
  const byListing = new Map<string, number>();
  for (const imp of allImpressions) {
    const name = listingMap.get(imp.listing_id) || imp.listing_id;
    byListing.set(name, (byListing.get(name) || 0) + 1);
  }

  console.log("\n--- Impressions by Listing ---");
  for (const [name, count] of [...byListing.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${count}x  ${name}`);
  }

  // Show detailed breakdown for all impressions
  const impressions = allImpressions;

  console.log(`\n--- Detailed Breakdown (all listings) ---\n`);

  // Group by search query
  const byQuery = new Map<string, number>();
  const byDate = new Map<string, number>();
  const byUserAgent = new Map<string, number>();

  for (const imp of impressions || []) {
    const meta = imp.metadata as Record<string, unknown>;
    const query = (meta?.searchQuery as string) || "(no query)";
    const date = imp.created_at.split("T")[0];
    const userAgent = (meta?.userAgent as string) || "(unknown)";

    byQuery.set(query, (byQuery.get(query) || 0) + 1);
    byDate.set(date, (byDate.get(date) || 0) + 1);
    byUserAgent.set(userAgent, (byUserAgent.get(userAgent) || 0) + 1);
  }

  console.log("--- By Search Query ---");
  const sortedQueries = [...byQuery.entries()].sort((a, b) => b[1] - a[1]);
  for (const [query, count] of sortedQueries.slice(0, 20)) {
    console.log(`  ${count}x  "${query}"`);
  }

  console.log("\n--- By Date ---");
  const sortedDates = [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  for (const [date, count] of sortedDates.slice(0, 15)) {
    console.log(`  ${date}: ${count} impressions`);
  }

  console.log("\n--- By User Agent (top 10) ---");
  const sortedUA = [...byUserAgent.entries()].sort((a, b) => b[1] - a[1]);
  for (const [ua, count] of sortedUA.slice(0, 10)) {
    const shortUA = ua.length > 80 ? ua.substring(0, 80) + "..." : ua;
    console.log(`  ${count}x  ${shortUA}`);
  }
}

debugImpressions().catch(console.error);
