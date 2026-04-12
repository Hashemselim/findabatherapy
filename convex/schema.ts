import { defineSchema, defineTable } from "convex/server";
import { v, type Validator } from "convex/values";

const payloadScalar = v.union(v.string(), v.number(), v.boolean(), v.null());
const payloadLeaf = v.union(
  payloadScalar,
  v.array(v.string()),
  v.array(v.number()),
  v.array(v.boolean()),
  v.array(v.null()),
);
const payloadObjectLevel1 = v.record(v.string(), payloadLeaf);
const payloadValue = v.union(
  payloadLeaf,
  payloadObjectLevel1,
  v.array(payloadObjectLevel1),
) as unknown as Validator<unknown>;
const payloadObject = v.record(v.string(), payloadValue) as Validator<
  Record<string, unknown>
>;

const timestamps = {
  createdAt: v.optional(v.string()),
  updatedAt: v.optional(v.string()),
  deletedAt: v.optional(v.string()),
};

const legacySync = {
  legacySourceId: v.optional(v.string()),
  legacyTable: v.optional(v.string()),
  legacyPayload: v.optional(payloadObject),
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
    isAdmin: v.optional(v.boolean()),
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
    settings: v.optional(payloadObject),
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
    publicReadModel: v.optional(payloadObject),
    searchDocument: v.optional(payloadObject),
    metadata: v.optional(payloadObject),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  locations: defineTable({
    workspaceId: v.id("workspaces"),
    listingId: v.optional(v.id("listings")),
    slug: v.optional(v.string()),
    status: v.optional(v.string()),
    metadata: v.optional(payloadObject),
    searchDocument: v.optional(payloadObject),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_listing", ["listingId"]),

  listingAttributes: defineTable({
    listingId: v.id("listings"),
    attributeKey: v.string(),
    value: payloadValue,
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
    payload: payloadObject,
    ...timestamps,
    ...legacySync,
  }).index("by_place_id", ["placeId"]),

  googleReviewRecords: defineTable({
    placeRecordId: v.optional(v.id("googlePlacesRecords")),
    listingId: v.optional(v.id("listings")),
    reviewId: v.string(),
    payload: payloadObject,
    ...timestamps,
    ...legacySync,
  }).index("by_review_id", ["reviewId"]),

  customDomains: defineTable({
    workspaceId: v.id("workspaces"),
    listingId: v.optional(v.id("listings")),
    hostname: v.string(),
    status: v.optional(v.string()),
    metadata: v.optional(payloadObject),
    ...timestamps,
    ...legacySync,
  })
    .index("by_hostname", ["hostname"])
    .index("by_listing", ["listingId"]),

  jobPostings: defineTable({
    workspaceId: v.id("workspaces"),
    listingId: v.optional(v.id("listings")),
    slug: v.optional(v.string()),
    status: v.optional(v.string()),
    searchDocument: v.optional(payloadObject),
    metadata: v.optional(payloadObject),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_listing", ["listingId"])
    .index("by_slug", ["slug"])
    .index("by_status", ["status"]),

  removalRequests: defineTable({
    workspaceId: v.id("workspaces"),
    listingId: v.id("listings"),
    googlePlacesListingId: v.string(),
    reason: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_listing", ["listingId"])
    .index("by_google_places_listing", ["googlePlacesListingId"]),

  jobApplications: defineTable({
    workspaceId: v.id("workspaces"),
    jobPostingId: v.optional(v.id("jobPostings")),
    applicantEmail: v.optional(v.string()),
    status: v.optional(v.string()),
    metadata: v.optional(payloadObject),
    ...timestamps,
    ...legacySync,
  }).index("by_job_posting", ["jobPostingId"]),

  crmRecords: defineTable({
    workspaceId: v.id("workspaces"),
    recordType: v.string(),
    status: v.optional(v.string()),
    payload: payloadObject,
    relatedIds: v.optional(payloadObject),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_type", ["recordType"])
    .index("by_workspace_and_type", ["workspaceId", "recordType"]),

  inquiryRecords: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    listingId: v.optional(v.id("listings")),
    status: v.optional(v.string()),
    payload: payloadObject,
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
    payload: v.optional(payloadObject),
    ...timestamps,
    ...legacySync,
  }).index("by_token", ["token"]),

  agreementPackets: defineTable({
    workspaceId: v.id("workspaces"),
    slug: v.optional(v.string()),
    status: v.optional(v.string()),
    payload: payloadObject,
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
    payload: v.optional(payloadObject),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_packet", ["packetId"]),

  formTemplates: defineTable({
    workspaceId: v.id("workspaces"),
    slug: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived"),
    ),
    title: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
    draftSchemaJson: v.string(),
    latestPublishedVersionId: v.optional(v.id("formVersions")),
    latestVersionNumber: v.optional(v.number()),
    publishedAt: v.optional(v.string()),
    archivedAt: v.optional(v.string()),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_and_status", ["workspaceId", "status"])
    .index("by_workspace_and_slug", ["workspaceId", "slug"]),

  formVersions: defineTable({
    workspaceId: v.id("workspaces"),
    templateId: v.id("formTemplates"),
    versionNumber: v.number(),
    title: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
    schemaJson: v.string(),
    publishedAt: v.string(),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_template", ["templateId"])
    .index("by_workspace_and_template", ["workspaceId", "templateId"]),

  formLinks: defineTable({
    workspaceId: v.id("workspaces"),
    templateId: v.id("formTemplates"),
    versionId: v.id("formVersions"),
    linkType: v.union(v.literal("generic"), v.literal("client_specific")),
    token: v.string(),
    clientId: v.optional(v.id("crmRecords")),
    assignmentId: v.optional(v.id("formAssignments")),
    status: v.union(
      v.literal("active"),
      v.literal("disabled"),
      v.literal("submitted"),
    ),
    expiresAt: v.optional(v.string()),
    usedAt: v.optional(v.string()),
    lastUsedAt: v.optional(v.string()),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_token", ["token"])
    .index("by_assignment", ["assignmentId"])
    .index("by_client", ["clientId"]),

  formAssignments: defineTable({
    workspaceId: v.id("workspaces"),
    templateId: v.id("formTemplates"),
    versionId: v.id("formVersions"),
    clientId: v.id("crmRecords"),
    taskId: v.optional(v.id("crmRecords")),
    linkId: v.optional(v.id("formLinks")),
    titleSnapshot: v.string(),
    descriptionSnapshot: v.optional(v.union(v.string(), v.null())),
    dueDate: v.optional(v.union(v.string(), v.null())),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    completedAt: v.optional(v.string()),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_client", ["clientId"])
    .index("by_template", ["templateId"])
    .index("by_task", ["taskId"]),

  formSubmissions: defineTable({
    workspaceId: v.id("workspaces"),
    templateId: v.id("formTemplates"),
    versionId: v.id("formVersions"),
    assignmentId: v.optional(v.id("formAssignments")),
    linkId: v.optional(v.id("formLinks")),
    clientId: v.optional(v.id("crmRecords")),
    taskId: v.optional(v.id("crmRecords")),
    reviewState: v.union(
      v.literal("submitted"),
      v.literal("reviewed"),
      v.literal("flagged"),
      v.literal("archived"),
    ),
    status: v.union(v.literal("submitted"), v.literal("attached")),
    responderType: v.optional(v.string()),
    responderName: v.optional(v.union(v.string(), v.null())),
    responderEmail: v.optional(v.union(v.string(), v.null())),
    answersJson: v.string(),
    submittedAt: v.string(),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_client", ["clientId"])
    .index("by_assignment", ["assignmentId"])
    .index("by_link", ["linkId"])
    .index("by_template", ["templateId"])
    .index("by_workspace_and_review_state", ["workspaceId", "reviewState"]),

  formDrafts: defineTable({
    workspaceId: v.id("workspaces"),
    templateId: v.id("formTemplates"),
    versionId: v.id("formVersions"),
    assignmentId: v.optional(v.id("formAssignments")),
    linkId: v.optional(v.id("formLinks")),
    clientId: v.optional(v.id("crmRecords")),
    taskId: v.optional(v.id("crmRecords")),
    tokenFingerprint: v.optional(v.string()),
    answersJson: v.string(),
    lastSavedAt: v.string(),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_assignment", ["assignmentId"])
    .index("by_link", ["linkId"])
    .index("by_token_fingerprint", ["tokenFingerprint"]),

  referralRecords: defineTable({
    workspaceId: v.id("workspaces"),
    recordType: v.string(),
    payload: payloadObject,
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
    payload: v.optional(payloadObject),
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
    payload: payloadObject,
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
    payload: v.optional(payloadObject),
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
    metadata: v.optional(payloadObject),
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
    payload: payloadObject,
    ...timestamps,
    ...legacySync,
  })
    .index("by_model_type", ["modelType"])
    .index("by_listing_and_type", ["listingId", "modelType"])
    .index("by_slug", ["slug"])
    .index("by_route_path", ["routePath"]),

  auditEvents: defineTable({
    workspaceId: v.optional(v.id("workspaces")),
    actorUserId: v.optional(v.id("users")),
    eventType: v.string(),
    payload: v.optional(payloadObject),
    ...timestamps,
    ...legacySync,
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_event_type", ["eventType"]),

  migrationImports: defineTable({
    sourceSystem: v.string(),
    sourceTable: v.string(),
    sourceId: v.string(),
    targetTable: v.optional(v.string()),
    targetId: v.optional(v.string()),
    status: v.string(),
    checksum: v.optional(v.string()),
    payload: v.optional(payloadObject),
    error: v.optional(v.string()),
    ...timestamps,
  })
    .index("by_source_record", ["sourceTable", "sourceId"])
    .index("by_status", ["status"]),
});
