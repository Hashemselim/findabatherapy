import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

import type {
  SeedDirectoryCustomDomain,
  SeedDirectoryExportPayload,
  SeedDirectoryGooglePlacesListing,
  SeedDirectoryGoogleReview,
  SeedDirectoryListing,
  SeedDirectoryListingAttribute,
  SeedDirectoryLocation,
  SeedDirectoryMediaAsset,
  SeedDirectoryProfile,
} from "./seed-directory-types";

config({ path: ".env.local", override: true });

const DEFAULT_OUTPUT_PATH = path.resolve(
  process.cwd(),
  "tmp/seeded-directory-export.json",
);
const BATCH_SIZE = 250;
const STORAGE_BUCKET_BY_MEDIA_TYPE = {
  logo: "listing-logos",
  photo: "listing-photos",
  video: "listing-photos",
} as const;

type QueryResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

type SeedSupabaseClient = {
  from(tableName: string): {
    select(selectClause: string): {
      eq(
        columnName: string,
        value: unknown,
      ): {
        order(
          columnName: string,
          options: { ascending: boolean },
        ): Promise<QueryResult<unknown>>;
      };
      in(columnName: string, values: string[]): Promise<QueryResult<unknown>>;
      order(
        columnName: string,
        options: { ascending: boolean },
      ): Promise<QueryResult<unknown>>;
    };
  };
  storage: {
    from(bucketName: string): {
      getPublicUrl(path: string): {
        data: { publicUrl: string };
      };
    };
  };
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getOutputPath() {
  const outputIndex = process.argv.indexOf("--output");
  if (outputIndex >= 0 && process.argv[outputIndex + 1]) {
    return path.resolve(process.cwd(), process.argv[outputIndex + 1]);
  }
  return DEFAULT_OUTPUT_PATH;
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function basenameFromStorageKey(storageKey: string) {
  const parts = storageKey.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? storageKey;
}

function guessMimeType(storageKey: string, mediaType: "logo" | "photo" | "video") {
  const extension = storageKey.split(".").pop()?.toLowerCase();
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  if (extension === "svg") return "image/svg+xml";
  if (extension === "mp4") return "video/mp4";
  if (extension === "mov") return "video/quicktime";
  return mediaType === "video" ? "video/mp4" : "image/jpeg";
}

async function selectByIds<T>(
  supabase: SeedSupabaseClient,
  tableName: string,
  columnName: string,
  ids: string[],
  selectClause = "*",
) {
  if (ids.length === 0) {
    return [] as T[];
  }

  const rows: T[] = [];
  for (let index = 0; index < ids.length; index += BATCH_SIZE) {
    const batch = ids.slice(index, index + BATCH_SIZE);
    const { data, error } = await supabase
      .from(tableName)
      .select(selectClause)
      .in(columnName, batch);

    if (error) {
      throw new Error(`Failed to export ${tableName}: ${error.message}`);
    }

    rows.push(...((data ?? []) as T[]));
  }

  return rows;
}

async function exportSeededDirectoryData() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const outputPath = getOutputPath();

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }) as unknown as SeedSupabaseClient;

  type ProfileRow = {
    id: string;
    agency_name: string;
    contact_email: string;
    contact_phone: string | null;
    website: string | null;
    plan_tier: string | null;
    subscription_status: string | null;
    onboarding_completed_at: string | null;
    intake_form_settings: unknown;
    created_at: string | null;
    updated_at: string | null;
  };

  const { data: profileRows, error: profileError } = (await supabase
    .from("profiles")
    .select(
      [
        "id",
        "agency_name",
        "contact_email",
        "contact_phone",
        "website",
        "plan_tier",
        "subscription_status",
        "onboarding_completed_at",
        "intake_form_settings",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .eq("is_seeded", true)
    .order("created_at", { ascending: true })) as QueryResult<ProfileRow>;

  if (profileError) {
    throw new Error(`Failed to export profiles: ${profileError.message}`);
  }

  const profiles: SeedDirectoryProfile[] = (profileRows ?? []).map((row) => ({
    id: row.id,
    agencyName: row.agency_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone ?? null,
    website: row.website ?? null,
    planTier: row.plan_tier ?? null,
    subscriptionStatus: row.subscription_status ?? null,
    onboardingCompletedAt: row.onboarding_completed_at ?? null,
    intakeFormSettings: row.intake_form_settings ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  }));

  const profileIds = profiles.map((profile) => profile.id);
  const listingRows = await selectByIds<{
    id: string;
    profile_id: string;
    slug: string;
    headline: string | null;
    description: string | null;
    summary: string | null;
    service_modes: string[] | null;
    status: string | null;
    is_accepting_clients: boolean | null;
    video_url: string | null;
    logo_url: string | null;
    careers_brand_color: string | null;
    careers_headline: string | null;
    careers_cta_text: string | null;
    careers_hide_badge: boolean | null;
    client_intake_enabled: boolean | null;
    website_published: boolean | null;
    website_settings: unknown;
    published_at: string | null;
    created_at: string | null;
    updated_at: string | null;
  }>(
    supabase,
    "listings",
    "profile_id",
    profileIds,
    [
      "id",
      "profile_id",
      "slug",
      "headline",
      "description",
      "summary",
      "service_modes",
      "status",
      "is_accepting_clients",
      "video_url",
      "logo_url",
      "careers_brand_color",
      "careers_headline",
      "careers_cta_text",
      "careers_hide_badge",
      "client_intake_enabled",
      "website_published",
      "website_settings",
      "published_at",
      "created_at",
      "updated_at",
    ].join(", "),
  );

  const listings: SeedDirectoryListing[] = listingRows.map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    slug: row.slug,
    headline: row.headline ?? null,
    description: row.description ?? null,
    summary: row.summary ?? null,
    serviceModes: Array.isArray(row.service_modes) ? row.service_modes : [],
    status: row.status ?? null,
    isAcceptingClients: row.is_accepting_clients ?? null,
    videoUrl: row.video_url ?? null,
    logoUrl: row.logo_url ?? null,
    careersBrandColor: row.careers_brand_color ?? null,
    careersHeadline: row.careers_headline ?? null,
    careersCtaText: row.careers_cta_text ?? null,
    careersHideBadge: row.careers_hide_badge ?? null,
    clientIntakeEnabled: row.client_intake_enabled ?? null,
    websitePublished: row.website_published ?? null,
    websiteSettings: row.website_settings ?? null,
    publishedAt: row.published_at ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  }));

  const listingIds = listings.map((listing) => listing.id);
  const locationRows = await selectByIds<{
    id: string;
    listing_id: string;
    label: string | null;
    street: string | null;
    city: string;
    state: string;
    postal_code: string | null;
    latitude: number | string | null;
    longitude: number | string | null;
    is_primary: boolean | null;
    is_featured: boolean | null;
    service_radius_miles: number | null;
    service_mode: string | null;
    service_types: string[] | null;
    insurances: string[] | null;
    google_place_id: string | null;
    google_rating: number | string | null;
    google_rating_count: number | null;
    show_google_reviews: boolean | null;
    contact_phone: string | null;
    contact_email: string | null;
    contact_website: string | null;
    use_company_contact: boolean | null;
    created_at: string | null;
  }>(
    supabase,
    "locations",
    "listing_id",
    listingIds,
    [
      "id",
      "listing_id",
      "label",
      "street",
      "city",
      "state",
      "postal_code",
      "latitude",
      "longitude",
      "is_primary",
      "is_featured",
      "service_radius_miles",
      "service_mode",
      "service_types",
      "insurances",
      "google_place_id",
      "google_rating",
      "google_rating_count",
      "show_google_reviews",
      "contact_phone",
      "contact_email",
      "contact_website",
      "use_company_contact",
      "created_at",
    ].join(", "),
  );

  const locations: SeedDirectoryLocation[] = locationRows.map((row) => ({
    id: row.id,
    listingId: row.listing_id,
    label: row.label ?? null,
    street: row.street ?? null,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code ?? null,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    isPrimary: row.is_primary ?? null,
    isFeatured: row.is_featured ?? null,
    serviceRadiusMiles: row.service_radius_miles ?? null,
    serviceMode: row.service_mode ?? null,
    serviceTypes: Array.isArray(row.service_types) ? row.service_types : [],
    insurances: Array.isArray(row.insurances) ? row.insurances : [],
    googlePlaceId: row.google_place_id ?? null,
    googleRating: toNumber(row.google_rating),
    googleRatingCount: row.google_rating_count ?? null,
    showGoogleReviews: row.show_google_reviews ?? null,
    contactPhone: row.contact_phone ?? null,
    contactEmail: row.contact_email ?? null,
    contactWebsite: row.contact_website ?? null,
    useCompanyContact: row.use_company_contact ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.created_at ?? null,
  }));

  const attributeRows = await selectByIds<{
    id: string;
    listing_id: string;
    attribute_key: string;
    value_text: string | null;
    value_json: unknown;
    value_number: number | string | null;
    value_boolean: boolean | null;
    created_at: string | null;
    updated_at: string | null;
  }>(
    supabase,
    "listing_attribute_values",
    "listing_id",
    listingIds,
    [
      "id",
      "listing_id",
      "attribute_key",
      "value_text",
      "value_json",
      "value_number",
      "value_boolean",
      "created_at",
      "updated_at",
    ].join(", "),
  );

  const listingAttributes: SeedDirectoryListingAttribute[] = attributeRows.map((row) => ({
    id: row.id,
    listingId: row.listing_id,
    attributeKey: row.attribute_key,
    value:
      row.value_json ??
      row.value_text ??
      toNumber(row.value_number) ??
      row.value_boolean ??
      null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  }));

  const mediaRows = await selectByIds<{
    id: string;
    listing_id: string;
    storage_path: string;
    media_type: "logo" | "photo" | "video";
    title: string | null;
    sort_order: number | null;
    created_at: string | null;
  }>(
    supabase,
    "media_assets",
    "listing_id",
    listingIds,
    "id, listing_id, storage_path, media_type, title, sort_order, created_at",
  );

  const mediaAssets: SeedDirectoryMediaAsset[] = mediaRows.map((row) => {
    const bucket = STORAGE_BUCKET_BY_MEDIA_TYPE[row.media_type];
    const { data } = supabase.storage.from(bucket).getPublicUrl(row.storage_path);

    return {
      id: row.id,
      listingId: row.listing_id,
      mediaType: row.media_type,
      bucket,
      storageKey: row.storage_path,
      filename: basenameFromStorageKey(row.storage_path),
      mimeType: guessMimeType(row.storage_path, row.media_type),
      byteSize: 0,
      sortOrder: row.sort_order ?? 0,
      title: row.title ?? null,
      publicUrl: data.publicUrl ?? null,
      createdAt: row.created_at ?? null,
    };
  });

  const locationIds = locations.map((location) => location.id);
  const reviewRows = await selectByIds<{
    id: string;
    location_id: string;
    google_review_id: string;
    author_name: string;
    author_photo_url: string | null;
    rating: number;
    text: string | null;
    relative_time_description: string | null;
    published_at: string | null;
    is_selected: boolean | null;
    fetched_at: string | null;
    created_at: string | null;
    updated_at: string | null;
  }>(
    supabase,
    "google_reviews",
    "location_id",
    locationIds,
    [
      "id",
      "location_id",
      "google_review_id",
      "author_name",
      "author_photo_url",
      "rating",
      "text",
      "relative_time_description",
      "published_at",
      "is_selected",
      "fetched_at",
      "created_at",
      "updated_at",
    ].join(", "),
  );

  const googleReviews: SeedDirectoryGoogleReview[] = reviewRows.map((row) => ({
    id: row.id,
    locationId: row.location_id,
    reviewId: row.google_review_id,
    authorName: row.author_name,
    authorPhotoUrl: row.author_photo_url ?? null,
    rating: row.rating,
    text: row.text ?? null,
    relativeTimeDescription: row.relative_time_description ?? null,
    publishedAt: row.published_at ?? null,
    isSelected: row.is_selected ?? false,
    fetchedAt: row.fetched_at ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  }));

  type GooglePlacesRow = {
    id: string;
    google_place_id: string;
    name: string;
    slug: string;
    street: string | null;
    city: string;
    state: string;
    postal_code: string | null;
    latitude: number | string | null;
    longitude: number | string | null;
    formatted_address: string | null;
    phone: string | null;
    website: string | null;
    google_rating: number | string | null;
    google_rating_count: number | null;
    status: string | null;
    claimed_listing_id: string | null;
    claimed_at: string | null;
    created_at: string | null;
    updated_at: string | null;
  };

  const { data: googlePlacesRows, error: googlePlacesError } = (await supabase
    .from("google_places_listings")
    .select(
      [
        "id",
        "google_place_id",
        "name",
        "slug",
        "street",
        "city",
        "state",
        "postal_code",
        "latitude",
        "longitude",
        "formatted_address",
        "phone",
        "website",
        "google_rating",
        "google_rating_count",
        "status",
        "claimed_listing_id",
        "claimed_at",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .order("created_at", { ascending: true })) as QueryResult<GooglePlacesRow>;

  if (googlePlacesError) {
    throw new Error(
      `Failed to export google_places_listings: ${googlePlacesError.message}`,
    );
  }

  const googlePlacesListings: SeedDirectoryGooglePlacesListing[] = (
    googlePlacesRows ?? []
  ).map((row) => ({
    id: row.id,
    googlePlaceId: row.google_place_id,
    name: row.name,
    slug: row.slug,
    street: row.street ?? null,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code ?? null,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    formattedAddress: row.formatted_address ?? null,
    phone: row.phone ?? null,
    website: row.website ?? null,
    googleRating: toNumber(row.google_rating),
    googleRatingCount: row.google_rating_count ?? null,
    status: row.status ?? null,
    claimedListingId: row.claimed_listing_id ?? null,
    claimedAt: row.claimed_at ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  }));

  const customDomainRows = await selectByIds<{
    id: string;
    profile_id: string;
    listing_id: string;
    domain: string;
    status: string | null;
    verification_token: string | null;
    verified_at: string | null;
    vercel_domain_id: string | null;
    error_message: string | null;
    created_at: string | null;
    updated_at: string | null;
  }>(
    supabase,
    "custom_domains",
    "listing_id",
    listingIds,
    [
      "id",
      "profile_id",
      "listing_id",
      "domain",
      "status",
      "verification_token",
      "verified_at",
      "vercel_domain_id",
      "error_message",
      "created_at",
      "updated_at",
    ].join(", "),
  );

  const customDomains: SeedDirectoryCustomDomain[] = customDomainRows.map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    listingId: row.listing_id,
    domain: row.domain,
    status: row.status ?? null,
    verificationToken: row.verification_token ?? null,
    verifiedAt: row.verified_at ?? null,
    vercelDomainId: row.vercel_domain_id ?? null,
    errorMessage: row.error_message ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  }));

  const payload: SeedDirectoryExportPayload = {
    exportedAt: new Date().toISOString(),
    source: {
      supabaseUrl,
      seededProfileCount: profiles.length,
    },
    profiles,
    listings,
    locations,
    listingAttributes,
    mediaAssets,
    googleReviews,
    googlePlacesListings,
    customDomains,
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  console.log(
    [
      `Exported seeded directory data to ${outputPath}`,
      `profiles=${payload.profiles.length}`,
      `listings=${payload.listings.length}`,
      `locations=${payload.locations.length}`,
      `listingAttributes=${payload.listingAttributes.length}`,
      `mediaAssets=${payload.mediaAssets.length}`,
      `googleReviews=${payload.googleReviews.length}`,
      `googlePlacesListings=${payload.googlePlacesListings.length}`,
      `customDomains=${payload.customDomains.length}`,
    ].join(" "),
  );
}

exportSeededDirectoryData().catch((error) => {
  console.error(error);
  process.exit(1);
});
