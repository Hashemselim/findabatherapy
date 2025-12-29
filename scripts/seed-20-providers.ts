/**
 * Test Provider Seeding Script
 *
 * Creates 20 sample providers for testing purposes.
 * Each provider is marked with is_seeded=true for easy removal later.
 *
 * Run with: npx tsx scripts/seed-20-providers.ts
 */

import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { createClient } from "@supabase/supabase-js";

// Supabase client (use service role key for admin operations)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
  process.exit(1);
}

console.log("Connecting to Supabase at:", supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Sample provider data
const PROVIDERS = [
  {
    name: "Bright Futures ABA Therapy",
    city: "Los Angeles",
    state: "California",
    planTier: "enterprise" as const,
  },
  {
    name: "Spectrum Care Behavioral Health",
    city: "New York",
    state: "New York",
    planTier: "pro" as const,
  },
  {
    name: "Stepping Stones ABA Center",
    city: "Houston",
    state: "Texas",
    planTier: "pro" as const,
  },
  {
    name: "Autism Pathways Learning Center",
    city: "Phoenix",
    state: "Arizona",
    planTier: "free" as const,
  },
  {
    name: "Hope & Progress ABA Services",
    city: "Chicago",
    state: "Illinois",
    planTier: "enterprise" as const,
  },
  {
    name: "Growing Minds Therapy Group",
    city: "Miami",
    state: "Florida",
    planTier: "pro" as const,
  },
  {
    name: "Thrive Behavioral Solutions",
    city: "Seattle",
    state: "Washington",
    planTier: "free" as const,
  },
  {
    name: "Connected Kids ABA",
    city: "Denver",
    state: "Colorado",
    planTier: "pro" as const,
  },
  {
    name: "Milestone Autism Center",
    city: "Atlanta",
    state: "Georgia",
    planTier: "free" as const,
  },
  {
    name: "Compass Behavior Services",
    city: "Boston",
    state: "Massachusetts",
    planTier: "enterprise" as const,
  },
  {
    name: "Lighthouse ABA Therapy",
    city: "San Diego",
    state: "California",
    planTier: "pro" as const,
  },
  {
    name: "Bridging Abilities ABA",
    city: "Dallas",
    state: "Texas",
    planTier: "free" as const,
  },
  {
    name: "Pinnacle Behavioral Health",
    city: "Philadelphia",
    state: "Pennsylvania",
    planTier: "pro" as const,
  },
  {
    name: "Harmony ABA Center",
    city: "San Francisco",
    state: "California",
    planTier: "enterprise" as const,
  },
  {
    name: "Aspire Therapy Group",
    city: "Portland",
    state: "Oregon",
    planTier: "free" as const,
  },
  {
    name: "Excel Behavioral Solutions",
    city: "Austin",
    state: "Texas",
    planTier: "pro" as const,
  },
  {
    name: "Foundations ABA Services",
    city: "Nashville",
    state: "Tennessee",
    planTier: "free" as const,
  },
  {
    name: "Keystone Learning Center",
    city: "Charlotte",
    state: "North Carolina",
    planTier: "pro" as const,
  },
  {
    name: "Sunrise ABA Therapy",
    city: "Las Vegas",
    state: "Nevada",
    planTier: "free" as const,
  },
  {
    name: "Summit Autism Services",
    city: "Minneapolis",
    state: "Minnesota",
    planTier: "enterprise" as const,
  },
];

// Service mode combinations
const SERVICE_MODE_COMBOS = [
  ["in_home"],
  ["in_center"],
  ["in_home", "in_center"],
  ["in_home", "telehealth"],
  ["in_center", "telehealth"],
  ["in_home", "in_center", "telehealth"],
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

// Insurances
const INSURANCES = [
  "Aetna",
  "Blue Cross Blue Shield",
  "Cigna",
  "United Healthcare",
  "Kaiser Permanente",
  "Humana",
  "Anthem",
  "Medicaid",
  "Tricare",
];

// Languages
const LANGUAGES = [
  "English",
  "Spanish",
  "Mandarin",
  "Vietnamese",
  "Korean",
  "Tagalog",
  "Arabic",
  "French",
  "Russian",
  "Portuguese",
];

// Diagnoses
const DIAGNOSES = [
  "Autism Spectrum Disorder (ASD)",
  "ADHD",
  "Developmental Delays",
  "Intellectual Disabilities",
  "Anxiety Disorders",
  "Behavioral Disorders",
  "Down Syndrome",
];

// Clinical Specialties
const SPECIALTIES = [
  "Early Intervention (0-3)",
  "School-Age Services",
  "Adolescent/Adult Services",
  "Parent Training",
  "School Consultation",
  "Feeding Therapy",
  "Toilet Training",
  "Social Skills Groups",
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateSlug(name: string): string {
  return name
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

function generatePhone(): string {
  const areaCode = Math.floor(Math.random() * 900) + 100;
  const exchange = Math.floor(Math.random() * 900) + 100;
  const subscriber = Math.floor(Math.random() * 9000) + 1000;
  return `(${areaCode}) ${exchange}-${subscriber}`;
}

function generateWebsite(agencyName: string): string {
  const domain = agencyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
  return `https://www.${domain}.com`;
}

async function seedProviders() {
  console.log("🌱 Starting test provider seeding (20 providers)...\n");

  let totalCreated = 0;
  let totalErrors = 0;

  for (let i = 0; i < PROVIDERS.length; i++) {
    const provider = PROVIDERS[i];

    try {
      const slug = generateSlug(provider.name);
      const email = generateEmail(provider.name);
      const phone = generatePhone();
      const website = generateWebsite(provider.name);
      const serviceModes = randomElement(SERVICE_MODE_COMBOS);
      const headline = randomElement(HEADLINES);
      const description = randomElement(DESCRIPTIONS);

      // Random insurances (3-6)
      const insuranceCount = Math.floor(Math.random() * 4) + 3;
      const insurances = randomElements(INSURANCES, insuranceCount);

      // Random languages (1-3, always includes English)
      const extraLanguages = randomElements(
        LANGUAGES.filter((l) => l !== "English"),
        Math.floor(Math.random() * 3)
      );
      const languages = ["English", ...extraLanguages];

      // Random diagnoses (2-4)
      const diagnoses = randomElements(DIAGNOSES, Math.floor(Math.random() * 3) + 2);

      // Random specialties (2-4)
      const specialties = randomElements(SPECIALTIES, Math.floor(Math.random() * 3) + 2);

      // Random ages served
      const minAge = Math.floor(Math.random() * 3); // 0-2
      const maxAge = Math.floor(Math.random() * 8) + 10; // 10-17

      // Create auth user first (required because profiles.id references auth.users)
      const { data: authUser, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password: "SeedPassword123!", // Dummy password for seed users
          email_confirm: true,
        });

      if (authError) {
        console.error(
          `  ❌ Auth error for ${provider.name}:`,
          authError.message
        );
        totalErrors++;
        continue;
      }

      const profileId = authUser.user.id;

      // Create profile
      const { error: profileError } = await supabase.from("profiles").insert({
        id: profileId,
        agency_name: provider.name,
        contact_email: email,
        contact_phone: phone,
        website: website,
        plan_tier: provider.planTier,
        is_seeded: true,
        onboarding_completed_at: new Date().toISOString(),
      });

      if (profileError) {
        console.error(
          `  ❌ Profile error for ${provider.name}:`,
          profileError.message
        );
        // Clean up auth user if profile creation fails
        await supabase.auth.admin.deleteUser(profileId);
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
          plan_tier: provider.planTier,
          status: "published",
          is_accepting_clients: Math.random() > 0.2, // 80% accepting
          published_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (listingError) {
        console.error(
          `  ❌ Listing error for ${provider.name}:`,
          listingError.message
        );
        totalErrors++;
        continue;
      }

      // Create location
      const { error: locationError } = await supabase.from("locations").insert({
        listing_id: listing.id,
        city: provider.city,
        state: provider.state,
        is_primary: true,
        service_radius_miles: Math.floor(Math.random() * 20) + 10, // 10-30 miles
      });

      if (locationError) {
        console.error(
          `  ❌ Location error for ${provider.name}:`,
          locationError.message
        );
      }

      // Create attributes (insurances, ages, languages, diagnoses, specialties)
      const attributes = [
        {
          listing_id: listing.id,
          attribute_key: "insurances",
          value_json: insurances,
        },
        {
          listing_id: listing.id,
          attribute_key: "ages_served",
          value_json: { min: minAge, max: maxAge },
        },
        {
          listing_id: listing.id,
          attribute_key: "languages",
          value_json: languages,
        },
        {
          listing_id: listing.id,
          attribute_key: "diagnoses",
          value_json: diagnoses,
        },
        {
          listing_id: listing.id,
          attribute_key: "clinical_specialties",
          value_json: specialties,
        },
      ];

      const { error: attrError } = await supabase
        .from("listing_attribute_values")
        .insert(attributes);

      if (attrError) {
        console.error(
          `  ❌ Attributes error for ${provider.name}:`,
          attrError.message
        );
      }

      console.log(
        `  ✅ ${i + 1}. ${provider.name} (${provider.planTier}) - ${provider.city}, ${provider.state}`
      );
      totalCreated++;
    } catch (err) {
      console.error(`  ❌ Unexpected error:`, err);
      totalErrors++;
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
