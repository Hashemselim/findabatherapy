"use server";

import { createClient } from "@/lib/supabase/server";

export interface RemovalRequestWithDetails {
  id: string;
  reason: string | null;
  status: "pending" | "approved" | "denied";
  adminNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  // Google Places listing info
  googlePlacesListing: {
    id: string;
    name: string;
    slug: string;
    city: string;
    state: string;
  };
  // Requester's profile
  profile: {
    id: string;
    agencyName: string;
    contactEmail: string;
  };
  // Requester's listing
  listing: {
    id: string;
    slug: string;
    headline: string | null;
  };
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Check if current user is an admin
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return profile?.is_admin ?? false;
}

/**
 * Get removal requests with filters (admin only)
 */
export async function getRemovalRequests(filters: {
  status?: "pending" | "approved" | "denied";
  page?: number;
  limit?: number;
}): Promise<ActionResult<{ requests: RemovalRequestWithDetails[]; total: number }>> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("removal_requests")
    .select(
      `
      id,
      reason,
      status,
      admin_notes,
      reviewed_at,
      created_at,
      google_places_listings (
        id,
        name,
        slug,
        city,
        state
      ),
      profiles (
        id,
        agency_name,
        contact_email
      ),
      listings (
        id,
        slug,
        headline
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  // Transform data
  const requests: RemovalRequestWithDetails[] = (data || []).map((req) => {
    const gp = req.google_places_listings as unknown as {
      id: string;
      name: string;
      slug: string;
      city: string;
      state: string;
    };
    const profile = req.profiles as unknown as {
      id: string;
      agency_name: string;
      contact_email: string;
    };
    const listing = req.listings as unknown as {
      id: string;
      slug: string;
      headline: string | null;
    };

    return {
      id: req.id,
      reason: req.reason,
      status: req.status as "pending" | "approved" | "denied",
      adminNotes: req.admin_notes,
      reviewedAt: req.reviewed_at,
      createdAt: req.created_at,
      googlePlacesListing: {
        id: gp.id,
        name: gp.name,
        slug: gp.slug,
        city: gp.city,
        state: gp.state,
      },
      profile: {
        id: profile.id,
        agencyName: profile.agency_name,
        contactEmail: profile.contact_email,
      },
      listing: {
        id: listing.id,
        slug: listing.slug,
        headline: listing.headline,
      },
    };
  });

  return {
    success: true,
    data: {
      requests,
      total: count || 0,
    },
  };
}

/**
 * Approve a removal request (admin only)
 */
export async function approveRemovalRequest(
  requestId: string,
  adminNotes?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  // Get the request
  const { data: request } = await supabase
    .from("removal_requests")
    .select("id, google_places_listing_id, status")
    .eq("id", requestId)
    .single();

  if (!request) {
    return { success: false, error: "Request not found" };
  }

  if (request.status !== "pending") {
    return { success: false, error: "Request has already been processed" };
  }

  // Get current user for audit
  const { data: { user } } = await supabase.auth.getUser();

  // Update request status
  const { error: updateError } = await supabase
    .from("removal_requests")
    .update({
      status: "approved",
      admin_notes: adminNotes || null,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // Mark Google Places listing as removed
  const { error: gpError } = await supabase
    .from("google_places_listings")
    .update({
      status: "removed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", request.google_places_listing_id);

  if (gpError) {
    return { success: false, error: gpError.message };
  }

  return { success: true };
}

/**
 * Deny a removal request (admin only)
 */
export async function denyRemovalRequest(
  requestId: string,
  adminNotes?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  // Get the request
  const { data: request } = await supabase
    .from("removal_requests")
    .select("id, status")
    .eq("id", requestId)
    .single();

  if (!request) {
    return { success: false, error: "Request not found" };
  }

  if (request.status !== "pending") {
    return { success: false, error: "Request has already been processed" };
  }

  // Get current user for audit
  const { data: { user } } = await supabase.auth.getUser();

  // Update request status
  const { error: updateError } = await supabase
    .from("removal_requests")
    .update({
      status: "denied",
      admin_notes: adminNotes || null,
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

/**
 * Get admin dashboard stats
 */
export async function getAdminStats(): Promise<
  ActionResult<{
    totalGooglePlacesListings: number;
    activeGooglePlacesListings: number;
    removedGooglePlacesListings: number;
    pendingRemovalRequests: number;
    totalRemovalRequests: number;
  }>
> {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  const supabase = await createClient();

  // Get Google Places counts
  const { count: totalGP } = await supabase
    .from("google_places_listings")
    .select("*", { count: "exact", head: true });

  const { count: activeGP } = await supabase
    .from("google_places_listings")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  const { count: removedGP } = await supabase
    .from("google_places_listings")
    .select("*", { count: "exact", head: true })
    .eq("status", "removed");

  // Get removal request counts
  const { count: pendingRequests } = await supabase
    .from("removal_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: totalRequests } = await supabase
    .from("removal_requests")
    .select("*", { count: "exact", head: true });

  return {
    success: true,
    data: {
      totalGooglePlacesListings: totalGP || 0,
      activeGooglePlacesListings: activeGP || 0,
      removedGooglePlacesListings: removedGP || 0,
      pendingRemovalRequests: pendingRequests || 0,
      totalRemovalRequests: totalRequests || 0,
    },
  };
}
