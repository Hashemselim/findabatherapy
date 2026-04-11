"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/platform/auth/server";
import { mutateConvex, queryConvex } from "@/lib/platform/convex/server";
import { getCurrentWorkspace } from "@/lib/platform/workspace/server";
import { isDevOnboardingPreviewEnabled } from "@/lib/onboarding-preview";
import type {
  CompanyBasics,
  CompanyDetails,
  LocationData,
  LocationWithServicesData,
  ServicesData,
} from "@/lib/validations/onboarding";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export type OnboardingIntent = "therapy" | "jobs" | "both";

function unauthenticatedResult<T = void>(data?: T): ActionResult<T> {
  if (isDevOnboardingPreviewEnabled()) {
    return data === undefined ? { success: true } : { success: true, data };
  }
  return { success: false, error: "Not authenticated" };
}

function normalizeOnboardingIntent(value: unknown): OnboardingIntent {
  if (value === "therapy" || value === "jobs" || value === "both") {
    return value;
  }
  if (value === "context_jobs" || value === "jobs_only") {
    return "jobs";
  }
  return "both";
}

async function ensureCurrentWorkspace(
  fallback?: {
    agencyName?: string;
    contactEmail?: string;
    primaryIntent?: OnboardingIntent;
  },
): Promise<ActionResult<{ profileId: string }>> {
  const existing = await getCurrentWorkspace();
  if (existing?.workspace.id) {
    return { success: true, data: { profileId: existing.workspace.id } };
  }

  const user = await getCurrentUser();
  if (!user?.id || !user.email) {
    return unauthenticatedResult();
  }

  const agencyName =
    fallback?.agencyName?.trim() ||
    user.firstName?.trim() ||
    user.email.split("@")[0] ||
    "My Agency";
  const contactEmail = (fallback?.contactEmail || user.email).trim().toLowerCase();

  const workspace = await mutateConvex<{
    profile: { id: string };
  }>("workspaces:createWorkspaceForCurrentUser", {
    email: contactEmail,
    agencyName,
    planTier: "free",
    billingInterval: "month",
    primaryIntent: fallback?.primaryIntent || "both",
  });

  return { success: true, data: { profileId: workspace.profile.id } };
}

async function getDashboardListing() {
  return queryConvex<{
    id: string;
    slug: string;
    headline: string | null;
    description: string | null;
    summary: string | null;
    serviceModes: string[];
    status: "draft" | "published" | "suspended";
    isAcceptingClients: boolean;
    logoUrl: string | null;
    videoUrl: string | null;
    locations: Array<{
      id: string;
      street: string | null;
      city: string;
      state: string;
      postalCode: string | null;
      serviceRadiusMiles: number;
      latitude: number | null;
      longitude: number | null;
      serviceTypes: ("in_home" | "in_center" | "telehealth" | "school_based")[];
      insurances: string[];
      isAcceptingClients?: boolean;
      isPrimary?: boolean;
      label?: string | null;
    }>;
    attributes: Record<string, unknown>;
  } | null>("listings:getDashboardListing");
}

async function upsertPrimaryLocation(
  data: {
    label?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
    serviceRadiusMiles?: number;
    serviceTypes?: ("in_home" | "in_center" | "telehealth" | "school_based")[];
    insurances?: string[];
    isAcceptingClients?: boolean;
  },
): Promise<void> {
  const listing = await getDashboardListing();
  const primary = listing?.locations.find((location) => location.isPrimary) || listing?.locations[0] || null;
  const city = data.city ?? primary?.city;
  const state = data.state ?? primary?.state;

  if (!city || !state) {
    throw new Error("Location not found. Please complete previous steps.");
  }

  const args = {
    label: data.label ?? primary?.label ?? "Primary Location",
    street: data.street ?? primary?.street ?? undefined,
    city,
    state,
    postalCode: data.postalCode ?? primary?.postalCode ?? undefined,
    latitude: data.latitude ?? primary?.latitude ?? undefined,
    longitude: data.longitude ?? primary?.longitude ?? undefined,
    serviceRadiusMiles: data.serviceRadiusMiles ?? primary?.serviceRadiusMiles ?? 25,
    serviceTypes: data.serviceTypes ?? primary?.serviceTypes ?? ["in_home", "in_center"],
    insurances: data.insurances ?? primary?.insurances ?? [],
    isAcceptingClients:
      data.isAcceptingClients ?? primary?.isAcceptingClients ?? true,
  };

  if (primary?.id) {
    await mutateConvex("locations:updateLocation", {
      locationId: primary.id,
      ...args,
    });
    return;
  }

  await mutateConvex("locations:addLocation", args);
}

export async function updateProfileBasics(
  data: CompanyBasics,
): Promise<ActionResult<{ slug: string | null }>> {
  try {
    await ensureCurrentWorkspace({
      agencyName: data.agencyName,
      contactEmail: data.contactEmail,
    });
    await mutateConvex("listings:updateCompanyContact", {
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone || null,
      website: data.website || null,
    });
    const agencyResult = await mutateConvex<{ newSlug: string }>(
      "listings:updateAgencyName",
      { agencyName: data.agencyName },
    );
    revalidatePath("/dashboard");
    return { success: true, data: { slug: agencyResult.newSlug } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update profile basics",
    };
  }
}

export async function updateProfilePlan(
  _plan: "free" | "pro",
): Promise<ActionResult> {
  return { success: true };
}

export async function updateProfileIntent(intent: OnboardingIntent): Promise<ActionResult> {
  try {
    await ensureCurrentWorkspace({ primaryIntent: intent });
    await mutateConvex("workspaces:setCurrentWorkspacePrimaryIntentIfMissing", {
      intent,
    });
    revalidatePath("/dashboard/onboarding");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update intent",
    };
  }
}

export async function updateListingDetails(
  data: CompanyDetails & { contactPhone?: string; website?: string; servicesOffered?: string[] },
): Promise<ActionResult<{ listingId: string }>> {
  try {
    await ensureCurrentWorkspace();
    await mutateConvex("listings:updateDashboardListing", {
      headline: data.headline,
      description: data.description,
      serviceModes: data.serviceModes,
    });
    if (data.servicesOffered) {
      await mutateConvex("listings:updateListingAttributes", {
        servicesOffered: data.servicesOffered,
      });
    }
    const listing = await getDashboardListing();
    return { success: true, data: { listingId: listing?.id || "convex" } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update listing details",
    };
  }
}

export async function updateListingLocation(
  data: LocationData,
): Promise<ActionResult> {
  try {
    await ensureCurrentWorkspace();
    await upsertPrimaryLocation({
      street: data.street || undefined,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode || undefined,
      latitude: data.latitude || undefined,
      longitude: data.longitude || undefined,
      serviceRadiusMiles: data.serviceRadiusMiles,
      serviceTypes: ["in_home", "in_center"],
      insurances: [],
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update location",
    };
  }
}

export async function updateListingLocationWithServices(
  data: LocationWithServicesData,
): Promise<ActionResult> {
  try {
    await ensureCurrentWorkspace();
    await upsertPrimaryLocation({
      label: data.label || "Primary Location",
      street: data.street || undefined,
      city: data.city,
      state: data.state,
      postalCode: data.postalCode || undefined,
      latitude: data.latitude || undefined,
      longitude: data.longitude || undefined,
      serviceRadiusMiles: data.serviceRadiusMiles,
      serviceTypes: data.serviceTypes,
      insurances: data.insurances,
      isAcceptingClients: data.isAcceptingClients ?? true,
    });
    await mutateConvex("listings:updateListingAttributes", {
      isAcceptingClients: data.isAcceptingClients ?? true,
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to update location with services",
    };
  }
}

export async function updateBasicAttributes(
  data: { insurances: string[]; isAcceptingClients?: boolean },
): Promise<ActionResult> {
  try {
    await ensureCurrentWorkspace();
    await mutateConvex("listings:updateListingAttributes", {
      insurances: data.insurances,
      isAcceptingClients: data.isAcceptingClients,
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update basic attributes",
    };
  }
}

export async function updateListingAttributes(
  data: ServicesData,
): Promise<ActionResult> {
  try {
    await ensureCurrentWorkspace();
    await mutateConvex("listings:updateListingAttributes", {
      isAcceptingClients: data.isAcceptingClients,
      languages: data.languages,
      diagnoses: data.diagnoses,
      clinicalSpecialties: data.clinicalSpecialties,
      agesServedMin: data.agesServedMin,
      agesServedMax: data.agesServedMax,
    });
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update listing attributes",
    };
  }
}

export async function completeOnboarding(
  publish = false,
): Promise<ActionResult<{ redirectTo: string }>> {
  try {
    const ws = await mutateConvex<{
      success: boolean;
      planTier: string | null;
      billingInterval: string | null;
    }>("workspaces:completeCurrentWorkspaceOnboarding", { publish });
    let redirectTo = "/dashboard/clients/pipeline";
    if (ws.planTier === "pro") {
      const interval =
        ws.billingInterval === "annual" || ws.billingInterval === "year"
          ? "year"
          : "month";
      redirectTo = `/dashboard/billing/checkout?plan=pro&interval=${interval}`;
    }
    revalidatePath("/dashboard");
    return { success: true, data: { redirectTo } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to complete onboarding",
    };
  }
}

export async function finalizeOnboardingAsFree(): Promise<
  ActionResult<{ redirectTo: string }>
> {
  return completeOnboarding(true);
}

export async function finalizeOnboardingAfterPayment(): Promise<
  ActionResult<{ redirectTo: string }>
> {
  return completeOnboarding(true);
}

export async function updatePremiumAttributes(data: {
  agesServedMin?: number;
  agesServedMax?: number;
  languages?: string[];
  diagnoses?: string[];
  clinicalSpecialties?: string[];
  videoUrl?: string;
  contactFormEnabled?: boolean;
}): Promise<ActionResult> {
  try {
    await ensureCurrentWorkspace();
    if (data.videoUrl !== undefined) {
      await mutateConvex("files:updateListingVideoUrl", {
        videoUrl: data.videoUrl || null,
      });
    }
    if (data.contactFormEnabled !== undefined) {
      await mutateConvex("listings:updateContactFormEnabled", {
        enabled: data.contactFormEnabled,
      });
    }
    const attributeArgs: Record<string, unknown> = {};
    if (data.agesServedMin !== undefined) attributeArgs.agesServedMin = data.agesServedMin;
    if (data.agesServedMax !== undefined) attributeArgs.agesServedMax = data.agesServedMax;
    if (data.languages !== undefined) attributeArgs.languages = data.languages;
    if (data.diagnoses !== undefined) attributeArgs.diagnoses = data.diagnoses;
    if (data.clinicalSpecialties !== undefined) {
      attributeArgs.clinicalSpecialties = data.clinicalSpecialties;
    }
    if (Object.keys(attributeArgs).length > 0) {
      await mutateConvex("listings:updateListingAttributes", attributeArgs);
    }
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update premium attributes",
    };
  }
}

export async function getOnboardingData(): Promise<
  ActionResult<{
    profile: {
      agencyName: string;
      contactEmail: string;
      contactPhone: string | null;
      website: string | null;
      brandColor: string;
      showPoweredBy: boolean;
      planTier: string;
      billingInterval: string;
      primaryIntent: OnboardingIntent;
    } | null;
    listing: {
      id: string;
      slug: string;
      headline: string | null;
      description: string | null;
      serviceModes: string[];
      isAcceptingClients: boolean;
      videoUrl: string | null;
      logoUrl: string | null;
    } | null;
    location: {
      street: string | null;
      city: string;
      state: string;
      postalCode: string | null;
      serviceRadiusMiles: number;
      latitude: number | null;
      longitude: number | null;
      serviceTypes: ("in_home" | "in_center" | "telehealth" | "school_based")[];
      insurances: string[];
      isAcceptingClients: boolean;
    } | null;
    attributes: Record<string, unknown>;
  }>
> {
  try {
    const workspaceData = await queryConvex<{
      membership: { id: string } | null;
      workspace: {
        agencyName: string | null;
        contactEmail: string | null;
        planTier: string | null;
        billingInterval: string | null;
        primaryIntent: string | null;
      };
    } | null>("workspaces:getCurrentWorkspace");

    if (!workspaceData) {
      return unauthenticatedResult({
        profile: null,
        listing: null,
        location: null,
        attributes: {},
      });
    }

    const listingData = await getDashboardListing();
    const primaryLocation =
      listingData?.locations.find((location) => location.isPrimary) ||
      listingData?.locations[0] ||
      null;

    return {
      success: true,
      data: {
        profile: {
          agencyName: workspaceData.workspace.agencyName || "",
          contactEmail: workspaceData.workspace.contactEmail || "",
          contactPhone: null,
          website: null,
          brandColor: "#0866FF",
          showPoweredBy: true,
          planTier: workspaceData.workspace.planTier || "free",
          billingInterval: workspaceData.workspace.billingInterval || "month",
          primaryIntent: normalizeOnboardingIntent(
            workspaceData.workspace.primaryIntent,
          ),
        },
        listing: listingData
          ? {
              id: listingData.id,
              slug: listingData.slug,
              headline: listingData.headline,
              description: listingData.description,
              serviceModes: listingData.serviceModes || [],
              isAcceptingClients: listingData.isAcceptingClients,
              videoUrl: listingData.videoUrl,
              logoUrl: listingData.logoUrl,
            }
          : null,
        location: primaryLocation
          ? {
              street: primaryLocation.street,
              city: primaryLocation.city,
              state: primaryLocation.state,
              postalCode: primaryLocation.postalCode,
              serviceRadiusMiles: primaryLocation.serviceRadiusMiles || 25,
              latitude: primaryLocation.latitude,
              longitude: primaryLocation.longitude,
              serviceTypes: primaryLocation.serviceTypes || ["in_home", "in_center"],
              insurances: primaryLocation.insurances || [],
              isAcceptingClients: primaryLocation.isAcceptingClients ?? true,
            }
          : null,
        attributes: listingData?.attributes ?? {},
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load onboarding data",
    };
  }
}

export async function saveOnboardingDraft(data: {
  agencyName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  headline?: string;
  description?: string;
  serviceModes?: string[];
  city?: string;
  state?: string;
  serviceRadiusMiles?: number;
  insurances?: string[];
  agesServedMin?: number;
  agesServedMax?: number;
  languages?: string[];
  diagnoses?: string[];
  clinicalSpecialties?: string[];
  videoUrl?: string;
  contactFormEnabled?: boolean;
}): Promise<ActionResult> {
  try {
    await ensureCurrentWorkspace({
      agencyName: data.agencyName,
      contactEmail: data.contactEmail,
    });

    const hasContactFields =
      data.contactEmail !== undefined ||
      data.contactPhone !== undefined ||
      data.website !== undefined;
    if (hasContactFields) {
      const contactArgs: Record<string, unknown> = {};
      if (data.contactEmail !== undefined) contactArgs.contactEmail = data.contactEmail;
      if (data.contactPhone !== undefined) contactArgs.contactPhone = data.contactPhone || null;
      if (data.website !== undefined) contactArgs.website = data.website || null;
      await mutateConvex("listings:updateCompanyContact", contactArgs);
    }

    if (data.agencyName !== undefined) {
      await mutateConvex("listings:updateAgencyName", { agencyName: data.agencyName });
    }

    const hasListingFields =
      data.headline !== undefined ||
      data.description !== undefined ||
      data.serviceModes !== undefined;
    if (hasListingFields) {
      const listingArgs: Record<string, unknown> = {};
      if (data.headline !== undefined) listingArgs.headline = data.headline;
      if (data.description !== undefined) listingArgs.description = data.description;
      if (data.serviceModes !== undefined) listingArgs.serviceModes = data.serviceModes;
      await mutateConvex("listings:updateDashboardListing", listingArgs);
    }

    const hasLocationFields =
      data.city !== undefined ||
      data.state !== undefined ||
      data.serviceRadiusMiles !== undefined;
    if (hasLocationFields) {
      await upsertPrimaryLocation({
        city: data.city,
        state: data.state,
        serviceRadiusMiles: data.serviceRadiusMiles,
      });
    }

    const attributeArgs: Record<string, unknown> = {};
    if (data.insurances !== undefined) attributeArgs.insurances = data.insurances;
    if (data.agesServedMin !== undefined) attributeArgs.agesServedMin = data.agesServedMin;
    if (data.agesServedMax !== undefined) attributeArgs.agesServedMax = data.agesServedMax;
    if (data.languages !== undefined) attributeArgs.languages = data.languages;
    if (data.diagnoses !== undefined) attributeArgs.diagnoses = data.diagnoses;
    if (data.clinicalSpecialties !== undefined) {
      attributeArgs.clinicalSpecialties = data.clinicalSpecialties;
    }
    if (Object.keys(attributeArgs).length > 0) {
      await mutateConvex("listings:updateListingAttributes", attributeArgs);
    }

    if (data.videoUrl !== undefined) {
      await mutateConvex("files:updateListingVideoUrl", {
        videoUrl: data.videoUrl || null,
      });
    }

    if (data.contactFormEnabled !== undefined) {
      await mutateConvex("listings:updateContactFormEnabled", {
        enabled: data.contactFormEnabled,
      });
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save onboarding draft",
    };
  }
}
