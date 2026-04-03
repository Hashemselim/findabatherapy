import { mutationGeneric, queryGeneric } from "convex/server";
import { ConvexError, v } from "convex/values";

type Identity = {
  subject: string;
};

type ConvexDoc = Record<string, unknown> & { _id: string };

const BASE_JOB_LIMITS = {
  free: 0,
  pro: 10,
} as const;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : fallback;
}

function asId<TableName extends string>(value: unknown) {
  return value as string & { __tableName: TableName };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function generateSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getEffectivePlanTier(planTier: unknown, subscriptionStatus: unknown) {
  if (planTier !== "pro") {
    return "free";
  }

  return subscriptionStatus === "active" || subscriptionStatus === "trialing"
    ? "pro"
    : "free";
}

async function requireIdentity(ctx: {
  auth: { getUserIdentity(): Promise<Identity | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }

  return identity;
}

async function findUserByClerkUserId(
  ctx: {
    db: {
      query(table: "users"): {
        withIndex(
          index: "by_clerk_user_id",
          cb: (q: { eq(field: "clerkUserId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    };
  },
  clerkUserId: string,
) {
  const users = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
    .collect();

  return users[0] ?? null;
}

async function requireCurrentWorkspaceContext(ctx: {
  auth: { getUserIdentity(): Promise<Identity | null> };
  db: {
    get(id: string): Promise<ConvexDoc | null>;
    query(table: "users"): {
      withIndex(
        index: "by_clerk_user_id",
        cb: (q: { eq(field: "clerkUserId", value: string): unknown }) => unknown,
      ): { collect(): Promise<ConvexDoc[]> };
    };
    query(table: "workspaceMemberships"): {
      withIndex(
        index: "by_user",
        cb: (q: { eq(field: "userId", value: string): unknown }) => unknown,
      ): { collect(): Promise<ConvexDoc[]> };
    };
    query(table: "listings"): {
      withIndex(
        index: "by_workspace",
        cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown,
      ): { collect(): Promise<ConvexDoc[]> };
    };
  };
}) {
  const identity = await requireIdentity(ctx);
  const user = await findUserByClerkUserId(ctx as never, identity.subject);
  if (!user) {
    throw new ConvexError("Not authenticated");
  }

  const memberships = await ctx.db
    .query("workspaceMemberships")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect();
  const activeMembership =
    memberships.find(
      (membership) =>
        membership.status === "active" &&
        membership.workspaceId === user.activeWorkspaceId,
    ) ?? memberships.find((membership) => membership.status === "active");

  if (!activeMembership) {
    throw new ConvexError("Workspace not found");
  }

  const workspace = await ctx.db.get(asId<"workspaces">(activeMembership.workspaceId));
  if (!workspace) {
    throw new ConvexError("Workspace not found");
  }

  const listings = await ctx.db
    .query("listings")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspace._id))
    .collect();

  return {
    identity,
    user,
    membership: activeMembership,
    workspace,
    listing: listings[0] ?? null,
  };
}

async function findUniqueJobSlug(
  ctx: {
    db: {
      query(table: "jobPostings"): {
        withIndex(
          index: "by_slug",
          cb: (q: { eq(field: "slug", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    };
  },
  title: string,
  agencyName: string,
  excludeJobId?: string,
) {
  const baseSlug = generateSlug(`${title}-${agencyName}`) || "job-posting";
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    const matches = await ctx.db
      .query("jobPostings")
      .withIndex("by_slug", (q) => q.eq("slug", candidate))
      .collect();
    const conflicting = matches.find((job) => job._id !== excludeJobId);
    if (!conflicting) {
      return candidate;
    }

    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
}

async function getWorkspaceJobPostings(
  ctx: {
    db: {
      query(table: "jobPostings"): {
        withIndex(
          index: "by_workspace",
          cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    };
  },
  workspaceId: string,
) {
  return ctx.db
    .query("jobPostings")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();
}

async function getJobApplicationsForJob(
  ctx: {
    db: {
      query(table: "jobApplications"): {
        withIndex(
          index: "by_job_posting",
          cb: (q: { eq(field: "jobPostingId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    };
  },
  jobPostingId: string,
) {
  return ctx.db
    .query("jobApplications")
    .withIndex("by_job_posting", (q) => q.eq("jobPostingId", jobPostingId))
    .collect();
}

async function getWorkspaceLocations(
  ctx: {
    db: {
      query(table: "locations"): {
        withIndex(
          index: "by_workspace",
          cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    };
  },
  workspaceId: string,
) {
  return ctx.db
    .query("locations")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();
}

async function getListingLogoUrl(
  ctx: {
    db: {
      query(table: "files"): {
        withIndex(
          index: "by_related_record",
          cb: (q: {
            eq(field: "relatedTable", value: string): {
              eq(field: "relatedId", value: string): unknown;
            };
          }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    };
    storage: { getUrl(storageId: string): Promise<string | null> };
  },
  listingId: string | null,
) {
  if (!listingId) {
    return null;
  }

  const files = await ctx.db
    .query("files")
    .withIndex("by_related_record", (q) =>
      q.eq("relatedTable", "listings").eq("relatedId", listingId),
    )
    .collect();
  const logo = files.find((file) => asRecord(file.metadata).kind === "logo") ?? null;

  if (!logo || typeof logo.storageId !== "string") {
    return null;
  }

  return ctx.storage.getUrl(asId<"_storage">(logo.storageId));
}

async function getApplicationResumeFile(
  ctx: {
    db: {
      query(table: "files"): {
        withIndex(
          index: "by_related_record",
          cb: (q: {
            eq(field: "relatedTable", value: string): {
              eq(field: "relatedId", value: string): unknown;
            };
          }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    };
  },
  applicationId: string,
) {
  const files = await ctx.db
    .query("files")
    .withIndex("by_related_record", (q) =>
      q.eq("relatedTable", "jobApplications").eq("relatedId", applicationId),
    )
    .collect();

  return files[0] ?? null;
}

async function getActiveJobPackCount(
  ctx: {
    db: {
      query(table: "billingRecords"): {
        withIndex(
          index: "by_workspace",
          cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    };
  },
  workspaceId: string,
) {
  const records = await ctx.db
    .query("billingRecords")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  return records.reduce((sum, record) => {
    if (record.recordType !== "addon" || record.status !== "active") {
      return sum;
    }

    const payload = asRecord(record.payload);
    const addonType = readString(payload.addonType) ?? readString(payload.addon_type);
    if (addonType !== "job_pack") {
      return sum;
    }

    const quantity = readNumber(payload.quantity, 1);
    return sum + Math.max(1, quantity);
  }, 0);
}

async function getEffectiveJobLimit(
  ctx: {
    db: {
      query(table: "billingRecords"): {
        withIndex(
          index: "by_workspace",
          cb: (q: { eq(field: "workspaceId", value: string): unknown }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    };
  },
  workspace: ConvexDoc,
) {
  const planTier = getEffectivePlanTier(workspace.planTier, workspace.subscriptionStatus);
  const addOnPacks = planTier === "pro"
    ? await getActiveJobPackCount(ctx as never, workspace._id)
    : 0;

  return BASE_JOB_LIMITS[planTier] + addOnPacks * 5;
}

function mapLocationSummary(location: ConvexDoc | null) {
  if (!location) {
    return null;
  }

  const metadata = asRecord(location.metadata);
  return {
    id: location._id,
    city: readString(metadata.city) ?? "",
    state: readString(metadata.state) ?? "",
    street: readString(metadata.street),
  };
}

function mapJobPosting(
  job: ConvexDoc,
  params: {
    location: ConvexDoc | null;
    agencyName: string;
    contactEmail: string;
    logoUrl: string | null;
    planTier: "free" | "pro";
    subscriptionStatus: string | null;
    applicationCount: number;
  },
) {
  const metadata = asRecord(job.metadata);

  return {
    id: job._id,
    profileId: String(job.workspaceId),
    locationId: readString(metadata.locationId),
    customCity: readString(metadata.customCity),
    customState: readString(metadata.customState),
    serviceStates: readStringArray(metadata.serviceStates),
    title: readString(metadata.title) ?? "",
    slug: readString(job.slug) ?? "",
    description: readString(metadata.description),
    positionType: readString(metadata.positionType) ?? "other",
    employmentTypes: readStringArray(metadata.employmentTypes),
    salaryMin:
      typeof metadata.salaryMin === "number" ? metadata.salaryMin : null,
    salaryMax:
      typeof metadata.salaryMax === "number" ? metadata.salaryMax : null,
    salaryType: readString(metadata.salaryType),
    remoteOption: readBoolean(metadata.remoteOption),
    requirements: readString(metadata.requirements),
    benefits: readStringArray(metadata.benefits),
    therapySettings: readStringArray(metadata.therapySettings),
    scheduleTypes: readStringArray(metadata.scheduleTypes),
    ageGroups: readStringArray(metadata.ageGroups),
    status: readString(job.status) ?? "draft",
    publishedAt: readString(metadata.publishedAt),
    expiresAt: readString(metadata.expiresAt),
    createdAt: readString(job.createdAt) ?? new Date().toISOString(),
    updatedAt: readString(job.updatedAt) ?? new Date().toISOString(),
    profile: {
      agencyName: params.agencyName,
      contactEmail: params.contactEmail,
      logoUrl: params.logoUrl,
      planTier: params.planTier,
      subscriptionStatus: params.subscriptionStatus,
    },
    location: mapLocationSummary(params.location),
    applicationCount: params.applicationCount,
  };
}

async function deleteResumeFileIfPresent(
  ctx: {
    db: {
      delete(id: string): Promise<void>;
      query(table: "files"): {
        withIndex(
          index: "by_related_record",
          cb: (q: {
            eq(field: "relatedTable", value: string): {
              eq(field: "relatedId", value: string): unknown;
            };
          }) => unknown,
        ): { collect(): Promise<ConvexDoc[]> };
      };
    };
    storage: { delete(storageId: string): Promise<void> };
  },
  applicationId: string,
) {
  const file = await getApplicationResumeFile(ctx as never, applicationId);
  if (!file) {
    return;
  }

  if (typeof file.storageId === "string") {
    await ctx.storage.delete(asId<"_storage">(file.storageId));
  }

  await ctx.db.delete(asId<"files">(file._id));
}

function isPublicWorkspaceVisible(workspace: ConvexDoc) {
  const email = readString(workspace.contactEmail);
  return !(
    typeof email === "string" &&
    email.trim().toLowerCase().endsWith("@test.findabatherapy.com")
  );
}

async function getPublicJobSearchDataset(
  ctx: {
    db: {
      query(table: "jobPostings"): { collect(): Promise<ConvexDoc[]> };
      query(table: "workspaces"): { collect(): Promise<ConvexDoc[]> };
      query(table: "listings"): { collect(): Promise<ConvexDoc[]> };
      query(table: "locations"): { collect(): Promise<ConvexDoc[]> };
      query(table: "files"): { collect(): Promise<ConvexDoc[]> };
    };
    storage: { getUrl(storageId: string): Promise<string | null> };
  },
) {
  const [jobs, workspaces, listings, locations, files] = await Promise.all([
    ctx.db.query("jobPostings").collect(),
    ctx.db.query("workspaces").collect(),
    ctx.db.query("listings").collect(),
    ctx.db.query("locations").collect(),
    ctx.db.query("files").collect(),
  ]);

  const workspaceById = new Map(workspaces.map((workspace) => [workspace._id, workspace]));
  const listingByWorkspaceId = new Map(
    listings
      .filter((listing) => listing.status === "published")
      .map((listing) => [String(listing.workspaceId), listing]),
  );
  const locationById = new Map(locations.map((location) => [location._id, location]));
  const filesByListingId = new Map<string, ConvexDoc[]>();

  for (const file of files) {
    if (file.relatedTable !== "listings" || typeof file.relatedId !== "string") {
      continue;
    }
    const existing = filesByListingId.get(file.relatedId) ?? [];
    existing.push(file);
    filesByListingId.set(file.relatedId, existing);
  }

  const results = await Promise.all(
    jobs
      .filter((job) => job.status === "published")
      .map(async (job) => {
        const workspace = workspaceById.get(String(job.workspaceId)) ?? null;
        if (!workspace || !isPublicWorkspaceVisible(workspace)) {
          return null;
        }

        const listing = listingByWorkspaceId.get(String(job.workspaceId)) ?? null;
        if (!listing || !readString(listing.slug)) {
          return null;
        }

        const listingFiles = filesByListingId.get(listing._id) ?? [];
        const logoFile =
          listingFiles.find((file) => asRecord(file.metadata).kind === "logo") ?? null;
        const logoUrl =
          typeof logoFile?.storageId === "string"
            ? await ctx.storage.getUrl(asId<"_storage">(logoFile.storageId))
            : null;

        const metadata = asRecord(job.metadata);
        const locationId = readString(metadata.locationId);
        const location = locationId ? locationById.get(locationId) ?? null : null;
        const locationMetadata = asRecord(location?.metadata);
        const effectiveTier = getEffectivePlanTier(
          workspace.planTier,
          workspace.subscriptionStatus,
        );

        return {
          id: job._id,
          slug: readString(job.slug) ?? "",
          title: readString(metadata.title) ?? "",
          description: readString(metadata.description),
          positionType: readString(metadata.positionType) ?? "other",
          employmentTypes: readStringArray(metadata.employmentTypes),
          salaryMin:
            typeof metadata.salaryMin === "number" ? metadata.salaryMin : null,
          salaryMax:
            typeof metadata.salaryMax === "number" ? metadata.salaryMax : null,
          salaryType: readString(metadata.salaryType),
          remoteOption: readBoolean(metadata.remoteOption),
          requirements: readString(metadata.requirements),
          benefits: readStringArray(metadata.benefits),
          therapySettings: readStringArray(metadata.therapySettings),
          scheduleTypes: readStringArray(metadata.scheduleTypes),
          ageGroups: readStringArray(metadata.ageGroups),
          publishedAt: readString(metadata.publishedAt) ?? readString(job.createdAt) ?? new Date().toISOString(),
          expiresAt: readString(metadata.expiresAt),
          isFeatured: readBoolean(metadata.isFeatured),
          provider: {
            id: workspace._id,
            slug: readString(listing.slug) ?? "",
            agencyName: readString(workspace.agencyName) ?? "",
            logoUrl,
            planTier: effectiveTier,
            isVerified: effectiveTier !== "free",
          },
          location:
            readString(metadata.customCity) && readString(metadata.customState)
              ? {
                  city: readString(metadata.customCity) ?? "",
                  state: readString(metadata.customState) ?? "",
                  lat: null,
                  lng: null,
                }
              : location
                ? {
                    city: readString(locationMetadata.city) ?? "",
                    state: readString(locationMetadata.state) ?? "",
                    lat:
                      typeof locationMetadata.latitude === "number"
                        ? locationMetadata.latitude
                        : null,
                    lng:
                      typeof locationMetadata.longitude === "number"
                        ? locationMetadata.longitude
                        : null,
                  }
                : null,
          serviceStates: readStringArray(metadata.serviceStates),
        };
      }),
  );

  return results.filter((job): job is NonNullable<typeof job> => Boolean(job));
}

async function getPublicEmployersDataset(
  ctx: {
    db: {
      query(table: "workspaces"): { collect(): Promise<ConvexDoc[]> };
      query(table: "listings"): { collect(): Promise<ConvexDoc[]> };
      query(table: "locations"): { collect(): Promise<ConvexDoc[]> };
      query(table: "jobPostings"): { collect(): Promise<ConvexDoc[]> };
      query(table: "files"): { collect(): Promise<ConvexDoc[]> };
    };
    storage: { getUrl(storageId: string): Promise<string | null> };
  },
  hiringOnly = false,
) {
  const [workspaces, listings, locations, jobs, files] = await Promise.all([
    ctx.db.query("workspaces").collect(),
    ctx.db.query("listings").collect(),
    ctx.db.query("locations").collect(),
    ctx.db.query("jobPostings").collect(),
    ctx.db.query("files").collect(),
  ]);

  const visibleListings = listings.filter((listing) => listing.status === "published");
  const jobCounts = new Map<string, number>();
  for (const job of jobs) {
    if (job.status !== "published") {
      continue;
    }
    const workspaceId = String(job.workspaceId);
    jobCounts.set(workspaceId, (jobCounts.get(workspaceId) ?? 0) + 1);
  }

  const locationsByWorkspaceId = new Map<string, ConvexDoc[]>();
  for (const location of locations) {
    const workspaceId = String(location.workspaceId);
    const existing = locationsByWorkspaceId.get(workspaceId) ?? [];
    existing.push(location);
    locationsByWorkspaceId.set(workspaceId, existing);
  }

  const logoByListingId = new Map<string, ConvexDoc>();
  for (const file of files) {
    if (
      file.relatedTable === "listings" &&
      typeof file.relatedId === "string" &&
      asRecord(file.metadata).kind === "logo"
    ) {
      logoByListingId.set(file.relatedId, file);
    }
  }

  const employers = await Promise.all(
    visibleListings.map(async (listing) => {
      const workspace = workspaces.find((entry) => entry._id === listing.workspaceId) ?? null;
      if (!workspace || !isPublicWorkspaceVisible(workspace) || !readString(listing.slug)) {
        return null;
      }

      const openJobCount = jobCounts.get(workspace._id) ?? 0;
      if (hiringOnly && openJobCount === 0) {
        return null;
      }

      const workspaceLocations = (locationsByWorkspaceId.get(workspace._id) ?? []).slice().sort(
        (left, right) =>
          Number(readBoolean(asRecord(right.metadata).isPrimary)) -
          Number(readBoolean(asRecord(left.metadata).isPrimary)),
      );
      const primaryLocation = workspaceLocations[0]
        ? {
            city: readString(asRecord(workspaceLocations[0].metadata).city) ?? "",
            state: readString(asRecord(workspaceLocations[0].metadata).state) ?? "",
          }
        : null;

      const logoFile = logoByListingId.get(listing._id) ?? null;
      const logoUrl =
        typeof logoFile?.storageId === "string"
          ? await ctx.storage.getUrl(asId<"_storage">(logoFile.storageId))
          : null;
      const listingMetadata = asRecord(listing.metadata);
      const effectiveTier = getEffectivePlanTier(
        workspace.planTier,
        workspace.subscriptionStatus,
      );

      return {
        id: workspace._id,
        slug: readString(listing.slug) ?? "",
        agencyName: readString(workspace.agencyName) ?? "",
        logoUrl,
        headline: readString(listingMetadata.headline),
        planTier: effectiveTier,
        isVerified: effectiveTier !== "free",
        primaryLocation,
        locationCount: workspaceLocations.length,
        openJobCount,
      };
    }),
  );

  return employers
    .filter((employer): employer is NonNullable<typeof employer> => Boolean(employer))
    .sort((a, b) => {
      const aIsPaid = a.planTier !== "free";
      const bIsPaid = b.planTier !== "free";
      if (aIsPaid && !bIsPaid) return -1;
      if (!aIsPaid && bIsPaid) return 1;
      if (b.openJobCount !== a.openJobCount) return b.openJobCount - a.openJobCount;
      return a.agencyName.localeCompare(b.agencyName);
    });
}

export const getDashboardJobPostings = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const { workspace } = await requireCurrentWorkspaceContext(ctx as never);
    const [jobs, locations] = await Promise.all([
      getWorkspaceJobPostings(ctx as never, workspace._id),
      getWorkspaceLocations(ctx as never, workspace._id),
    ]);

    const applicationEntries = await Promise.all(
      jobs.map(async (job) => ({
        jobId: job._id,
        count: (await getJobApplicationsForJob(ctx as never, job._id)).length,
      })),
    );
    const applicationCounts = Object.fromEntries(
      applicationEntries.map((entry) => [entry.jobId, entry.count]),
    );

    return jobs
      .slice()
      .sort(
        (left, right) =>
          new Date(readString(right.createdAt) ?? 0).getTime() -
          new Date(readString(left.createdAt) ?? 0).getTime(),
      )
      .map((job) => {
        const metadata = asRecord(job.metadata);
        const locationId = readString(metadata.locationId);
        const location = locationId
          ? locations.find((entry) => entry._id === locationId) ?? null
          : null;
        const locationSummary = mapLocationSummary(location);

        return {
          id: job._id,
          title: readString(metadata.title) ?? "",
          slug: readString(job.slug) ?? "",
          positionType: readString(metadata.positionType) ?? "other",
          status: readString(job.status) ?? "draft",
          publishedAt: readString(metadata.publishedAt),
          createdAt: readString(job.createdAt) ?? new Date().toISOString(),
          applicationCount: applicationCounts[job._id] ?? 0,
          location: locationSummary
            ? { city: locationSummary.city, state: locationSummary.state }
            : null,
        };
      });
  },
});

export const getDashboardJobPosting = queryGeneric({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspace, listing } = await requireCurrentWorkspaceContext(ctx as never);
    const job = await ctx.db.get(asId<"jobPostings">(args.id));
    if (!job || job.workspaceId !== workspace._id) {
      return null;
    }

    const [locations, applications, logoUrl] = await Promise.all([
      getWorkspaceLocations(ctx as never, workspace._id),
      getJobApplicationsForJob(ctx as never, job._id),
      getListingLogoUrl(ctx as never, listing?._id ?? null),
    ]);

    const metadata = asRecord(job.metadata);
    const locationId = readString(metadata.locationId);
    const location = locationId
      ? locations.find((entry) => entry._id === locationId) ?? null
      : null;

    return mapJobPosting(job, {
      location,
      agencyName: readString(workspace.agencyName) ?? "",
      contactEmail: readString(workspace.contactEmail) ?? "",
      logoUrl,
      planTier: getEffectivePlanTier(workspace.planTier, workspace.subscriptionStatus),
      subscriptionStatus: readString(workspace.subscriptionStatus),
      applicationCount: applications.length,
    });
  },
});

export const getJobCountAndLimit = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const { workspace } = await requireCurrentWorkspaceContext(ctx as never);
    const jobs = await getWorkspaceJobPostings(ctx as never, workspace._id);
    const limit = await getEffectiveJobLimit(ctx as never, workspace);

    return {
      count: jobs.length,
      limit,
      canCreate: jobs.length < limit,
    };
  },
});

export const createDashboardJobPosting = mutationGeneric({
  args: {
    title: v.string(),
    description: v.string(),
    positionType: v.string(),
    employmentTypes: v.array(v.string()),
    locationId: v.optional(v.union(v.string(), v.null())),
    customCity: v.optional(v.union(v.string(), v.null())),
    customState: v.optional(v.union(v.string(), v.null())),
    serviceStates: v.optional(v.union(v.array(v.string()), v.null())),
    remoteOption: v.boolean(),
    showSalary: v.boolean(),
    salaryType: v.optional(v.union(v.string(), v.null())),
    salaryMin: v.optional(v.union(v.number(), v.null())),
    salaryMax: v.optional(v.union(v.number(), v.null())),
    requirements: v.optional(v.union(v.string(), v.null())),
    benefits: v.array(v.string()),
    therapySettings: v.array(v.string()),
    scheduleTypes: v.array(v.string()),
    ageGroups: v.array(v.string()),
    status: v.union(v.literal("draft"), v.literal("published")),
    expiresAt: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspace, listing } = await requireCurrentWorkspaceContext(ctx as never);
    const jobs = await getWorkspaceJobPostings(ctx as never, workspace._id);
    const limit = await getEffectiveJobLimit(ctx as never, workspace);

    if (jobs.length >= limit) {
      const planTier = getEffectivePlanTier(workspace.planTier, workspace.subscriptionStatus);
      throw new ConvexError(
        planTier === "free"
          ? "Job posting is available on Pro only. Go Live to post real jobs."
          : `You've used ${jobs.length} of ${limit} job postings. Add more capacity from billing to post more jobs.`,
      );
    }

    const timestamp = new Date().toISOString();
    const slug = await findUniqueJobSlug(
      ctx as never,
      args.title,
      readString(workspace.agencyName) ?? "workspace",
    );

    const jobId = await ctx.db.insert("jobPostings", {
      workspaceId: asId<"workspaces">(workspace._id),
      listingId: listing?._id ? asId<"listings">(listing._id) : undefined,
      slug,
      status: args.status,
      metadata: {
        title: args.title,
        description: args.description,
        positionType: args.positionType,
        employmentTypes: args.employmentTypes,
        locationId: args.locationId ?? null,
        customCity: args.customCity ?? null,
        customState: args.customState ?? null,
        serviceStates: args.serviceStates ?? null,
        remoteOption: args.remoteOption,
        salaryType: args.showSalary ? args.salaryType ?? null : null,
        salaryMin: args.showSalary ? args.salaryMin ?? null : null,
        salaryMax: args.showSalary ? args.salaryMax ?? null : null,
        requirements: args.requirements ?? null,
        benefits: args.benefits,
        therapySettings: args.therapySettings,
        scheduleTypes: args.scheduleTypes,
        ageGroups: args.ageGroups,
        publishedAt: args.status === "published" ? timestamp : null,
        expiresAt: args.expiresAt ?? null,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      legacyTable: "job_postings",
    });

    return { id: jobId, slug };
  },
});

export const updateDashboardJobPosting = mutationGeneric({
  args: {
    id: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    positionType: v.optional(v.string()),
    employmentTypes: v.optional(v.array(v.string())),
    locationId: v.optional(v.union(v.string(), v.null())),
    customCity: v.optional(v.union(v.string(), v.null())),
    customState: v.optional(v.union(v.string(), v.null())),
    serviceStates: v.optional(v.union(v.array(v.string()), v.null())),
    remoteOption: v.optional(v.boolean()),
    showSalary: v.optional(v.boolean()),
    salaryType: v.optional(v.union(v.string(), v.null())),
    salaryMin: v.optional(v.union(v.number(), v.null())),
    salaryMax: v.optional(v.union(v.number(), v.null())),
    requirements: v.optional(v.union(v.string(), v.null())),
    benefits: v.optional(v.array(v.string())),
    therapySettings: v.optional(v.array(v.string())),
    scheduleTypes: v.optional(v.array(v.string())),
    ageGroups: v.optional(v.array(v.string())),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
    expiresAt: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspace } = await requireCurrentWorkspaceContext(ctx as never);
    const job = await ctx.db.get(asId<"jobPostings">(args.id));
    if (!job || job.workspaceId !== workspace._id) {
      throw new ConvexError("Job posting not found");
    }

    const metadata = asRecord(job.metadata);
    const nextStatus = args.status ?? (readString(job.status) ?? "draft");
    const timestamp = new Date().toISOString();

    await ctx.db.patch(asId<"jobPostings">(job._id), {
      status: nextStatus,
      metadata: {
        ...metadata,
        ...(args.title !== undefined ? { title: args.title } : {}),
        ...(args.description !== undefined ? { description: args.description } : {}),
        ...(args.positionType !== undefined ? { positionType: args.positionType } : {}),
        ...(args.employmentTypes !== undefined
          ? { employmentTypes: args.employmentTypes }
          : {}),
        ...(args.locationId !== undefined ? { locationId: args.locationId } : {}),
        ...(args.customCity !== undefined ? { customCity: args.customCity } : {}),
        ...(args.customState !== undefined ? { customState: args.customState } : {}),
        ...(args.serviceStates !== undefined
          ? { serviceStates: args.serviceStates }
          : {}),
        ...(args.remoteOption !== undefined ? { remoteOption: args.remoteOption } : {}),
        ...(args.requirements !== undefined ? { requirements: args.requirements } : {}),
        ...(args.benefits !== undefined ? { benefits: args.benefits } : {}),
        ...(args.therapySettings !== undefined
          ? { therapySettings: args.therapySettings }
          : {}),
        ...(args.scheduleTypes !== undefined
          ? { scheduleTypes: args.scheduleTypes }
          : {}),
        ...(args.ageGroups !== undefined ? { ageGroups: args.ageGroups } : {}),
        ...(args.expiresAt !== undefined ? { expiresAt: args.expiresAt } : {}),
        ...(args.showSalary !== undefined
          ? args.showSalary
            ? {
                salaryType: args.salaryType ?? null,
                salaryMin: args.salaryMin ?? null,
                salaryMax: args.salaryMax ?? null,
              }
            : {
                salaryType: null,
                salaryMin: null,
                salaryMax: null,
              }
          : {}),
        ...(nextStatus === "published" && !readString(metadata.publishedAt)
          ? { publishedAt: timestamp }
          : {}),
      },
      updatedAt: timestamp,
    });

    return { success: true };
  },
});

export const updateDashboardJobStatus = mutationGeneric({
  args: {
    id: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("filled"),
      v.literal("closed"),
    ),
  },
  handler: async (ctx, args) => {
    const { workspace } = await requireCurrentWorkspaceContext(ctx as never);
    const job = await ctx.db.get(asId<"jobPostings">(args.id));
    if (!job || job.workspaceId !== workspace._id) {
      throw new ConvexError("Job posting not found");
    }

    const metadata = asRecord(job.metadata);
    const timestamp = new Date().toISOString();

    await ctx.db.patch(asId<"jobPostings">(job._id), {
      status: args.status,
      metadata: {
        ...metadata,
        publishedAt:
          args.status === "published"
            ? readString(metadata.publishedAt) ?? timestamp
            : metadata.publishedAt ?? null,
      },
      updatedAt: timestamp,
    });

    return { success: true };
  },
});

export const deleteDashboardJobPosting = mutationGeneric({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspace } = await requireCurrentWorkspaceContext(ctx as never);
    const job = await ctx.db.get(asId<"jobPostings">(args.id));
    if (!job || job.workspaceId !== workspace._id) {
      throw new ConvexError("Job posting not found");
    }

    const applications = await getJobApplicationsForJob(ctx as never, job._id);
    for (const application of applications) {
      await deleteResumeFileIfPresent(ctx as never, application._id);
      await ctx.db.delete(asId<"jobApplications">(application._id));
    }

    await ctx.db.delete(asId<"jobPostings">(job._id));
    return { success: true };
  },
});

export const generateResumeUploadUrl = mutationGeneric({
  args: {},
  returns: v.string(),
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

export const discardResumeUpload = mutationGeneric({
  args: {
    storageId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.storage.delete(asId<"_storage">(args.storageId));
    return { success: true };
  },
});

export const submitApplication = mutationGeneric({
  args: {
    jobPostingId: v.string(),
    applicantName: v.string(),
    applicantEmail: v.string(),
    applicantPhone: v.optional(v.union(v.string(), v.null())),
    coverLetter: v.optional(v.union(v.string(), v.null())),
    linkedinUrl: v.optional(v.union(v.string(), v.null())),
    source: v.optional(v.union(v.string(), v.null())),
    resume: v.optional(
      v.object({
        storageId: v.string(),
        filename: v.string(),
        mimeType: v.string(),
        byteSize: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const job = await ctx.db.get(asId<"jobPostings">(args.jobPostingId));
    if (!job || job.status !== "published") {
      throw new ConvexError("Job posting not found or no longer accepting applications");
    }

    const workspace = await ctx.db.get(asId<"workspaces">(job.workspaceId));
    if (!workspace) {
      throw new ConvexError("Job posting not found or no longer accepting applications");
    }

    const existing = await getJobApplicationsForJob(ctx as never, job._id);
    const normalizedEmail = normalizeEmail(args.applicantEmail);
    if (
      existing.some(
        (application) =>
          normalizeEmail(String(application.applicantEmail ?? "")) === normalizedEmail,
      )
    ) {
      throw new ConvexError("You have already applied to this position");
    }

    const timestamp = new Date().toISOString();
    const applicationId = await ctx.db.insert("jobApplications", {
      workspaceId: asId<"workspaces">(job.workspaceId),
      jobPostingId: asId<"jobPostings">(job._id),
      applicantEmail: normalizedEmail,
      status: "new",
      metadata: {
        applicantName: args.applicantName,
        applicantPhone: args.applicantPhone ?? null,
        coverLetter: args.coverLetter ?? null,
        linkedinUrl: args.linkedinUrl ?? null,
        source: args.source ?? "direct",
        rating: null,
        notes: null,
        reviewedAt: null,
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      legacyTable: "job_applications",
    });

    if (args.resume) {
      const storageDoc = await ctx.db.system.get(
        "_storage",
        asId<"_storage">(args.resume.storageId),
      );

      await ctx.db.insert("files", {
        workspaceId: asId<"workspaces">(job.workspaceId),
        storageId: asId<"_storage">(args.resume.storageId),
        bucket: "job-resumes",
        storageKey: `applications/${applicationId}/${args.resume.filename}`,
        filename: args.resume.filename,
        mimeType:
          readString(storageDoc?.contentType) ?? args.resume.mimeType,
        byteSize:
          typeof storageDoc?.size === "number"
            ? storageDoc.size
            : args.resume.byteSize,
        visibility: "private",
        relatedTable: "jobApplications",
        relatedId: applicationId,
        metadata: { kind: "resume" },
        createdAt: timestamp,
        updatedAt: timestamp,
        legacyTable: "job-resumes",
      });
    }

    await ctx.db.insert("notificationRecords", {
      workspaceId: asId<"workspaces">(job.workspaceId),
      notificationType: "job_application",
      status: "unread",
      payload: {
        title: `New application from ${args.applicantName}`,
        body: `Applied for ${readString(asRecord(job.metadata).title) ?? "job"}`,
        link: "/dashboard/team/applicants",
        entityId: applicationId,
        entityType: "job_application",
      },
      createdAt: timestamp,
      updatedAt: timestamp,
      legacyTable: "notifications",
    });

    return {
      applicationId,
      jobTitle: readString(asRecord(job.metadata).title) ?? "Job",
      jobSlug: readString(job.slug) ?? "",
      providerName: readString(workspace.agencyName) ?? "GoodABA",
      providerEmail: readString(workspace.contactEmail) ?? "",
      workspaceId: workspace._id,
      hasResume: Boolean(args.resume),
    };
  },
});

export const getWorkspaceApplications = queryGeneric({
  args: {
    status: v.optional(v.string()),
    jobId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { workspace } = await requireCurrentWorkspaceContext(ctx as never);
    const jobs = await getWorkspaceJobPostings(ctx as never, workspace._id);
    if (jobs.length === 0) {
      return { applications: [], newCount: 0 };
    }

    const applications = (
      await Promise.all(jobs.map((job) => getJobApplicationsForJob(ctx as never, job._id)))
    )
      .flat()
      .filter((application) => !args.status || application.status === args.status)
      .filter((application) => !args.jobId || application.jobPostingId === args.jobId)
      .sort(
        (left, right) =>
          new Date(readString(right.createdAt) ?? 0).getTime() -
          new Date(readString(left.createdAt) ?? 0).getTime(),
      );

    const jobById = new Map(jobs.map((job) => [job._id, job]));

    return {
      applications: applications.map((application) => {
        const job = jobById.get(String(application.jobPostingId));
        return {
          id: application._id,
          applicantName:
            readString(asRecord(application.metadata).applicantName) ?? "",
          applicantEmail: String(application.applicantEmail ?? ""),
          status: readString(application.status) ?? "new",
          rating:
            typeof asRecord(application.metadata).rating === "number"
              ? asRecord(application.metadata).rating
              : null,
          createdAt: readString(application.createdAt) ?? new Date().toISOString(),
          job: {
            id: job?._id ?? String(application.jobPostingId),
            title: readString(asRecord(job?.metadata).title) ?? "",
          },
        };
      }),
      newCount: applications.filter((application) => application.status === "new").length,
    };
  },
});

export const getWorkspaceApplication = queryGeneric({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspace } = await requireCurrentWorkspaceContext(ctx as never);
    const application = await ctx.db.get(asId<"jobApplications">(args.id));
    if (!application || application.workspaceId !== workspace._id) {
      return null;
    }

    const job = application.jobPostingId
      ? await ctx.db.get(asId<"jobPostings">(application.jobPostingId))
      : null;
    if (!job || job.workspaceId !== workspace._id) {
      return null;
    }

    const resume = await getApplicationResumeFile(ctx as never, application._id);
    const metadata = asRecord(application.metadata);
    const jobMetadata = asRecord(job.metadata);

    return {
      id: application._id,
      jobPostingId: String(application.jobPostingId),
      applicantName: readString(metadata.applicantName) ?? "",
      applicantEmail: String(application.applicantEmail ?? ""),
      applicantPhone: readString(metadata.applicantPhone),
      resumePath: resume ? resume._id : null,
      coverLetter: readString(metadata.coverLetter),
      linkedinUrl: readString(metadata.linkedinUrl),
      status: readString(application.status) ?? "new",
      rating:
        typeof metadata.rating === "number" ? metadata.rating : null,
      notes: readString(metadata.notes),
      source: readString(metadata.source),
      reviewedAt: readString(metadata.reviewedAt),
      createdAt: readString(application.createdAt) ?? new Date().toISOString(),
      job: {
        id: job._id,
        title: readString(jobMetadata.title) ?? "",
        slug: readString(job.slug) ?? "",
        positionType: readString(jobMetadata.positionType) ?? "other",
      },
    };
  },
});

export const updateWorkspaceApplicationStatus = mutationGeneric({
  args: {
    id: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspace } = await requireCurrentWorkspaceContext(ctx as never);
    const application = await ctx.db.get(asId<"jobApplications">(args.id));
    if (!application || application.workspaceId !== workspace._id) {
      throw new ConvexError("Application not found");
    }

    const metadata = asRecord(application.metadata);
    await ctx.db.patch(asId<"jobApplications">(application._id), {
      status: args.status,
      metadata: {
        ...metadata,
        reviewedAt:
          application.status === "new" && args.status !== "new"
            ? new Date().toISOString()
            : metadata.reviewedAt ?? null,
      },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const updateWorkspaceApplicationDetails = mutationGeneric({
  args: {
    id: v.string(),
    notes: v.optional(v.union(v.string(), v.null())),
    rating: v.optional(v.union(v.number(), v.null())),
  },
  handler: async (ctx, args) => {
    const { workspace } = await requireCurrentWorkspaceContext(ctx as never);
    const application = await ctx.db.get(asId<"jobApplications">(args.id));
    if (!application || application.workspaceId !== workspace._id) {
      throw new ConvexError("Application not found");
    }

    const metadata = asRecord(application.metadata);
    await ctx.db.patch(asId<"jobApplications">(application._id), {
      metadata: {
        ...metadata,
        ...(args.notes !== undefined ? { notes: args.notes } : {}),
        ...(args.rating !== undefined ? { rating: args.rating } : {}),
      },
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  },
});

export const getWorkspaceApplicationResumeUrl = queryGeneric({
  args: {
    applicationId: v.string(),
  },
  handler: async (ctx, args) => {
    const { workspace } = await requireCurrentWorkspaceContext(ctx as never);
    const application = await ctx.db.get(asId<"jobApplications">(args.applicationId));
    if (!application || application.workspaceId !== workspace._id) {
      throw new ConvexError("Application not found");
    }

    const file = await getApplicationResumeFile(ctx as never, application._id);
    if (!file || typeof file.storageId !== "string") {
      throw new ConvexError("No resume attached to this application");
    }

    const url = await ctx.storage.getUrl(asId<"_storage">(file.storageId));
    if (!url) {
      throw new ConvexError("Failed to generate resume download link");
    }

    return { url };
  },
});

export const getNewWorkspaceApplicationCount = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const { workspace } = await requireCurrentWorkspaceContext(ctx as never);
    const jobs = await getWorkspaceJobPostings(ctx as never, workspace._id);

    const applications = await Promise.all(
      jobs.map((job) => getJobApplicationsForJob(ctx as never, job._id)),
    );

    return applications
      .flat()
      .filter((application) => application.status === "new").length;
  },
});

export const getPublicJobBySlug = queryGeneric({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const jobs = await getPublicJobSearchDataset(ctx as never);
    const job = jobs.find((entry) => entry.slug === args.slug) ?? null;
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      slug: job.slug,
      title: job.title,
      description: job.description,
      positionType: job.positionType,
      employmentTypes: job.employmentTypes,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryType: job.salaryType,
      remoteOption: job.remoteOption,
      requirements: job.requirements,
      benefits: job.benefits,
      publishedAt: job.publishedAt,
      expiresAt: job.expiresAt,
      provider: job.provider,
      location: job.location
        ? {
            city: job.location.city,
            state: job.location.state,
            lat: job.location.lat,
            lng: job.location.lng,
          }
        : null,
    };
  },
});

export const getPublicJobs = queryGeneric({
  args: {},
  handler: async (ctx) => getPublicJobSearchDataset(ctx as never),
});

export const getPublicJobsByProvider = queryGeneric({
  args: {
    providerSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const jobs = await getPublicJobSearchDataset(ctx as never);
    return jobs.filter((job) => job.provider.slug === args.providerSlug);
  },
});

export const getPublicEmployers = queryGeneric({
  args: {
    hiringOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) =>
    getPublicEmployersDataset(ctx as never, args.hiringOnly ?? false),
});

export const getPublicEmployerCount = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const employers = await getPublicEmployersDataset(ctx as never, true);
    return employers.length;
  },
});
