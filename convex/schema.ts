import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const timestamps = {
  createdAt: v.optional(v.string()),
  updatedAt: v.optional(v.string()),
  deletedAt: v.optional(v.string()),
};

const legacySync = {
  legacySourceId: v.optional(v.string()),
  legacyTable: v.optional(v.string()),
  legacyPayload: v.optional(v.any()),
};

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    primaryEmail: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    displayName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    activeWorkspaceId: v.optional(v.id("workspaces")),
    ...timestamps,
    ...legacySync,
  }).index("by_clerk_user_id", ["clerkUserId"]),

  workspaces: defineTable({
    slug: v.optional(v.string()),
    agencyName: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    planTier: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()),
    billingInterval: v.optional(v.string()),
    onboardingCompletedAt: v.optional(v.string()),
    primaryIntent: v.optional(v.string()),
    settings: v.optional(v.any()),
    ...timestamps,
    ...legacySync,
  })
    .index("by_slug", ["slug"])
    .index("by_legacy_source_id", ["legacySourceId"]),

  workspaceMemberships: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    email: v.string(),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    status: v.union(v.literal("active"), v.literal("revoked")),
    invitedByUserId: v.optional(v.id("users")),
    joinedAt: v.optional(v.string()),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_and_user", ["workspaceId", "userId"]),

  workspaceInvitations: defineTable({
    workspaceId: v.id("workspaces"),
    email: v.string(),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("revoked"),
      v.literal("expired"),
    ),
    tokenHash: v.string(),
    acceptedByUserId: v.optional(v.id("users")),
    expiresAt: v.optional(v.string()),
    acceptedAt: v.optional(v.string()),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_email", ["email"])
    .index("by_token_hash", ["tokenHash"]),

  listings: defineTable({
    workspaceId: v.id("workspaces"),
    slug: v.optional(v.string()),
    status: v.optional(v.string()),
    publicReadModel: v.optional(v.any()),
    searchDocument: v.optional(v.any()),
    metadata: v.optional(v.any()),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_slug", ["slug"]),

  locations: defineTable({
    workspaceId: v.id("workspaces"),
    listingId: v.optional(v.id("listings")),
    slug: v.optional(v.string()),
    status: v.optional(v.string()),
    metadata: v.optional(v.any()),
    searchDocument: v.optional(v.any()),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_listing", ["listingId"]),

  listingAttributes: defineTable({
    listingId: v.id("listings"),
    attributeKey: v.string(),
    value: v.any(),
    ...timestamps,
    ...legacySync,
  })
    .index("by_listing", ["listingId"])
    .index("by_listing_and_key", ["listingId", "attributeKey"]),

  googlePlacesRecords: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    listingId: v.optional(v.id("listings")),
    locationId: v.optional(v.id("locations")),
    placeId: v.string(),
    payload: v.any(),
    ...timestamps,
    ...legacySync,
  }).index("by_place_id", ["placeId"]),

  googleReviewRecords: defineTable({
    placeRecordId: v.optional(v.id("googlePlacesRecords")),
    listingId: v.optional(v.id("listings")),
    reviewId: v.string(),
    payload: v.any(),
    ...timestamps,
    ...legacySync,
  }).index("by_review_id", ["reviewId"]),

  customDomains: defineTable({
    workspaceId: v.id("workspaces"),
    listingId: v.optional(v.id("listings")),
    hostname: v.string(),
    status: v.optional(v.string()),
    metadata: v.optional(v.any()),
    ...timestamps,
    ...legacySync,
  }).index("by_hostname", ["hostname"]),

  jobPostings: defineTable({
    workspaceId: v.id("workspaces"),
    listingId: v.optional(v.id("listings")),
    slug: v.optional(v.string()),
    status: v.optional(v.string()),
    searchDocument: v.optional(v.any()),
    metadata: v.optional(v.any()),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_listing", ["listingId"])
    .index("by_slug", ["slug"]),

  jobApplications: defineTable({
    workspaceId: v.id("workspaces"),
    jobPostingId: v.optional(v.id("jobPostings")),
    applicantEmail: v.optional(v.string()),
    status: v.optional(v.string()),
    metadata: v.optional(v.any()),
    ...timestamps,
    ...legacySync,
  }).index("by_job_posting", ["jobPostingId"]),

  crmRecords: defineTable({
    workspaceId: v.id("workspaces"),
    recordType: v.string(),
    status: v.optional(v.string()),
    payload: v.any(),
    relatedIds: v.optional(v.any()),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_and_type", ["workspaceId", "recordType"]),

  inquiryRecords: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    listingId: v.optional(v.id("listings")),
    status: v.optional(v.string()),
    payload: v.any(),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_listing", ["listingId"]),

  intakeTokens: defineTable({
    workspaceId: v.id("workspaces"),
    subjectType: v.string(),
    subjectId: v.optional(v.string()),
    token: v.string(),
    expiresAt: v.optional(v.string()),
    payload: v.optional(v.any()),
    ...timestamps,
    ...legacySync,
  }).index("by_token", ["token"]),

  agreementPackets: defineTable({
    workspaceId: v.id("workspaces"),
    slug: v.optional(v.string()),
    status: v.optional(v.string()),
    payload: v.any(),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_slug", ["slug"]),

  agreementArtifacts: defineTable({
    workspaceId: v.id("workspaces"),
    packetId: v.optional(v.id("agreementPackets")),
    versionId: v.optional(v.string()),
    submissionId: v.optional(v.string()),
    fileId: v.optional(v.id("files")),
    artifactType: v.string(),
    payload: v.optional(v.any()),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_packet", ["packetId"]),

  referralRecords: defineTable({
    workspaceId: v.id("workspaces"),
    recordType: v.string(),
    payload: v.any(),
    status: v.optional(v.string()),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_and_type", ["workspaceId", "recordType"]),

  notificationRecords: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.optional(v.id("users")),
    notificationType: v.string(),
    status: v.optional(v.string()),
    payload: v.optional(v.any()),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"]),

  communicationRecords: defineTable({
    workspaceId: v.id("workspaces"),
    subjectType: v.string(),
    subjectId: v.optional(v.string()),
    channel: v.optional(v.string()),
    status: v.optional(v.string()),
    payload: v.any(),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_and_subject", ["workspaceId", "subjectType"]),

  billingRecords: defineTable({
    workspaceId: v.id("workspaces"),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    recordType: v.string(),
    status: v.optional(v.string()),
    payload: v.optional(v.any()),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_stripe_customer_id", ["stripeCustomerId"])
    .index("by_stripe_subscription_id", ["stripeSubscriptionId"]),

  files: defineTable({
    workspaceId: v.id("workspaces"),
    storageId: v.optional(v.id("_storage")),
    bucket: v.string(),
    storageKey: v.string(),
    filename: v.string(),
    mimeType: v.string(),
    byteSize: v.number(),
    visibility: v.union(v.literal("public"), v.literal("private")),
    relatedTable: v.optional(v.string()),
    relatedId: v.optional(v.string()),
    publicPath: v.optional(v.string()),
    metadata: v.optional(v.any()),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_storage_key", ["storageKey"])
    .index("by_related_record", ["relatedTable", "relatedId"]),

  publicReadModels: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    listingId: v.optional(v.id("listings")),
    modelType: v.string(),
    slug: v.optional(v.string()),
    routePath: v.optional(v.string()),
    state: v.optional(v.string()),
    city: v.optional(v.string()),
    searchText: v.optional(v.string()),
    payload: v.any(),
    ...timestamps,
    ...legacySync,
  })
    .index("by_model_type", ["modelType"])
    .index("by_slug", ["slug"])
    .index("by_route_path", ["routePath"]),

  auditEvents: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    actorUserId: v.optional(v.id("users")),
    eventType: v.string(),
    payload: v.optional(v.any()),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_event_type", ["eventType"]),

  migrationImports: defineTable({
    sourceSystem: v.literal("supabase"),
    sourceTable: v.string(),
    sourceId: v.string(),
    targetTable: v.optional(v.string()),
    targetId: v.optional(v.string()),
    status: v.string(),
    checksum: v.optional(v.string()),
    payload: v.optional(v.any()),
    error: v.optional(v.string()),
    ...timestamps,
  })
    .index("by_source_record", ["sourceTable", "sourceId"])
    .index("by_status", ["status"]),
});
