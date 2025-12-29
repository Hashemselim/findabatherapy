/**
 * Provider Seeding Script
 *
 * Creates ~500 seed providers (10 per state) for SEO purposes.
 * Each provider is marked with is_seeded=true for easy removal later.
 *
 * Run with: npx tsx scripts/seed-providers.ts
 */

import { createClient } from "@supabase/supabase-js";
import { CITIES_BY_STATE, STATE_NAMES } from "../src/lib/data/cities";
import { INSURANCES } from "../src/lib/data/insurances";

// Supabase client (use service role key for admin operations)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ABA agency name patterns
const AGENCY_PREFIXES = [
  "Bright Futures",
  "Stepping Stones",
  "Autism Pathways",
  "Behavioral Horizons",
  "ABA Learning",
  "Spectrum Care",
  "Hope & Progress",
  "Growing Minds",
  "Thrive Behavioral",
  "Connected Kids",
  "Milestone",
  "Compass",
  "Lighthouse",
  "Bridging Abilities",
  "Pinnacle",
  "Harmony",
  "Aspire",
  "Excel",
  "Foundations",
  "Keystone",
];

const AGENCY_SUFFIXES = [
  "ABA Services",
  "ABA Therapy",
  "Behavioral Health",
  "Behavior Services",
  "ABA Center",
  "Autism Center",
  "Therapy Group",
  "Behavioral Solutions",
  "ABA",
  "Learning Center",
];

// Service mode combinations
const SERVICE_MODE_COMBOS = [
  ["in_home"],
  ["in_center"],
  ["in_home", "in_center"],
  ["in_home", "telehealth"],
  ["in_center", "telehealth"],
  ["in_home", "in_center", "telehealth"],
  ["in_home", "in_center", "school_based"],
  ["in_home", "in_center", "telehealth", "school_based"],
];

// Headlines
const HEADLINES = [
  "Personalized ABA therapy for children with autism",
  "Evidence-based autism treatment services",
  "Compassionate care for your child's development",
  "Helping children reach their full potential",
  "Family-centered ABA therapy programs",
  "Building skills for lifelong success",
  "Expert ABA services with proven results",
  "Individualized treatment plans that work",
  "Quality ABA therapy in your community",
  "Dedicated to your child's progress",
];

// Descriptions
const DESCRIPTIONS = [
  "Our team of Board Certified Behavior Analysts (BCBAs) provides individualized ABA therapy programs designed to help children with autism develop essential life skills. We work closely with families to create supportive environments for learning and growth.",
  "We specialize in evidence-based Applied Behavior Analysis therapy for children diagnosed with autism spectrum disorder. Our comprehensive programs focus on communication, social skills, and daily living skills.",
  "With years of experience in autism treatment, we offer personalized ABA therapy services tailored to each child's unique needs. Our dedicated team is committed to helping families navigate the autism journey.",
  "Our ABA therapy programs combine proven techniques with compassionate care to help children make meaningful progress. We believe every child deserves the opportunity to succeed.",
  "As a leading ABA therapy provider, we deliver high-quality behavioral health services to families throughout our community. Our experienced clinicians create positive outcomes for children with autism.",
];

// Plan tiers distribution (weighted)
const PLAN_TIERS: Array<"free" | "pro" | "enterprise"> = [
  "free", "free", "free", "free", "free", // 50% free
  "pro", "pro", "pro", // 30% pro
  "enterprise", "enterprise", // 20% enterprise
];

// Helper functions
function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateSlug(name: string, city: string): string {
  return `${name}-${city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateEmail(agencyName: string): string {
  const domain = agencyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
  return `contact@${domain}.example.com`;
}

async function seedProviders() {
  console.log("🌱 Starting provider seeding...\n");

  let totalCreated = 0;
  let totalErrors = 0;

  // Process each state
  for (const [stateAbbrev, cities] of Object.entries(CITIES_BY_STATE)) {
    const stateName = STATE_NAMES[stateAbbrev];
    console.log(`\n📍 Seeding ${stateName}...`);

    // Take first 10 cities for this state
    const targetCities = cities.slice(0, 10);

    for (const city of targetCities) {
      try {
        // Generate provider data
        const prefix = randomElement(AGENCY_PREFIXES);
        const suffix = randomElement(AGENCY_SUFFIXES);
        const agencyName = `${prefix} ${suffix} - ${city.name}`;
        const slug = generateSlug(`${prefix}-${suffix}`, city.name);
        const email = generateEmail(agencyName);
        const planTier = randomElement(PLAN_TIERS);
        const serviceModes = randomElement(SERVICE_MODE_COMBOS);
        const headline = randomElement(HEADLINES);
        const description = randomElement(DESCRIPTIONS);

        // Random insurances (3-6)
        const insuranceCount = Math.floor(Math.random() * 4) + 3;
        const insurances = randomElements(
          INSURANCES.map((i) => i.name),
          insuranceCount
        );

        // Random ages served
        const minAge = Math.floor(Math.random() * 3); // 0-2
        const maxAge = Math.floor(Math.random() * 8) + 10; // 10-17

        // Create profile first (simulating a user)
        const profileId = crypto.randomUUID();

        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: profileId,
            agency_name: agencyName,
            contact_email: email,
            plan_tier: planTier,
            is_seeded: true, // Flag for easy deletion later
          });

        if (profileError) {
          console.error(`  ❌ Profile error for ${agencyName}:`, profileError.message);
          totalErrors++;
          continue;
        }

        // Create listing
        const { data: listing, error: listingError } = await supabase
          .from("listings")
          .insert({
            profile_id: profileId,
            slug,
            headline,
            description,
            service_modes: serviceModes,
            status: "published",
            is_accepting_clients: Math.random() > 0.2, // 80% accepting
            published_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (listingError) {
          console.error(`  ❌ Listing error for ${agencyName}:`, listingError.message);
          totalErrors++;
          continue;
        }

        // Create location
        const { error: locationError } = await supabase
          .from("locations")
          .insert({
            listing_id: listing.id,
            city: city.name,
            state: stateName,
            is_primary: true,
            service_radius_miles: Math.floor(Math.random() * 20) + 10, // 10-30 miles
          });

        if (locationError) {
          console.error(`  ❌ Location error for ${agencyName}:`, locationError.message);
        }

        // Create attributes (insurances, ages)
        const attributes = [
          {
            listing_id: listing.id,
            attribute_key: "insurances",
            attribute_value: insurances,
          },
          {
            listing_id: listing.id,
            attribute_key: "ages_served",
            attribute_value: { min: minAge, max: maxAge },
          },
          {
            listing_id: listing.id,
            attribute_key: "languages",
            attribute_value: ["English"],
          },
        ];

        const { error: attrError } = await supabase
          .from("listing_attributes")
          .insert(attributes);

        if (attrError) {
          console.error(`  ❌ Attributes error for ${agencyName}:`, attrError.message);
        }

        console.log(`  ✅ ${agencyName} (${planTier})`);
        totalCreated++;
      } catch (err) {
        console.error(`  ❌ Unexpected error:`, err);
        totalErrors++;
      }
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`🎉 Seeding complete!`);
  console.log(`   ✅ Created: ${totalCreated} providers`);
  console.log(`   ❌ Errors: ${totalErrors}`);
  console.log("=".repeat(50));
}

// Run seeding
seedProviders()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
