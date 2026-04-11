"use server";

import { headers } from "next/headers";

import type { ListingWithRelations } from "@/lib/actions/listings";
import {
  type IntakeFieldsConfig,
  mergeWithDefaults,
} from "@/lib/intake/field-registry";
import {
  buildIntakeAccessPath,
  clearIntakeAccessToken,
  getIntakeAccessToken,
} from "@/lib/public-access";
import { getCurrentProfileId as getPlatformProfileId } from "@/lib/platform/workspace/server";
import { getRequestOrigin } from "@/lib/utils/domains";

export interface IntakeFormSettings {
  background_color: string;
  show_powered_by: boolean;
  fields?: IntakeFieldsConfig;
}

export interface ContactPageData {
  listing: {
    id: string;
    slug: string;
    logoUrl: string | null;
    contactFormEnabled: boolean;
  };
  profile: {
    agencyName: string;
    website: string | null;
    planTier: string;
    subscriptionStatus: string | null;
    intakeFormSettings: IntakeFormSettings;
  };
}

export type IntakePageData = ContactPageData;

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

function isActiveSubscription(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

function buildIntakeSettings(
  settings: Partial<IntakeFormSettings> | null | undefined,
): IntakeFormSettings {
  return {
    background_color: settings?.background_color || "#0866FF",
    show_powered_by: settings?.show_powered_by ?? true,
    ...(settings?.fields ? { fields: settings.fields } : {}),
  };
}

async function getOwnerPreviewListing(
  slug: string,
): Promise<ListingWithRelations | null> {
  const { getListing } = await import("@/lib/actions/listings");
  const result = await getListing();
  if (!result.success || !result.data || result.data.slug !== slug) {
    return null;
  }
  return result.data;
}

function mapListingToContactPageData(
  listing: ListingWithRelations,
): ContactPageData {
  const premium =
    listing.profile.planTier !== "free" &&
    isActiveSubscription(listing.profile.subscriptionStatus);

  return {
    listing: {
      id: listing.id,
      slug: listing.slug,
      logoUrl: listing.logoUrl,
      contactFormEnabled:
        premium && listing.attributes.contact_form_enabled !== false,
    },
    profile: {
      agencyName: listing.profile.agencyName,
      website: listing.profile.website,
      planTier: listing.profile.planTier,
      subscriptionStatus: listing.profile.subscriptionStatus,
      intakeFormSettings: buildIntakeSettings(listing.profile.intakeFormSettings),
    },
  };
}

async function mapListingToClientIntakePageData(
  listing: ListingWithRelations,
): Promise<ClientIntakePageData> {
  const premium =
    listing.profile.planTier !== "free" &&
    isActiveSubscription(listing.profile.subscriptionStatus);

  return {
    listing: {
      id: listing.id,
      slug: listing.slug,
      logoUrl: listing.logoUrl,
      clientIntakeEnabled:
        premium && listing.attributes.client_intake_enabled !== false,
      profileId: (await getPlatformProfileId()) ?? "preview",
    },
    profile: {
      agencyName: listing.profile.agencyName,
      website: listing.profile.website,
      planTier: listing.profile.planTier,
      subscriptionStatus: listing.profile.subscriptionStatus,
      intakeFormSettings: buildIntakeSettings(listing.profile.intakeFormSettings),
    },
  };
}

function mapListingToClientResourcesPageData(
  listing: ListingWithRelations,
): ClientResourcesPageData {
  return {
    listing: {
      id: listing.id,
      slug: listing.slug,
      logoUrl: listing.logoUrl,
    },
    profile: {
      agencyName: listing.profile.agencyName,
      website: listing.profile.website,
      planTier: listing.profile.planTier,
      subscriptionStatus: listing.profile.subscriptionStatus,
      intakeFormSettings: buildIntakeSettings(listing.profile.intakeFormSettings),
    },
  };
}

export async function getContactPageData(
  slug: string,
): Promise<ActionResult<ContactPageData>> {
  try {
    const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    const result = await queryConvexUnauthenticated<ListingWithRelations | null>(
      "listings:getPublicListingBySlug",
      { slug },
    );
    if (result) {
      return { success: true, data: mapListingToContactPageData(result) };
    }
  } catch (error) {
    console.error("Convex error:", error);
  }

  const previewListing = await getOwnerPreviewListing(slug);
  if (previewListing) {
    return { success: true, data: mapListingToContactPageData(previewListing) };
  }

  return { success: false, error: "Provider not found" };
}

export const getIntakePageData = getContactPageData;

export interface ClientIntakePageData {
  listing: {
    id: string;
    slug: string;
    logoUrl: string | null;
    clientIntakeEnabled: boolean;
    profileId: string;
  };
  profile: {
    agencyName: string;
    website: string | null;
    planTier: string;
    subscriptionStatus: string | null;
    intakeFormSettings: IntakeFormSettings;
  };
}

export interface ClientResourcesPageData {
  listing: {
    id: string;
    slug: string;
    logoUrl: string | null;
  };
  profile: {
    agencyName: string;
    website: string | null;
    planTier: string;
    subscriptionStatus: string | null;
    intakeFormSettings: IntakeFormSettings;
  };
}

export async function getClientIntakePageData(
  slug: string,
): Promise<ActionResult<ClientIntakePageData>> {
  try {
    const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    const result = await queryConvexUnauthenticated<ClientIntakePageData | null>(
      "intake:getClientIntakePageData",
      { slug },
    );
    if (result) {
      return { success: true, data: result };
    }
  } catch (error) {
    console.error("Convex error:", error);
  }

  const previewListing = await getOwnerPreviewListing(slug);
  if (previewListing) {
    return {
      success: true,
      data: await mapListingToClientIntakePageData(previewListing),
    };
  }

  return { success: false, error: "Provider not found" };
}

export async function getClientResourcesPageData(
  slug: string,
): Promise<ActionResult<ClientResourcesPageData>> {
  try {
    const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    const result = await queryConvexUnauthenticated<ClientResourcesPageData | null>(
      "intake:getClientResourcesPageData",
      { slug },
    );
    if (result) {
      return { success: true, data: result };
    }
  } catch (error) {
    console.error("Convex error:", error);
  }

  const previewListing = await getOwnerPreviewListing(slug);
  if (previewListing) {
    return {
      success: true,
      data: mapListingToClientResourcesPageData(previewListing),
    };
  }

  return { success: false, error: "Provider not found" };
}

export async function updateIntakeFormSettings(
  settings: Partial<IntakeFormSettings>,
): Promise<ActionResult> {
  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    await mutateConvex("intake:updateIntakeFormSettings", { settings });
    return { success: true };
  } catch (error) {
    console.error("Convex error:", error);
    return { success: false, error: "Failed to update settings" };
  }
}

export async function updateIntakeFieldsConfig(
  fieldsConfig: IntakeFieldsConfig,
): Promise<ActionResult> {
  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    await mutateConvex("intake:updateIntakeFieldsConfig", { fieldsConfig });
    return { success: true };
  } catch (error) {
    console.error("Convex error:", error);
    return { success: false, error: "Failed to save field configuration" };
  }
}

export async function getIntakeFieldsConfig(
  profileId: string,
): Promise<IntakeFieldsConfig> {
  void profileId;
  try {
    const { queryConvex } = await import("@/lib/platform/convex/server");
    const result = await queryConvex<{
      fields?: IntakeFieldsConfig | null;
    }>("intake:getIntakeFieldsConfig", {});
    return mergeWithDefaults(result.fields ?? undefined);
  } catch (error) {
    console.error("Convex error:", error);
    return mergeWithDefaults(undefined);
  }
}

export interface PrefillData {
  clientName: string;
  fields: Record<string, unknown>;
}

export async function createIntakeToken(
  clientId: string,
): Promise<ActionResult<{ url: string; token: string }>> {
  try {
    const { mutateConvex } = await import("@/lib/platform/convex/server");
    const result = await mutateConvex<{ url: string; token: string }>(
      "intake:createIntakeToken",
      { clientId },
    );
    const headersList = await headers();
    const siteUrl = getRequestOrigin(headersList);
    const rawUrl = new URL(result.url);
    const slug = rawUrl.pathname.split("/")[2];
    return {
      success: true,
      data: {
        token: result.token,
        url: slug
          ? `${siteUrl}${buildIntakeAccessPath(slug)}?token=${result.token}`
          : result.url,
      },
    };
  } catch (error) {
    console.error("Convex error:", error);
    return { success: false, error: "Failed to create intake token" };
  }
}

export async function getIntakeTokenData(
  token: string,
): Promise<ActionResult<PrefillData>> {
  try {
    const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    const result = await queryConvexUnauthenticated<PrefillData>(
      "intake:getIntakeTokenData",
      { token },
    );
    return { success: true, data: result };
  } catch (error) {
    console.error("Convex error:", error);
    return { success: false, error: "Invalid or expired link" };
  }
}

export async function markIntakeTokenUsed(token?: string, slug?: string): Promise<void> {
  const resolvedToken = token ?? (slug ? await getIntakeAccessToken(slug) : null);
  if (!resolvedToken) {
    return;
  }

  try {
    const { mutateConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    await mutateConvexUnauthenticated("intake:markIntakeTokenUsed", {
      token: resolvedToken,
    });
  } catch (error) {
    console.error("Convex error:", error);
  }

  if (slug) {
    await clearIntakeAccessToken(slug);
  }
}

export async function getPublicAgencyLocations(params: {
  listingId: string;
  slug: string;
}) {
  try {
    const { queryConvexUnauthenticated } = await import("@/lib/platform/convex/server");
    const result = await queryConvexUnauthenticated<Array<{
      id: string;
      name: string;
      address: string | null;
      city: string | null;
      state: string | null;
      zip: string | null;
      lat: number | null;
      lng: number | null;
    }>>("intake:getPublicAgencyLocations", { slug: params.slug });
    return result.map((location) => ({
      id: location.id,
      label: location.name,
      street: location.address,
      city: location.city,
      state: location.state,
      postal_code: location.zip,
      latitude: location.lat,
      longitude: location.lng,
    }));
  } catch (error) {
    console.error("Convex error:", error);
    return [];
  }
}
