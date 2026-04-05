import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import { asId, asRecord, now, readBoolean, readNumber, readString } from "./_helpers";

const APP_TABLES = [
  "auditEvents",
  "agreementArtifacts",
  "agreementPackets",
  "billingRecords",
  "communicationRecords",
  "crmRecords",
  "customDomains",
  "files",
  "googlePlacesRecords",
  "googleReviewRecords",
  "inquiryRecords",
  "intakeTokens",
  "jobApplications",
  "jobPostings",
  "listingAttributes",
  "listings",
  "locations",
  "migrationImports",
  "notificationRecords",
  "publicReadModels",
  "referralRecords",
  "removalRequests",
  "users",
  "workspaceInvitations",
  "workspaceMemberships",
  "workspaces",
] as const;

type ConvexCtx = MutationCtx;

const seedScalarValueValidator = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.null(),
  v.array(v.string()),
);

const seedIntakeFieldConfigValidator = v.object({
  enabled: v.boolean(),
  required: v.boolean(),
});

const seedProfileIntakeSettingsValidator = v.object({
  background_color: v.optional(v.string()),
  show_powered_by: v.optional(v.boolean()),
  instructions: v.optional(v.string()),
  enabled: v.optional(v.boolean()),
  fields: v.optional(
    v.record(v.string(), seedIntakeFieldConfigValidator),
  ),
});

const seedWebsiteSettingsValidator = v.object({
  theme: v.optional(v.string()),
  primary_color: v.optional(v.string()),
  hero_heading: v.optional(v.string()),
  hero_subheading: v.optional(v.string()),
  about_heading: v.optional(v.string()),
  about_body: v.optional(v.string()),
  show_contact_form: v.optional(v.boolean()),
  show_locations: v.optional(v.boolean()),
  show_resources: v.optional(v.boolean()),
  show_jobs: v.optional(v.boolean()),
  show_powered_by: v.optional(v.boolean()),
});

const seedProfileValidator = v.object({
  id: v.string(),
  agencyName: v.string(),
  contactEmail: v.string(),
  contactPhone: v.optional(v.union(v.string(), v.null())),
  website: v.optional(v.union(v.string(), v.null())),
  planTier: v.optional(v.union(v.string(), v.null())),
  subscriptionStatus: v.optional(v.union(v.string(), v.null())),
  onboardingCompletedAt: v.optional(v.union(v.string(), v.null())),
  intakeFormSettings: v.optional(seedProfileIntakeSettingsValidator),
  createdAt: v.optional(v.union(v.string(), v.null())),
  updatedAt: v.optional(v.union(v.string(), v.null())),
});

const seedListingValidator = v.object({
  id: v.string(),
  profileId: v.string(),
  slug: v.string(),
  headline: v.optional(v.union(v.string(), v.null())),
  description: v.optional(v.union(v.string(), v.null())),
  summary: v.optional(v.union(v.string(), v.null())),
  serviceModes: v.optional(v.array(v.string())),
  status: v.optional(v.union(v.string(), v.null())),
  isAcceptingClients: v.optional(v.union(v.boolean(), v.null())),
  videoUrl: v.optional(v.union(v.string(), v.null())),
  logoUrl: v.optional(v.union(v.string(), v.null())),
  careersBrandColor: v.optional(v.union(v.string(), v.null())),
  careersHeadline: v.optional(v.union(v.string(), v.null())),
  careersCtaText: v.optional(v.union(v.string(), v.null())),
  careersHideBadge: v.optional(v.union(v.boolean(), v.null())),
  clientIntakeEnabled: v.optional(v.union(v.boolean(), v.null())),
  websitePublished: v.optional(v.union(v.boolean(), v.null())),
  websiteSettings: v.optional(seedWebsiteSettingsValidator),
  publishedAt: v.optional(v.union(v.string(), v.null())),
  createdAt: v.optional(v.union(v.string(), v.null())),
  updatedAt: v.optional(v.union(v.string(), v.null())),
});

const seedLocationValidator = v.object({
  id: v.string(),
  listingId: v.string(),
  label: v.optional(v.union(v.string(), v.null())),
  street: v.optional(v.union(v.string(), v.null())),
  city: v.string(),
  state: v.string(),
  postalCode: v.optional(v.union(v.string(), v.null())),
  latitude: v.optional(v.union(v.number(), v.null())),
  longitude: v.optional(v.union(v.number(), v.null())),
  isPrimary: v.optional(v.union(v.boolean(), v.null())),
  isFeatured: v.optional(v.union(v.boolean(), v.null())),
  serviceRadiusMiles: v.optional(v.union(v.number(), v.null())),
  serviceMode: v.optional(v.union(v.string(), v.null())),
  serviceTypes: v.optional(v.array(v.string())),
  insurances: v.optional(v.array(v.string())),
  googlePlaceId: v.optional(v.union(v.string(), v.null())),
  googleRating: v.optional(v.union(v.number(), v.null())),
  googleRatingCount: v.optional(v.union(v.number(), v.null())),
  showGoogleReviews: v.optional(v.union(v.boolean(), v.null())),
  contactPhone: v.optional(v.union(v.string(), v.null())),
  contactEmail: v.optional(v.union(v.string(), v.null())),
  contactWebsite: v.optional(v.union(v.string(), v.null())),
  useCompanyContact: v.optional(v.union(v.boolean(), v.null())),
  createdAt: v.optional(v.union(v.string(), v.null())),
  updatedAt: v.optional(v.union(v.string(), v.null())),
});

const seedListingAttributeValidator = v.object({
  id: v.string(),
  listingId: v.string(),
  attributeKey: v.string(),
  value: seedScalarValueValidator,
  createdAt: v.optional(v.union(v.string(), v.null())),
  updatedAt: v.optional(v.union(v.string(), v.null())),
});

const seedMediaAssetValidator = v.object({
  id: v.string(),
  listingId: v.string(),
  mediaType: v.union(v.literal("logo"), v.literal("photo"), v.literal("video")),
  bucket: v.string(),
  storageKey: v.string(),
  filename: v.string(),
  mimeType: v.string(),
  byteSize: v.number(),
  sortOrder: v.optional(v.number()),
  title: v.optional(v.union(v.string(), v.null())),
  publicUrl: v.optional(v.union(v.string(), v.null())),
  storageId: v.optional(v.union(v.string(), v.null())),
  createdAt: v.optional(v.union(v.string(), v.null())),
});

const seedGoogleReviewValidator = v.object({
  id: v.string(),
  locationId: v.string(),
  reviewId: v.string(),
  authorName: v.string(),
  authorPhotoUrl: v.optional(v.union(v.string(), v.null())),
  rating: v.number(),
  text: v.optional(v.union(v.string(), v.null())),
  relativeTimeDescription: v.optional(v.union(v.string(), v.null())),
  publishedAt: v.optional(v.union(v.string(), v.null())),
  isSelected: v.optional(v.boolean()),
  fetchedAt: v.optional(v.union(v.string(), v.null())),
  createdAt: v.optional(v.union(v.string(), v.null())),
  updatedAt: v.optional(v.union(v.string(), v.null())),
});

const seedGooglePlacesListingValidator = v.object({
  id: v.string(),
  googlePlaceId: v.string(),
  name: v.string(),
  slug: v.string(),
  street: v.optional(v.union(v.string(), v.null())),
  city: v.string(),
  state: v.string(),
  postalCode: v.optional(v.union(v.string(), v.null())),
  latitude: v.optional(v.union(v.number(), v.null())),
  longitude: v.optional(v.union(v.number(), v.null())),
  formattedAddress: v.optional(v.union(v.string(), v.null())),
  phone: v.optional(v.union(v.string(), v.null())),
  website: v.optional(v.union(v.string(), v.null())),
  googleRating: v.optional(v.union(v.number(), v.null())),
  googleRatingCount: v.optional(v.union(v.number(), v.null())),
  status: v.optional(v.union(v.string(), v.null())),
  claimedListingId: v.optional(v.union(v.string(), v.null())),
  claimedAt: v.optional(v.union(v.string(), v.null())),
  createdAt: v.optional(v.union(v.string(), v.null())),
  updatedAt: v.optional(v.union(v.string(), v.null())),
});

const seedCustomDomainValidator = v.object({
  id: v.string(),
  profileId: v.string(),
  listingId: v.string(),
  domain: v.string(),
  status: v.optional(v.union(v.string(), v.null())),
  verificationToken: v.optional(v.union(v.string(), v.null())),
  verifiedAt: v.optional(v.union(v.string(), v.null())),
  vercelDomainId: v.optional(v.union(v.string(), v.null())),
  errorMessage: v.optional(v.union(v.string(), v.null())),
  createdAt: v.optional(v.union(v.string(), v.null())),
  updatedAt: v.optional(v.union(v.string(), v.null())),
});

function requireSeedSecret(secret: string) {
  const expectedSecret = process.env.CONVEX_SEED_IMPORT_SECRET;
  if (!expectedSecret) {
    throw new ConvexError("CONVEX_SEED_IMPORT_SECRET is not configured on this Convex deployment");
  }

  if (secret !== expectedSecret) {
    throw new ConvexError("Invalid seed import secret");
  }
}

function normalizePlanTier(value: unknown) {
  return value === "free" ? "free" : "pro";
}

function inferSubscriptionStatus(planTier: string, rawStatus: unknown) {
  const status = readString(rawStatus);
  if (status) {
    return status;
  }

  return planTier === "pro" ? "active" : "inactive";
}

function normalizeServiceTypes(
  serviceTypes: string[] | undefined,
  serviceMode: string | null | undefined,
) {
  if (serviceTypes && serviceTypes.length > 0) {
    return serviceTypes;
  }

  if (serviceMode === "in_home") {
    return ["in_home"];
  }

  if (serviceMode === "center_based") {
    return ["in_center"];
  }

  return ["in_home", "in_center"];
}

function buildSearchText(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function shouldInsertE2ESeedFixtures() {
  return process.env.CONVEX_INCLUDE_E2E_SEED_FIXTURES === "true";
}

function normalizeSeedEmail(value: string) {
  return value.trim().toLowerCase();
}

function generateSeedSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

async function clearTable<TableName extends (typeof APP_TABLES)[number]>(
  ctx: ConvexCtx,
  tableName: TableName,
) {
  const rows = await ctx.db.query(tableName).collect();
  for (const row of rows) {
    await ctx.db.delete(row._id);
  }
  return rows.length;
}

async function clearImportedFiles(
  ctx: ConvexCtx,
) {
  const files = await ctx.db.query("files").collect();
  let deletedCount = 0;
  for (const file of files) {
    if (file.storageId) {
      await ctx.storage.delete(asId<"_storage">(file.storageId));
    }
    await ctx.db.delete(asId<"files">(file._id));
    deletedCount += 1;
  }
  return deletedCount;
}

async function clearWorkspaceRowsByWorkspaceId(
  ctx: MutationCtx,
  workspaceId: string,
) {
  for (const tableName of APP_TABLES) {
    if (tableName === "users" || tableName === "workspaceMemberships" || tableName === "workspaces") {
      continue;
    }

    const rows = await ctx.db.query(tableName).collect();
    for (const row of rows) {
      if (String((row as { workspaceId?: unknown }).workspaceId ?? "") !== workspaceId) {
        continue;
      }

      if (tableName === "files") {
        const fileRow = row as Doc<"files">;
        if (fileRow.storageId) {
          await ctx.storage.delete(fileRow.storageId);
        }
      }

      await ctx.db.delete(row._id);
    }
  }
}

function resolveAttributeValue(row: { value: unknown }) {
  return row.value;
}

function buildListingMetadata(
  listing: {
    headline?: string | null;
    description?: string | null;
    summary?: string | null;
    serviceModes?: string[];
    isAcceptingClients?: boolean | null;
    videoUrl?: string | null;
    logoUrl?: string | null;
    careersBrandColor?: string | null;
    careersHeadline?: string | null;
    careersCtaText?: string | null;
    careersHideBadge?: boolean | null;
    clientIntakeEnabled?: boolean | null;
    websitePublished?: boolean | null;
    websiteSettings?: unknown;
    publishedAt?: string | null;
  },
  status: string,
) {
  const websiteSettings = asRecord(listing.websiteSettings);
  return {
    headline: listing.headline ?? null,
    description: listing.description ?? null,
    summary: listing.summary ?? null,
    serviceModes: listing.serviceModes ?? [],
    isAcceptingClients: listing.isAcceptingClients ?? true,
    videoUrl: listing.videoUrl ?? null,
    logoUrl: listing.logoUrl ?? null,
    careersBrandColor: listing.careersBrandColor ?? "#10B981",
    careersHeadline: listing.careersHeadline ?? null,
    careersCtaText: listing.careersCtaText ?? "Join Our Team",
    careersHideBadge: listing.careersHideBadge ?? false,
    clientIntakeEnabled: listing.clientIntakeEnabled ?? false,
    websitePublished: listing.websitePublished ?? status === "published",
    websiteSettings: {
      template: readString(websiteSettings.template) ?? "modern",
      show_gallery: readBoolean(websiteSettings.show_gallery, true),
      show_reviews: readBoolean(websiteSettings.show_reviews, true),
      show_careers: readBoolean(websiteSettings.show_careers, true),
      show_resources: readBoolean(websiteSettings.show_resources, true),
      hero_cta_text: readString(websiteSettings.hero_cta_text) ?? "Get Started",
      sections_order: Array.isArray(websiteSettings.sections_order)
        ? websiteSettings.sections_order
        : ["hero", "about", "services", "insurance", "locations", "gallery", "reviews"],
    },
    publishedAt: listing.publishedAt ?? null,
  };
}

function buildLocationMetadata(
  location: {
    label?: string | null;
    street?: string | null;
    city: string;
    state: string;
    postalCode?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    isPrimary?: boolean | null;
    isFeatured?: boolean | null;
    serviceRadiusMiles?: number | null;
    serviceMode?: string | null;
    serviceTypes?: string[];
    insurances?: string[];
    googlePlaceId?: string | null;
    googleRating?: number | null;
    googleRatingCount?: number | null;
    showGoogleReviews?: boolean | null;
    contactPhone?: string | null;
    contactEmail?: string | null;
    contactWebsite?: string | null;
    useCompanyContact?: boolean | null;
  },
) {
  return {
    label: location.label ?? null,
    street: location.street ?? null,
    city: location.city,
    state: location.state,
    postalCode: location.postalCode ?? null,
    latitude: location.latitude ?? null,
    longitude: location.longitude ?? null,
    isPrimary: location.isPrimary ?? false,
    isFeatured: location.isFeatured ?? false,
    serviceRadiusMiles: location.serviceRadiusMiles ?? 25,
    serviceMode: location.serviceMode ?? "both",
    serviceTypes: normalizeServiceTypes(location.serviceTypes, location.serviceMode),
    insurances: location.insurances ?? [],
    googlePlaceId: location.googlePlaceId ?? null,
    googleRating: location.googleRating ?? null,
    googleRatingCount: location.googleRatingCount ?? null,
    showGoogleReviews: location.showGoogleReviews ?? false,
    contactPhone: location.contactPhone ?? null,
    contactEmail: location.contactEmail ?? null,
    contactWebsite: location.contactWebsite ?? null,
    useCompanyContact: location.useCompanyContact ?? true,
    formattedAddress: [location.street, location.city, location.state, location.postalCode]
      .filter((part): part is string => typeof part === "string" && part.length > 0)
      .join(", "),
  };
}

async function insertE2ESeedFixtures(ctx: ConvexCtx, timestamp: string) {
  if (!shouldInsertE2ESeedFixtures()) {
    return {
      workspaces: 0,
      listings: 0,
      locations: 0,
      publicReadModels: 0,
      listingAttributes: 0,
      jobPostings: 0,
    };
  }

  const workspaceId = await ctx.db.insert("workspaces", {
    slug: "goodaba-demo-aba",
    agencyName: "GoodABA Demo ABA",
    contactEmail: "careers@goodaba-demo-aba.com",
    planTier: "pro",
    subscriptionStatus: "active",
    onboardingCompletedAt: timestamp,
    primaryIntent: "both",
    settings: {
      contactPhone: "(555) 010-1000",
      website: "https://www.goodaba.com",
      intakeFormSettings: {
        background_color: "#10B981",
        show_powered_by: true,
      },
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const listingId = await ctx.db.insert("listings", {
    workspaceId,
    slug: "goodaba-demo-aba",
    status: "published",
    metadata: {
      headline: "Join a mission-driven ABA team serving families across Los Angeles.",
      description:
        "GoodABA Demo ABA provides in-home and center-based ABA services and uses this seeded profile to validate employer, careers, and provider pages in Convex dev.",
      summary: "Mission-driven ABA provider hiring BCBAs and RBTs in Los Angeles.",
      serviceModes: ["in_home", "in_center"],
      isAcceptingClients: true,
      videoUrl: null,
      logoUrl: null,
      careersBrandColor: "#10B981",
      careersHeadline: "Build your ABA career with a collaborative clinical team.",
      careersCtaText: "Apply Now",
      careersHideBadge: false,
      clientIntakeEnabled: true,
      websitePublished: true,
      websiteSettings: {
        template: "modern",
        show_gallery: true,
        show_reviews: true,
        show_careers: true,
        show_resources: true,
        hero_cta_text: "Get Started",
        sections_order: [
          "hero",
          "about",
          "services",
          "insurance",
          "locations",
          "gallery",
          "reviews",
        ],
      },
      publishedAt: timestamp,
    },
    searchDocument: {
      text: buildSearchText([
        "GoodABA Demo ABA",
        "Mission-driven ABA provider hiring BCBAs and RBTs in Los Angeles.",
        "Los Angeles",
        "CA",
      ]),
    },
    legacyTable: "seed_fixtures",
    legacySourceId: "goodaba-demo-aba-listing",
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  await ctx.db.insert("publicReadModels", {
    workspaceId,
    listingId,
    modelType: "listing",
    slug: "goodaba-demo-aba",
    routePath: "/provider/goodaba-demo-aba",
    state: "CA",
    city: "Los Angeles",
    searchText: buildSearchText([
      "GoodABA Demo ABA",
      "Mission-driven ABA provider hiring BCBAs and RBTs in Los Angeles.",
      "Los Angeles",
      "CA",
    ]),
    payload: {
      slug: "goodaba-demo-aba",
      headline: "Join a mission-driven ABA team serving families across Los Angeles.",
      status: "published",
    },
    legacyTable: "seed_fixtures",
    legacySourceId: "goodaba-demo-aba-listing-public",
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const locationId = await ctx.db.insert("locations", {
    workspaceId,
    listingId,
    slug: undefined,
    status: "active",
    metadata: {
      label: "Los Angeles HQ",
      street: "123 Demo Ave",
      city: "Los Angeles",
      state: "CA",
      postalCode: "90001",
      latitude: 34.0522,
      longitude: -118.2437,
      isPrimary: true,
      isFeatured: true,
      serviceRadiusMiles: 30,
      serviceMode: "both",
      serviceTypes: ["in_home", "in_center"],
      insurances: ["Aetna", "Blue Cross Blue Shield"],
      googlePlaceId: null,
      googleRating: 4.9,
      googleRatingCount: 128,
      showGoogleReviews: false,
      contactPhone: "(555) 010-1000",
      contactEmail: "careers@goodaba-demo-aba.com",
      contactWebsite: "https://www.goodaba.com",
      useCompanyContact: true,
      formattedAddress: "123 Demo Ave, Los Angeles, CA, 90001",
    },
    searchDocument: {
      text: buildSearchText([
        "Los Angeles HQ",
        "123 Demo Ave",
        "Los Angeles",
        "CA",
      ]),
    },
    legacyTable: "seed_fixtures",
    legacySourceId: "goodaba-demo-aba-location",
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  const attributes = [
    ["clinical_specialties", ["Early Intervention", "Parent Training"]],
    ["languages", ["English", "Spanish"]],
    ["insurances", ["Aetna", "Blue Cross Blue Shield"]],
    ["ages_served", { min: 2, max: 18 }],
  ] as const;

  for (const [attributeKey, value] of attributes) {
    await ctx.db.insert("listingAttributes", {
      listingId,
      attributeKey,
      value,
      legacyTable: "seed_fixtures",
      legacySourceId: `goodaba-demo-aba-${attributeKey}`,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  await ctx.db.insert("jobPostings", {
    workspaceId,
    listingId,
    slug: "bcba-los-angeles-goodaba-demo-aba",
    status: "published",
    searchDocument: {
      text: buildSearchText([
        "BCBA - Los Angeles",
        "GoodABA Demo ABA",
        "Los Angeles",
        "CA",
      ]),
    },
    metadata: {
      title: "BCBA - Los Angeles",
      description:
        "Provide compassionate, evidence-based ABA care, supervise RBTs, and partner with families across in-home and center-based programs.",
      positionType: "bcba",
      employmentTypes: ["full_time"],
      locationId: String(locationId),
      customCity: null,
      customState: null,
      serviceStates: ["CA"],
      remoteOption: false,
      salaryType: "annual",
      salaryMin: 90000,
      salaryMax: 110000,
      requirements:
        "BCBA certification, active state licensure where required, and at least 2 years of supervisory experience.",
      benefits: ["health_insurance", "pto", "ceu_stipend"],
      therapySettings: ["in_home", "in_center"],
      scheduleTypes: ["daytime", "after_school"],
      ageGroups: ["early_intervention", "preschool", "school_age"],
      publishedAt: timestamp,
      expiresAt: null,
      isFeatured: true,
    },
    legacyTable: "seed_fixtures",
    legacySourceId: "goodaba-demo-aba-job-bcba-la",
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  return {
    workspaces: 1,
    listings: 1,
    locations: 1,
    publicReadModels: 1,
    listingAttributes: attributes.length,
    jobPostings: 1,
  };
}

export const generateSeedUploadUrl = mutation({
  args: {
    secret: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    requireSeedSecret(args.secret);
    return ctx.storage.generateUploadUrl();
  },
});

export const provisionE2EDashboardWorkspace = mutation({
  args: {
    secret: v.string(),
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  returns: v.object({
    userId: v.string(),
    workspaceId: v.string(),
    listingId: v.string(),
    locationId: v.string(),
    jobPostingId: v.string(),
    slug: v.string(),
  }),
  handler: async (ctx, args) => {
    requireSeedSecret(args.secret);

    const timestamp = now();
    const email = normalizeSeedEmail(args.email);
    const publicWorkspaceEmail = `public+${args.clerkUserId}@example.com`;
    const displayName = [args.firstName, args.lastName].filter(Boolean).join(" ").trim();
    const slugSeed = email.split("@")[0] || args.clerkUserId;
    const workspaceSlug = generateSeedSlug(slugSeed) || "e2e-workspace";

    const existingUsers = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .collect();

    const userId = existingUsers[0]
      ? existingUsers[0]._id
      : await ctx.db.insert("users", {
          clerkUserId: args.clerkUserId,
          primaryEmail: email,
          firstName: args.firstName,
          lastName: args.lastName,
          displayName: displayName || undefined,
          createdAt: timestamp,
          updatedAt: timestamp,
        });

    await ctx.db.patch(asId<"users">(userId), {
      primaryEmail: email,
      firstName: args.firstName,
      lastName: args.lastName,
      displayName: displayName || undefined,
      updatedAt: timestamp,
    });

    const existingMemberships = await ctx.db
      .query("workspaceMemberships")
      .withIndex("by_user", (q) => q.eq("userId", asId<"users">(userId)))
      .collect();

    let workspaceId = existingMemberships[0]?.workspaceId
      ? String(existingMemberships[0].workspaceId)
      : null;

    if (!workspaceId) {
      workspaceId = String(
        await ctx.db.insert("workspaces", {
          slug: workspaceSlug,
          agencyName: "E2E User",
          contactEmail: publicWorkspaceEmail,
          planTier: "pro",
          subscriptionStatus: "active",
          billingInterval: "month",
          onboardingCompletedAt: timestamp,
          primaryIntent: "both",
          settings: {
            contactPhone: "(555) 010-2000",
            website: "https://www.goodaba.com",
            intakeFormSettings: {
              background_color: "#10B981",
              show_powered_by: true,
              enabled: true,
            },
          },
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      );
    } else {
      await ctx.db.patch(asId<"workspaces">(workspaceId), {
        slug: workspaceSlug,
        agencyName: "E2E User",
        contactEmail: publicWorkspaceEmail,
        planTier: "pro",
        subscriptionStatus: "active",
        billingInterval: "month",
        onboardingCompletedAt: timestamp,
        primaryIntent: "both",
        settings: {
          contactPhone: "(555) 010-2000",
          website: "https://www.goodaba.com",
          intakeFormSettings: {
            background_color: "#10B981",
            show_powered_by: true,
            enabled: true,
          },
        },
        updatedAt: timestamp,
      });
    }

    if (existingMemberships[0]) {
      await ctx.db.patch(asId<"workspaceMemberships">(existingMemberships[0]._id), {
        workspaceId: asId<"workspaces">(workspaceId),
        userId: asId<"users">(userId),
        email,
        role: "owner",
        status: "active",
        joinedAt: existingMemberships[0].joinedAt ?? timestamp,
        updatedAt: timestamp,
      });
    } else {
      await ctx.db.insert("workspaceMemberships", {
        workspaceId: asId<"workspaces">(workspaceId),
        userId: asId<"users">(userId),
        email,
        role: "owner",
        status: "active",
        joinedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    await ctx.db.patch(asId<"users">(userId), {
      activeWorkspaceId: asId<"workspaces">(workspaceId),
      updatedAt: timestamp,
    });

    const existingListings = await ctx.db
      .query("listings")
      .withIndex("by_workspace", (q) =>
        q.eq("workspaceId", asId<"workspaces">(workspaceId)),
      )
      .collect();

    let listingId = existingListings[0]?._id
      ? String(existingListings[0]._id)
      : null;

    const listingMetadata = {
      headline: "Evidence-based ABA care for families and a supportive workplace for clinicians.",
      description:
        "E2E User is a seeded Pro workspace used to verify GoodABA dashboard, directory, and hiring functionality against Convex and Clerk.",
      summary: "Seeded Pro workspace for end-to-end dashboard validation.",
      serviceModes: ["in_home", "in_center"],
      isAcceptingClients: true,
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      logoUrl: null,
      careersBrandColor: "#10B981",
      careersHeadline: "Join a collaborative ABA team",
      careersCtaText: "Apply Now",
      careersHideBadge: false,
      clientIntakeEnabled: true,
      websitePublished: true,
      websiteSettings: {
        template: "modern",
        show_gallery: true,
        show_reviews: true,
        show_careers: true,
        show_resources: true,
        hero_cta_text: "Get Started",
        sections_order: [
          "hero",
          "about",
          "services",
          "insurance",
          "locations",
          "gallery",
          "reviews",
        ],
      },
      publishedAt: timestamp,
    };

    if (!listingId) {
      listingId = String(
        await ctx.db.insert("listings", {
          workspaceId: asId<"workspaces">(workspaceId),
          slug: workspaceSlug,
          status: "published",
          metadata: listingMetadata,
          searchDocument: {
            text: buildSearchText([
              "E2E User",
              "Seeded Pro workspace for end-to-end dashboard validation.",
              "Los Angeles",
              "CA",
            ]),
          },
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      );
    } else {
      await ctx.db.patch(asId<"listings">(listingId), {
        workspaceId: asId<"workspaces">(workspaceId),
        slug: workspaceSlug,
        status: "published",
        metadata: listingMetadata,
        searchDocument: {
          text: buildSearchText([
            "E2E User",
            "Seeded Pro workspace for end-to-end dashboard validation.",
            "Los Angeles",
            "CA",
          ]),
        },
        updatedAt: timestamp,
      });
    }

    const existingPublicReadModels = await ctx.db
      .query("publicReadModels")
      .withIndex("by_listing_and_type", (q) =>
        q
          .eq("listingId", asId<"listings">(listingId))
          .eq("modelType", "listing"),
      )
      .collect();

    const listingPublicPayload = {
      slug: workspaceSlug,
      headline:
        "Evidence-based ABA care for families and a supportive workplace for clinicians.",
      status: "published",
    };

    if (existingPublicReadModels[0]) {
      await ctx.db.patch(
        asId<"publicReadModels">(existingPublicReadModels[0]._id),
        {
          workspaceId: asId<"workspaces">(workspaceId),
          listingId: asId<"listings">(listingId),
          modelType: "listing",
          slug: workspaceSlug,
          routePath: `/provider/${workspaceSlug}`,
          state: "CA",
          city: "Los Angeles",
          searchText: buildSearchText([
            "E2E User",
            "Seeded Pro workspace for end-to-end dashboard validation.",
            "Los Angeles",
            "CA",
          ]),
          payload: listingPublicPayload,
          updatedAt: timestamp,
        },
      );
    } else {
      await ctx.db.insert("publicReadModels", {
        workspaceId: asId<"workspaces">(workspaceId),
        listingId: asId<"listings">(listingId),
        modelType: "listing",
        slug: workspaceSlug,
        routePath: `/provider/${workspaceSlug}`,
        state: "CA",
        city: "Los Angeles",
        searchText: buildSearchText([
          "E2E User",
          "Seeded Pro workspace for end-to-end dashboard validation.",
          "Los Angeles",
          "CA",
        ]),
        payload: listingPublicPayload,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    const existingLocations = await ctx.db
      .query("locations")
      .withIndex("by_listing", (q) =>
        q.eq("listingId", asId<"listings">(listingId)),
      )
      .collect();

    let locationId = existingLocations[0]?._id
      ? String(existingLocations[0]._id)
      : null;

    const locationMetadata = {
      label: "Los Angeles HQ",
      street: "123 Demo Ave",
      city: "Los Angeles",
      state: "CA",
      postalCode: "90001",
      latitude: 34.0522,
      longitude: -118.2437,
      isPrimary: true,
      isFeatured: true,
      serviceRadiusMiles: 30,
      serviceMode: "both",
      serviceTypes: ["in_home", "in_center"],
      insurances: ["Aetna", "Blue Cross Blue Shield"],
      googlePlaceId: null,
      googleRating: 4.9,
      googleRatingCount: 128,
      showGoogleReviews: false,
      contactPhone: "(555) 010-2000",
      contactEmail: email,
      contactWebsite: "https://www.goodaba.com",
      useCompanyContact: true,
      formattedAddress: "123 Demo Ave, Los Angeles, CA, 90001",
    };

    if (!locationId) {
      locationId = String(
        await ctx.db.insert("locations", {
          workspaceId: asId<"workspaces">(workspaceId),
          listingId: asId<"listings">(listingId),
          status: "active",
          metadata: locationMetadata,
          searchDocument: {
            text: buildSearchText([
              "Los Angeles HQ",
              "123 Demo Ave",
              "Los Angeles",
              "CA",
            ]),
          },
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      );
    } else {
      await ctx.db.patch(asId<"locations">(locationId), {
        workspaceId: asId<"workspaces">(workspaceId),
        listingId: asId<"listings">(listingId),
        status: "active",
        metadata: locationMetadata,
        searchDocument: {
          text: buildSearchText([
            "Los Angeles HQ",
            "123 Demo Ave",
            "Los Angeles",
            "CA",
          ]),
        },
        updatedAt: timestamp,
      });
    }

    const existingJobPostings = await ctx.db
      .query("jobPostings")
      .withIndex("by_workspace", (q) =>
        q.eq("workspaceId", asId<"workspaces">(workspaceId)),
      )
      .collect();

    let jobPostingId = existingJobPostings[0]?._id
      ? String(existingJobPostings[0]._id)
      : null;
    let secondaryJobPostingId = existingJobPostings[1]?._id
      ? String(existingJobPostings[1]._id)
      : null;

    const jobMetadata = {
      title: "BCBA - Los Angeles",
      description:
        "Support families, supervise RBTs, and help validate GoodABA dashboard hiring workflows in Convex dev.",
      positionType: "bcba",
      employmentTypes: ["full_time"],
      locationId,
      customCity: null,
      customState: null,
      serviceStates: ["CA"],
      remoteOption: false,
      salaryType: "annual",
      salaryMin: 90000,
      salaryMax: 110000,
      requirements:
        "BCBA certification and at least 2 years of supervisory experience.",
      benefits: ["health_insurance", "pto", "ceu_stipend"],
      therapySettings: ["in_home", "in_center"],
      scheduleTypes: ["daytime", "after_school"],
      ageGroups: ["early_intervention", "preschool", "school_age"],
      publishedAt: timestamp,
      expiresAt: null,
      isFeatured: true,
    };

    if (!jobPostingId) {
      jobPostingId = String(
        await ctx.db.insert("jobPostings", {
          workspaceId: asId<"workspaces">(workspaceId),
          listingId: asId<"listings">(listingId),
          slug: `bcba-los-angeles-${workspaceSlug}`,
          status: "published",
          metadata: jobMetadata,
          searchDocument: {
            text: buildSearchText([
              "BCBA - Los Angeles",
              "E2E User",
              "Los Angeles",
              "CA",
            ]),
          },
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      );
    } else {
      await ctx.db.patch(asId<"jobPostings">(jobPostingId), {
        workspaceId: asId<"workspaces">(workspaceId),
        listingId: asId<"listings">(listingId),
        slug: `bcba-los-angeles-${workspaceSlug}`,
        status: "published",
        metadata: jobMetadata,
        searchDocument: {
          text: buildSearchText([
            "BCBA - Los Angeles",
            "E2E User",
            "Los Angeles",
            "CA",
          ]),
        },
        updatedAt: timestamp,
      });
    }

    const secondaryJobMetadata = {
      title: "RBT - Pasadena",
      description:
        "Second seeded role used to verify dashboard applicant job filters and hiring workflows.",
      positionType: "rbt",
      employmentTypes: ["part_time"],
      locationId,
      customCity: null,
      customState: null,
      serviceStates: ["CA"],
      remoteOption: false,
      salaryType: "hourly",
      salaryMin: 28,
      salaryMax: 34,
      requirements: "RBT credential preferred and willingness to support in-home ABA services.",
      benefits: ["pto", "flexible_schedule"],
      therapySettings: ["in_home"],
      scheduleTypes: ["after_school"],
      ageGroups: ["preschool", "school_age"],
      publishedAt: timestamp,
      expiresAt: null,
      isFeatured: false,
    };

    if (!secondaryJobPostingId) {
      secondaryJobPostingId = String(
        await ctx.db.insert("jobPostings", {
          workspaceId: asId<"workspaces">(workspaceId),
          listingId: asId<"listings">(listingId),
          slug: `rbt-pasadena-${workspaceSlug}`,
          status: "published",
          metadata: secondaryJobMetadata,
          searchDocument: {
            text: buildSearchText([
              "RBT - Pasadena",
              "E2E User",
              "Pasadena",
              "CA",
            ]),
          },
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      );
    } else {
      await ctx.db.patch(asId<"jobPostings">(secondaryJobPostingId), {
        workspaceId: asId<"workspaces">(workspaceId),
        listingId: asId<"listings">(listingId),
        slug: `rbt-pasadena-${workspaceSlug}`,
        status: "published",
        metadata: secondaryJobMetadata,
        searchDocument: {
          text: buildSearchText([
            "RBT - Pasadena",
            "E2E User",
            "Pasadena",
            "CA",
          ]),
        },
        updatedAt: timestamp,
      });
    }

    const existingApplications = await ctx.db
      .query("jobApplications")
      .withIndex("by_job_posting", (q) =>
        q.eq("jobPostingId", asId<"jobPostings">(jobPostingId)),
      )
      .collect();

    if (existingApplications.length === 0) {
      await ctx.db.insert("jobApplications", {
        workspaceId: asId<"workspaces">(workspaceId),
        jobPostingId: asId<"jobPostings">(jobPostingId),
        applicantEmail: `applicant+${workspaceSlug}@test.findabatherapy.com`,
        status: "new",
        metadata: {
          applicantName: "Jordan Applicant",
          applicantPhone: "(555) 010-3030",
          coverLetter:
            "Experienced BCBA applying through the seeded GoodABA E2E workspace.",
          linkedinUrl: "https://www.linkedin.com/in/jordan-applicant",
          source: "direct",
          rating: 4,
          notes: "Seeded applicant for dashboard E2E validation.",
          reviewedAt: null,
        },
        createdAt: timestamp,
        updatedAt: timestamp,
        legacyTable: "seed_fixtures",
        legacySourceId: `${workspaceSlug}-application`,
      });
    }

    if (secondaryJobPostingId) {
      const secondaryApplications = await ctx.db
        .query("jobApplications")
        .withIndex("by_job_posting", (q) =>
          q.eq("jobPostingId", asId<"jobPostings">(secondaryJobPostingId)),
        )
        .collect();

      if (secondaryApplications.length === 0) {
        await ctx.db.insert("jobApplications", {
          workspaceId: asId<"workspaces">(workspaceId),
          jobPostingId: asId<"jobPostings">(secondaryJobPostingId),
          applicantEmail: `reviewed-applicant+${workspaceSlug}@test.findabatherapy.com`,
          status: "reviewed",
          metadata: {
            applicantName: "Taylor Reviewed",
            applicantPhone: "(555) 010-3031",
            coverLetter:
              "Reviewed applicant fixture used for applicant status and job filter validation.",
            linkedinUrl: "https://www.linkedin.com/in/taylor-reviewed",
            source: "direct",
            rating: 5,
            notes: "Second seeded applicant for dashboard filter validation.",
            reviewedAt: timestamp,
          },
          createdAt: timestamp,
          updatedAt: timestamp,
          legacyTable: "seed_fixtures",
          legacySourceId: `${workspaceSlug}-reviewed-application`,
        });
      }
    }

    return {
      userId: String(userId),
      workspaceId,
      listingId,
      locationId,
      jobPostingId,
      slug: workspaceSlug,
    };
  },
});

export const provisionE2ECommunicationFixtures = mutation({
  args: {
    secret: v.string(),
    workspaceId: v.string(),
    listingId: v.string(),
    childFirstName: v.string(),
    childLastName: v.string(),
    parentFirstName: v.string(),
    parentLastName: v.string(),
    parentEmail: v.string(),
    packetSlug: v.string(),
  },
  returns: v.object({
    clientId: v.string(),
    packetId: v.string(),
  }),
  handler: async (ctx, args) => {
    requireSeedSecret(args.secret);

    const workspaceId = asId<"workspaces">(args.workspaceId);
    const listing = await ctx.db.get(asId<"listings">(args.listingId));
    if (!listing || String(listing.workspaceId) !== args.workspaceId) {
      throw new ConvexError("Listing not found for E2E communications fixture");
    }

    const timestamp = now();
    const clientId = await ctx.db.insert("crmRecords", {
      workspaceId,
      recordType: "client",
      status: "inquiry",
      payload: {
        firstName: args.childFirstName,
        lastName: args.childLastName,
        stage: "inquiry",
      },
      relatedIds: {
        listingId: args.listingId,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      legacyTable: "seed_fixtures",
      legacySourceId: `${args.packetSlug}-client`,
    });

    await ctx.db.insert("crmRecords", {
      workspaceId,
      recordType: "client_parent",
      status: "active",
      payload: {
        firstName: args.parentFirstName,
        lastName: args.parentLastName,
        email: args.parentEmail,
        phone: "(555) 010-4040",
        relationship: "mother",
        isPrimary: true,
      },
      relatedIds: {
        clientId: String(clientId),
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      legacyTable: "seed_fixtures",
      legacySourceId: `${args.packetSlug}-parent`,
    });

    const packetId = await ctx.db.insert("agreementPackets", {
      workspaceId,
      slug: args.packetSlug,
      status: "published",
      payload: {
        title: "Codex Agreement Packet",
        description: "Seeded agreement packet for communications E2E validation.",
        documents: [],
        settings: {
          requireSignature: false,
          notifyOnSubmission: false,
          expiresInDays: 7,
        },
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      legacyTable: "seed_fixtures",
      legacySourceId: `${args.packetSlug}-packet`,
    });

    return {
      clientId: String(clientId),
      packetId: String(packetId),
    };
  },
});

export const resetE2EOnboardingWorkspace = mutation({
  args: {
    secret: v.string(),
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  returns: v.object({
    userId: v.string(),
    workspaceId: v.string(),
    listingId: v.string(),
    slug: v.string(),
  }),
  handler: async (ctx, args) => {
    requireSeedSecret(args.secret);

    const timestamp = now();
    const email = normalizeSeedEmail(args.email);
    const displayName = [args.firstName, args.lastName].filter(Boolean).join(" ").trim();
    const slugSeed = email.split("@")[0] || args.clerkUserId;
    const workspaceSlug = generateSeedSlug(`${slugSeed}-onboarding`) || "e2e-onboarding";

    const existingUsers = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .collect();

    const userId = existingUsers[0]
      ? existingUsers[0]._id
      : await ctx.db.insert("users", {
          clerkUserId: args.clerkUserId,
          primaryEmail: email,
          firstName: args.firstName,
          lastName: args.lastName,
          displayName: displayName || undefined,
          createdAt: timestamp,
          updatedAt: timestamp,
        });

    await ctx.db.patch(asId<"users">(userId), {
      primaryEmail: email,
      firstName: args.firstName,
      lastName: args.lastName,
      displayName: displayName || undefined,
      updatedAt: timestamp,
    });

    const existingMemberships = await ctx.db
      .query("workspaceMemberships")
      .withIndex("by_user", (q) => q.eq("userId", asId<"users">(userId)))
      .collect();

    let workspaceId = existingMemberships[0]?.workspaceId
      ? String(existingMemberships[0].workspaceId)
      : null;

    if (!workspaceId) {
      workspaceId = String(
        await ctx.db.insert("workspaces", {
          slug: workspaceSlug,
          agencyName: "E2E Onboarding User",
          contactEmail: email,
          planTier: "free",
          subscriptionStatus: "inactive",
          billingInterval: "month",
          primaryIntent: "both",
          settings: {
            contactPhone: "(555) 010-3000",
            website: "https://www.goodaba.com",
          },
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      );
    }

    await clearWorkspaceRowsByWorkspaceId(ctx, workspaceId);

    const existingWorkspace = await ctx.db.get(asId<"workspaces">(workspaceId));
    if (!existingWorkspace) {
      throw new ConvexError("Failed to load onboarding workspace");
    }

    await ctx.db.replace(asId<"workspaces">(workspaceId), {
      slug: workspaceSlug,
      agencyName: "E2E Onboarding User",
      contactEmail: email,
      planTier: "free",
      subscriptionStatus: "inactive",
      billingInterval: "month",
      primaryIntent: "both",
      settings: {
        contactPhone: "(555) 010-3000",
        website: "https://www.goodaba.com",
      },
      createdAt: existingWorkspace.createdAt ?? timestamp,
      updatedAt: timestamp,
    });

    if (existingMemberships[0]) {
      await ctx.db.patch(asId<"workspaceMemberships">(existingMemberships[0]._id), {
        workspaceId: asId<"workspaces">(workspaceId),
        userId: asId<"users">(userId),
        email,
        role: "owner",
        status: "active",
        joinedAt: existingMemberships[0].joinedAt ?? timestamp,
        updatedAt: timestamp,
      });
    } else {
      await ctx.db.insert("workspaceMemberships", {
        workspaceId: asId<"workspaces">(workspaceId),
        userId: asId<"users">(userId),
        email,
        role: "owner",
        status: "active",
        joinedAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    await ctx.db.patch(asId<"users">(userId), {
      activeWorkspaceId: asId<"workspaces">(workspaceId),
      updatedAt: timestamp,
    });

    const listingId = await ctx.db.insert("listings", {
      workspaceId: asId<"workspaces">(workspaceId),
      slug: workspaceSlug,
      status: "draft",
      metadata: buildListingMetadata(
        {
          headline: null,
          description: null,
          summary: null,
          serviceModes: [],
          isAcceptingClients: true,
          videoUrl: null,
          logoUrl: null,
          careersBrandColor: "#10B981",
          careersHeadline: null,
          careersCtaText: "Join Our Team",
          careersHideBadge: false,
          clientIntakeEnabled: false,
          websitePublished: false,
          websiteSettings: {},
          publishedAt: null,
        },
        "draft",
      ),
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return {
      userId: String(userId),
      workspaceId,
      listingId: String(listingId),
      slug: workspaceSlug,
    };
  },
});

export const resetE2ECommunicationFixtures = mutation({
  args: {
    secret: v.string(),
    workspaceId: v.string(),
  },
  returns: v.object({
    deletedCount: v.number(),
  }),
  handler: async (ctx, args) => {
    requireSeedSecret(args.secret);

    const tableNames = [
      "agreementArtifacts",
      "agreementPackets",
      "communicationRecords",
      "crmRecords",
      "intakeTokens",
    ] as const;

    let deletedCount = 0;
    for (const tableName of tableNames) {
      const rows = await ctx.db.query(tableName).collect();
      for (const row of rows) {
        if (String((row as { workspaceId?: unknown }).workspaceId ?? "") !== args.workspaceId) {
          continue;
        }

        await ctx.db.delete(row._id);
        deletedCount += 1;
      }
    }

    return { deletedCount };
  },
});

export const insertE2ECommunicationTemplate = mutation({
  args: {
    secret: v.string(),
    workspaceId: v.string(),
    name: v.string(),
    slug: v.string(),
    lifecycleStage: v.string(),
    subject: v.string(),
    body: v.string(),
    cc: v.optional(v.array(v.string())),
    mergeFields: v.optional(v.array(v.string())),
  },
  returns: v.object({
    templateId: v.string(),
  }),
  handler: async (ctx, args) => {
    requireSeedSecret(args.secret);

    const timestamp = now();
    const templateId = await ctx.db.insert("communicationRecords", {
      workspaceId: asId<"workspaces">(args.workspaceId),
      subjectType: "template",
      channel: "email",
      status: "active",
      payload: {
        slug: args.slug,
        name: args.name,
        lifecycleStage: args.lifecycleStage,
        subject: args.subject,
        body: args.body,
        cc: args.cc ?? [],
        mergeFields: args.mergeFields ?? [],
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      legacyTable: "seed_fixtures",
      legacySourceId: `${args.slug}-template`,
    });

    return { templateId: String(templateId) };
  },
});

export const inspectE2ECommunicationState = query({
  args: {
    secret: v.string(),
    workspaceId: v.string(),
    clientId: v.optional(v.string()),
    templateName: v.optional(v.string()),
    templateSubject: v.optional(v.string()),
  },
  returns: v.object({
    templateCount: v.number(),
    generalUpdateSlugCount: v.number(),
    latestTemplate: v.union(
      v.null(),
      v.object({
        id: v.string(),
        slug: v.string(),
        subject: v.string(),
        body: v.string(),
        cc: v.array(v.string()),
      }),
    ),
    intakeTokenCount: v.number(),
    agreementLinkCount: v.number(),
    latestCommunication: v.union(
      v.null(),
      v.object({
        status: v.string(),
        subject: v.string(),
        body: v.string(),
        recipientEmail: v.string(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    requireSeedSecret(args.secret);

    const workspaceId = asId<"workspaces">(args.workspaceId);
    const templateRows = await ctx.db
      .query("communicationRecords")
      .withIndex("by_workspace_and_subject", (q) =>
        q.eq("workspaceId", workspaceId).eq("subjectType", "template"),
      )
      .collect();

    const matchingTemplates = templateRows
      .filter((row) => {
        const payload = asRecord(row.payload);
        if (args.templateName && readString(payload.name) !== args.templateName) {
          return false;
        }
        if (args.templateSubject && readString(payload.subject) !== args.templateSubject) {
          return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(readString(b.updatedAt) ?? 0).getTime() -
          new Date(readString(a.updatedAt) ?? 0).getTime(),
      );

    const latestTemplateRow = matchingTemplates[0] ?? null;
    const latestTemplatePayload = asRecord(latestTemplateRow?.payload);

    const tokenRows = await ctx.db.query("intakeTokens").collect();
    const workspaceTokenRows = tokenRows.filter(
      (row) => String(row.workspaceId) === args.workspaceId,
    );

    const communicationRows = await ctx.db
      .query("communicationRecords")
      .withIndex("by_workspace_and_subject", (q) =>
        q.eq("workspaceId", workspaceId).eq("subjectType", "client"),
      )
      .collect();
    const latestCommunicationRow = communicationRows
      .filter((row) => !args.clientId || row.subjectId === args.clientId)
      .sort(
        (a, b) =>
          new Date(readString(b.createdAt) ?? 0).getTime() -
          new Date(readString(a.createdAt) ?? 0).getTime(),
      )[0] ?? null;
    const latestCommunicationPayload = asRecord(latestCommunicationRow?.payload);

    return {
      templateCount: matchingTemplates.length,
      generalUpdateSlugCount: templateRows.filter(
        (row) => readString(asRecord(row.payload).slug) === "general-update",
      ).length,
      latestTemplate: latestTemplateRow
        ? {
            id: String(latestTemplateRow._id),
            slug: readString(latestTemplatePayload.slug) ?? "",
            subject: readString(latestTemplatePayload.subject) ?? "",
            body: readString(latestTemplatePayload.body) ?? "",
            cc: Array.isArray(latestTemplatePayload.cc)
              ? latestTemplatePayload.cc.filter(
                  (value): value is string => typeof value === "string",
                )
              : [],
          }
        : null,
      intakeTokenCount: workspaceTokenRows.filter(
        (row) =>
          row.subjectType === "client_intake" &&
          (!args.clientId || row.subjectId === args.clientId),
      ).length,
      agreementLinkCount: workspaceTokenRows.filter((row) => {
        if (row.subjectType !== "agreement_link") {
          return false;
        }
        if (!args.clientId) {
          return true;
        }
        return readString(asRecord(row.payload).clientId) === args.clientId;
      }).length,
      latestCommunication: latestCommunicationRow
        ? {
            status: readString(latestCommunicationRow.status) ?? "",
            subject: readString(latestCommunicationPayload.subject) ?? "",
            body: readString(latestCommunicationPayload.body) ?? "",
            recipientEmail:
              readString(latestCommunicationPayload.recipientEmail) ?? "",
          }
        : null,
    };
  },
});

export const deleteE2EWorkspaceByClerkUserId = mutation({
  args: {
    secret: v.string(),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    requireSeedSecret(args.secret);

    const users = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .collect();
    const user = users[0] ?? null;
    if (!user) {
      return { success: true };
    }

    const memberships = await ctx.db
      .query("workspaceMemberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    for (const membership of memberships) {
      await clearWorkspaceRowsByWorkspaceId(ctx, String(membership.workspaceId));
      await ctx.db.delete(membership._id);
      await ctx.db.delete(asId<"workspaces">(String(membership.workspaceId)));
    }

    await ctx.db.delete(user._id);
    return { success: true };
  },
});

export const replaceDirectorySeedData = mutation({
  args: {
    secret: v.string(),
    payload: v.object({
      profiles: v.array(seedProfileValidator),
      listings: v.array(seedListingValidator),
      locations: v.array(seedLocationValidator),
      listingAttributes: v.array(seedListingAttributeValidator),
      mediaAssets: v.array(seedMediaAssetValidator),
      googleReviews: v.array(seedGoogleReviewValidator),
      googlePlacesListings: v.array(seedGooglePlacesListingValidator),
      customDomains: v.array(seedCustomDomainValidator),
    }),
  },
  handler: async (ctx, args) => {
    requireSeedSecret(args.secret);

    const deletedCounts: Record<string, number> = {};
    deletedCounts.files = await clearImportedFiles(ctx);
    for (const tableName of APP_TABLES) {
      if (tableName === "files") {
        continue;
      }
      deletedCounts[tableName] = await clearTable(ctx, tableName);
    }

    const timestamp = now();
    const workspaceIdsByProfileId = new Map<string, string>();
    const listingIdsByLegacyId = new Map<string, string>();
    const listingPublicModelIdsByListingId = new Map<string, string>();
    const locationIdsByLegacyId = new Map<string, string>();
    const primaryLocationByListingId = new Map<
      string,
      { city: string; state: string }
    >();

    for (const profile of args.payload.profiles) {
      const planTier = normalizePlanTier(profile.planTier);
      const workspaceId = await ctx.db.insert("workspaces", {
        slug: undefined,
        agencyName: profile.agencyName,
        contactEmail: profile.contactEmail,
        planTier,
        subscriptionStatus: inferSubscriptionStatus(planTier, profile.subscriptionStatus),
        onboardingCompletedAt: profile.onboardingCompletedAt ?? profile.createdAt ?? timestamp,
        primaryIntent: "provider_directory",
        settings: {
          contactPhone: profile.contactPhone ?? null,
          website: profile.website ?? null,
          intakeFormSettings: asRecord(profile.intakeFormSettings),
        },
        legacySourceId: profile.id,
        legacyTable: "profiles",
        legacyPayload: profile,
        createdAt: profile.createdAt ?? timestamp,
        updatedAt: profile.updatedAt ?? timestamp,
      });
      workspaceIdsByProfileId.set(profile.id, String(workspaceId));
    }

    for (const listing of args.payload.listings) {
      const workspaceId = workspaceIdsByProfileId.get(listing.profileId);
      if (!workspaceId) {
        continue;
      }

      const status = readString(listing.status) ?? "published";
      const listingId = await ctx.db.insert("listings", {
        workspaceId: asId<"workspaces">(workspaceId),
        slug: listing.slug,
        status,
        metadata: buildListingMetadata(listing, status),
        searchDocument: {
          text: buildSearchText([
            listing.slug,
            listing.headline,
            listing.description,
            listing.summary,
          ]),
        },
        legacySourceId: listing.id,
        legacyTable: "listings",
        legacyPayload: listing,
        createdAt: listing.createdAt ?? timestamp,
        updatedAt: listing.updatedAt ?? timestamp,
      });
      listingIdsByLegacyId.set(listing.id, String(listingId));

      const publicModelId = await ctx.db.insert("publicReadModels", {
        workspaceId: asId<"workspaces">(workspaceId),
        listingId: asId<"listings">(listingId),
        modelType: "listing",
        slug: listing.slug,
        routePath: `/provider/${listing.slug}`,
        searchText: buildSearchText([
          listing.slug,
          listing.headline,
          listing.description,
          listing.summary,
        ]),
        payload: {
          slug: listing.slug,
          headline: listing.headline ?? null,
          status,
        },
        legacySourceId: listing.id,
        legacyTable: "listings",
        legacyPayload: listing,
        createdAt: listing.createdAt ?? timestamp,
        updatedAt: listing.updatedAt ?? timestamp,
      });
      listingPublicModelIdsByListingId.set(String(listingId), String(publicModelId));
    }

    for (const location of args.payload.locations) {
      const listingId = listingIdsByLegacyId.get(location.listingId);
      if (!listingId) {
        continue;
      }

      const listing = await ctx.db.get(asId<"listings">(listingId));
      if (!listing?.workspaceId) {
        continue;
      }

      const metadata = buildLocationMetadata(location);
      const locationId = await ctx.db.insert("locations", {
        workspaceId: asId<"workspaces">(String(listing.workspaceId)),
        listingId: asId<"listings">(listingId),
        slug: undefined,
        status: "active",
        metadata,
        searchDocument: {
          text: buildSearchText([
            location.label,
            location.street,
            location.city,
            location.state,
          ]),
        },
        legacySourceId: location.id,
        legacyTable: "locations",
        legacyPayload: location,
        createdAt: location.createdAt ?? timestamp,
        updatedAt: location.updatedAt ?? timestamp,
      });
      locationIdsByLegacyId.set(location.id, String(locationId));

      if (metadata.isPrimary || !primaryLocationByListingId.has(listingId)) {
        primaryLocationByListingId.set(listingId, {
          city: metadata.city,
          state: metadata.state,
        });
      }
    }

    for (const [listingId, primaryLocation] of primaryLocationByListingId.entries()) {
      const publicModelId = listingPublicModelIdsByListingId.get(listingId);
      if (!publicModelId) {
        continue;
      }
      await ctx.db.patch(asId<"publicReadModels">(publicModelId), {
        city: primaryLocation.city,
        state: primaryLocation.state,
        updatedAt: timestamp,
      });
    }

    for (const attribute of args.payload.listingAttributes) {
      const listingId = listingIdsByLegacyId.get(attribute.listingId);
      if (!listingId) {
        continue;
      }

      await ctx.db.insert("listingAttributes", {
        listingId: asId<"listings">(listingId),
        attributeKey: attribute.attributeKey,
        value: resolveAttributeValue(attribute),
        legacySourceId: attribute.id,
        legacyTable: "listing_attribute_values",
        legacyPayload: attribute,
        createdAt: attribute.createdAt ?? timestamp,
        updatedAt: attribute.updatedAt ?? timestamp,
      });
    }

    for (const asset of args.payload.mediaAssets) {
      const listingId = listingIdsByLegacyId.get(asset.listingId);
      if (!listingId) {
        continue;
      }

      const listing = await ctx.db.get(asId<"listings">(listingId));
      if (!listing?.workspaceId) {
        continue;
      }

      const storageId = readString(asset.storageId);
      const storageDoc = storageId
        ? await ctx.db.system.get("_storage", asId<"_storage">(storageId))
        : null;

      await ctx.db.insert("files", {
        workspaceId: asId<"workspaces">(String(listing.workspaceId)),
        storageId: storageId ? asId<"_storage">(storageId) : undefined,
        bucket: asset.bucket,
        storageKey: asset.storageKey,
        filename: asset.filename,
        mimeType: readString(storageDoc?.contentType) ?? asset.mimeType,
        byteSize: readNumber(storageDoc?.size, asset.byteSize),
        visibility: "public",
        relatedTable: "listings",
        relatedId: listingId,
        publicPath: asset.publicUrl ?? undefined,
        metadata: {
          kind: asset.mediaType,
          sortOrder: asset.sortOrder ?? 0,
          title: asset.title ?? null,
        },
        legacySourceId: asset.id,
        legacyTable: "media_assets",
        legacyPayload: asset,
        createdAt: asset.createdAt ?? timestamp,
        updatedAt: timestamp,
      });
    }

    for (const review of args.payload.googleReviews) {
      const locationId = locationIdsByLegacyId.get(review.locationId);
      if (!locationId) {
        continue;
      }

      const location = await ctx.db.get(asId<"locations">(locationId));
      const listingId = readString(location?.listingId);
      if (!listingId) {
        continue;
      }

      await ctx.db.insert("googleReviewRecords", {
        listingId: asId<"listings">(listingId),
        reviewId: review.reviewId,
        payload: {
          locationId,
          authorName: review.authorName,
          authorPhotoUrl: review.authorPhotoUrl ?? null,
          rating: review.rating,
          text: review.text ?? null,
          relativeTimeDescription: review.relativeTimeDescription ?? null,
          publishedAt: review.publishedAt ?? null,
          isSelected: review.isSelected ?? false,
          fetchedAt: review.fetchedAt ?? timestamp,
        },
        legacySourceId: review.id,
        legacyTable: "google_reviews",
        legacyPayload: review,
        createdAt: review.createdAt ?? timestamp,
        updatedAt: review.updatedAt ?? timestamp,
      });
    }

    for (const row of args.payload.googlePlacesListings) {
      await ctx.db.insert("publicReadModels", {
        workspaceId: undefined,
        listingId:
          row.claimedListingId && listingIdsByLegacyId.has(row.claimedListingId)
            ? asId<"listings">(listingIdsByLegacyId.get(row.claimedListingId)!)
            : undefined,
        modelType: "google_places_listing",
        slug: row.slug,
        routePath: `/provider/google/${row.slug}`,
        state: row.state,
        city: row.city,
        searchText: buildSearchText([
          row.name,
          row.street,
          row.city,
          row.state,
          row.formattedAddress,
        ]),
        payload: {
          google_place_id: row.googlePlaceId,
          name: row.name,
          street: row.street ?? null,
          city: row.city,
          state: row.state,
          postal_code: row.postalCode ?? null,
          latitude: row.latitude ?? null,
          longitude: row.longitude ?? null,
          formatted_address: row.formattedAddress ?? null,
          phone: row.phone ?? null,
          website: row.website ?? null,
          google_rating: row.googleRating ?? null,
          google_rating_count: row.googleRatingCount ?? null,
          status: readString(row.status) ?? "active",
          claimed_listing_id: row.claimedListingId
            ? listingIdsByLegacyId.get(row.claimedListingId) ?? null
            : null,
          claimed_at: row.claimedAt ?? null,
        },
        legacySourceId: row.id,
        legacyTable: "google_places_listings",
        legacyPayload: row,
        createdAt: row.createdAt ?? timestamp,
        updatedAt: row.updatedAt ?? timestamp,
      });
    }

    for (const domain of args.payload.customDomains) {
      const workspaceId = workspaceIdsByProfileId.get(domain.profileId);
      const listingId = listingIdsByLegacyId.get(domain.listingId);
      if (!workspaceId || !listingId) {
        continue;
      }

      await ctx.db.insert("customDomains", {
        workspaceId: asId<"workspaces">(workspaceId),
        listingId: asId<"listings">(listingId),
        hostname: domain.domain,
        status: readString(domain.status) ?? "pending_dns",
        metadata: {
          verificationToken: domain.verificationToken ?? null,
          verifiedAt: domain.verifiedAt ?? null,
          vercelDomainId: domain.vercelDomainId ?? null,
          errorMessage: domain.errorMessage ?? null,
        },
        legacySourceId: domain.id,
        legacyTable: "custom_domains",
        legacyPayload: domain,
        createdAt: domain.createdAt ?? timestamp,
        updatedAt: domain.updatedAt ?? timestamp,
      });
    }

    const e2eFixtureCounts = await insertE2ESeedFixtures(ctx, timestamp);

    return {
      success: true,
      deletedCounts,
      importedCounts: {
        workspaces: workspaceIdsByProfileId.size,
        listings: listingIdsByLegacyId.size,
        locations: locationIdsByLegacyId.size,
        listingAttributes: args.payload.listingAttributes.length,
        mediaAssets: args.payload.mediaAssets.length,
        googleReviews: args.payload.googleReviews.length,
        googlePlacesListings: args.payload.googlePlacesListings.length,
        customDomains: args.payload.customDomains.length,
        e2eFixtureWorkspaces: e2eFixtureCounts.workspaces,
        e2eFixtureListings: e2eFixtureCounts.listings,
        e2eFixtureLocations: e2eFixtureCounts.locations,
        e2eFixturePublicReadModels: e2eFixtureCounts.publicReadModels,
        e2eFixtureListingAttributes: e2eFixtureCounts.listingAttributes,
        e2eFixtureJobPostings: e2eFixtureCounts.jobPostings,
      },
    };
  },
});
