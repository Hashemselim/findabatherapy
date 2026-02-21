"use server";

import { revalidatePath } from "next/cache";

import { createClient, createAdminClient, getUser } from "@/lib/supabase/server";
import { contactFormSchema, type ContactFormData, type InquiryStatus } from "@/lib/validations/contact";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { sendProviderInquiryNotification, sendFamilyInquiryConfirmation } from "@/lib/email/notifications";
import { createNotification } from "@/lib/actions/notifications";

type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export interface InquiryLocation {
  id: string;
  label: string | null;
  city: string;
  state: string;
}

export type InquirySource = "listing_page" | "intake_standalone";

export interface Inquiry {
  id: string;
  listingId: string;
  familyName: string;
  familyEmail: string;
  familyPhone: string | null;
  childAge: string | null;
  message: string;
  status: InquiryStatus;
  createdAt: string;
  readAt: string | null;
  repliedAt: string | null;
  locationId: string | null;
  location: InquiryLocation | null;
  source: InquirySource;
}

/**
 * Submit an inquiry from a family to a provider
 * This is a public action (no auth required)
 */
export async function submitInquiry(
  listingId: string,
  data: ContactFormData,
  turnstileToken: string,
  locationId?: string,
  source: InquirySource = "listing_page"
): Promise<ActionResult> {
  // Validate input
  const parsed = contactFormSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  // Check honeypot field (spam protection)
  if (parsed.data.website && parsed.data.website.length > 0) {
    // Bot detected - silently succeed to not give feedback to spammer
    return { success: true };
  }

  // Verify Turnstile token
  if (!turnstileToken) {
    return { success: false, error: "Security verification required" };
  }

  const turnstileResult = await verifyTurnstileToken(turnstileToken);
  if (!turnstileResult.success) {
    return { success: false, error: "Security verification failed. Please try again." };
  }

  const supabase = await createAdminClient();

  // Verify listing exists and is published
  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .select("id, slug, profile_id, profiles!inner(plan_tier, contact_email, agency_name)")
    .eq("id", listingId)
    .eq("status", "published")
    .single();

  if (listingError || !listing) {
    return { success: false, error: "Provider not found" };
  }

  const profile = listing.profiles as unknown as {
    plan_tier: string;
    contact_email: string;
    agency_name: string;
  };
  const providerSlug = listing.slug;

  // Check if provider has premium plan (contact form is premium feature)
  if (profile.plan_tier === "free") {
    return { success: false, error: "This provider does not accept inquiries through the platform" };
  }

  // Insert inquiry
  const { data: inquiry, error: insertError } = await supabase
    .from("inquiries")
    .insert({
      listing_id: listingId,
      location_id: locationId || null,
      family_name: parsed.data.familyName,
      family_email: parsed.data.familyEmail,
      family_phone: parsed.data.familyPhone || null,
      child_age: parsed.data.childAge || null,
      message: parsed.data.message,
      status: "converted", // Auto-converted to client lead
      source,
      referral_source: parsed.data.referralSource || null,
      referral_source_other: parsed.data.referralSource === "other" ? (parsed.data.referralSourceOther || null) : null,
    })
    .select("id")
    .single();

  if (insertError || !inquiry) {
    return { success: false, error: "Failed to submit inquiry. Please try again." };
  }

  // Auto-create client record as a lead (status: 'inquiry')
  const profileId = listing.profile_id;
  const nameParts = parsed.data.familyName.trim().split(/\s+/);
  const parentFirstName = nameParts[0] || "";
  const parentLastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

  // Build notes from message + child age
  const notesParts: string[] = [];
  if (parsed.data.childAge) {
    notesParts.push(`Child's age: ${parsed.data.childAge}`);
  }
  notesParts.push(parsed.data.message);
  const notes = notesParts.join("\n\n");

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      profile_id: profileId,
      listing_id: listingId,
      inquiry_id: inquiry.id,
      status: "inquiry",
      referral_source: parsed.data.referralSource || null,
      referral_source_other: parsed.data.referralSource === "other" ? (parsed.data.referralSourceOther || null) : null,
      notes,
    })
    .select("id")
    .single();

  if (clientError || !client) {
    console.error("[INQUIRY] Failed to auto-create client lead:", clientError);
    // Don't fail the inquiry — the inquiry record was created successfully
  }

  // Create parent record for the client lead
  if (client) {
    await supabase.from("client_parents").insert({
      client_id: client.id,
      first_name: parentFirstName || null,
      last_name: parentLastName || null,
      email: parsed.data.familyEmail || null,
      phone: parsed.data.familyPhone || null,
      is_primary: true,
      sort_order: 0,
    }).then(({ error: parentError }) => {
      if (parentError) {
        console.error("[INQUIRY] Failed to create parent record:", parentError);
      }
    });

    // If a location was specified, create the client_locations record
    if (locationId) {
      await supabase.from("client_locations").insert({
        client_id: client.id,
        location_id: locationId,
        is_primary: true,
      }).then(({ error: locError }) => {
        if (locError) {
          console.error("[INQUIRY] Failed to create client location:", locError);
        }
      });
    }

    // Create in-app notification for the provider
    createNotification({
      profileId,
      type: "contact_form",
      title: `New contact from ${parsed.data.familyName}`,
      body: parsed.data.message.slice(0, 200),
      link: `/dashboard/clients/${client.id}`,
      entityId: client.id,
      entityType: "client",
    }).catch((err) => {
      console.error("[INQUIRY] Failed to create notification:", err);
    });
  }

  // Send email notifications (fire and forget - don't block on email delivery)
  // Notify the provider
  sendProviderInquiryNotification({
    to: profile.contact_email,
    providerName: profile.agency_name,
    familyName: parsed.data.familyName,
    familyEmail: parsed.data.familyEmail,
    familyPhone: parsed.data.familyPhone,
    childAge: parsed.data.childAge,
    message: parsed.data.message,
  }).catch((err) => {
    console.error("[INQUIRY] Failed to send provider notification:", err);
  });

  // Send confirmation to the family
  sendFamilyInquiryConfirmation({
    to: parsed.data.familyEmail,
    familyName: parsed.data.familyName,
    providerName: profile.agency_name,
    providerSlug,
  }).catch((err) => {
    console.error("[INQUIRY] Failed to send family confirmation:", err);
  });

  return { success: true };
}

/**
 * Get all inquiries for the current user's listing
 */
export async function getInquiries(
  filter?: { status?: InquiryStatus; locationIds?: string[] }
): Promise<ActionResult<{ inquiries: Inquiry[]; unreadCount: number }>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "Listing not found" };
  }

  // Build query - join with locations to get location info
  let query = supabase
    .from("inquiries")
    .select(`
      *,
      locations (
        id,
        label,
        city,
        state
      )
    `)
    .eq("listing_id", listing.id)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  if (filter?.status) {
    query = query.eq("status", filter.status);
  }

  // Apply location filter if provided
  if (filter?.locationIds && filter.locationIds.length > 0) {
    // Include inquiries with no location OR inquiries matching selected locations
    query = query.or(`location_id.is.null,location_id.in.(${filter.locationIds.join(",")})`);
  }

  const { data: inquiries, error } = await query;

  if (error) {
    return { success: false, error: "Failed to fetch inquiries" };
  }

  // Get unread count
  const { count } = await supabase
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listing.id)
    .eq("status", "unread");

  return {
    success: true,
    data: {
      inquiries: inquiries.map((i) => {
        const loc = i.locations as { id: string; label: string | null; city: string; state: string } | null;
        return {
          id: i.id,
          listingId: i.listing_id,
          familyName: i.family_name,
          familyEmail: i.family_email,
          familyPhone: i.family_phone,
          childAge: i.child_age,
          message: i.message,
          status: i.status as InquiryStatus,
          createdAt: i.created_at,
          readAt: i.read_at,
          repliedAt: i.replied_at,
          locationId: i.location_id,
          location: loc ? {
            id: loc.id,
            label: loc.label,
            city: loc.city,
            state: loc.state,
          } : null,
          source: (i.source as InquirySource) || "listing_page",
        };
      }),
      unreadCount: count || 0,
    },
  };
}

/**
 * Get a single inquiry by ID
 */
export async function getInquiry(
  inquiryId: string
): Promise<ActionResult<Inquiry>> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing to verify ownership
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "Listing not found" };
  }

  // Get inquiry with location data
  const { data: inquiry, error } = await supabase
    .from("inquiries")
    .select(`
      *,
      locations (
        id,
        label,
        city,
        state
      )
    `)
    .eq("id", inquiryId)
    .eq("listing_id", listing.id)
    .single();

  if (error || !inquiry) {
    return { success: false, error: "Inquiry not found" };
  }

  const loc = inquiry.locations as { id: string; label: string | null; city: string; state: string } | null;

  return {
    success: true,
    data: {
      id: inquiry.id,
      listingId: inquiry.listing_id,
      familyName: inquiry.family_name,
      familyEmail: inquiry.family_email,
      familyPhone: inquiry.family_phone,
      childAge: inquiry.child_age,
      message: inquiry.message,
      status: inquiry.status as InquiryStatus,
      createdAt: inquiry.created_at,
      readAt: inquiry.read_at,
      repliedAt: inquiry.replied_at,
      locationId: inquiry.location_id,
      location: loc ? {
        id: loc.id,
        label: loc.label,
        city: loc.city,
        state: loc.state,
      } : null,
      source: (inquiry.source as InquirySource) || "listing_page",
    },
  };
}

/**
 * Mark an inquiry as read
 */
export async function markInquiryAsRead(
  inquiryId: string
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing to verify ownership
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "Listing not found" };
  }

  // Update inquiry
  const { error } = await supabase
    .from("inquiries")
    .update({
      status: "read",
      read_at: new Date().toISOString(),
    })
    .eq("id", inquiryId)
    .eq("listing_id", listing.id)
    .eq("status", "unread");

  if (error) {
    return { success: false, error: "Failed to update inquiry" };
  }

  revalidatePath("/dashboard/inquiries");
  return { success: true };
}

/**
 * Mark an inquiry as replied
 */
export async function markInquiryAsReplied(
  inquiryId: string
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing to verify ownership
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "Listing not found" };
  }

  // Update inquiry
  const { error } = await supabase
    .from("inquiries")
    .update({
      status: "replied",
      replied_at: new Date().toISOString(),
    })
    .eq("id", inquiryId)
    .eq("listing_id", listing.id);

  if (error) {
    return { success: false, error: "Failed to update inquiry" };
  }

  revalidatePath("/dashboard/inquiries");
  return { success: true };
}

/**
 * Archive an inquiry
 */
export async function archiveInquiry(
  inquiryId: string
): Promise<ActionResult> {
  const user = await getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Get listing to verify ownership
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: false, error: "Listing not found" };
  }

  // Update inquiry
  const { error } = await supabase
    .from("inquiries")
    .update({ status: "archived" })
    .eq("id", inquiryId)
    .eq("listing_id", listing.id);

  if (error) {
    return { success: false, error: "Failed to archive inquiry" };
  }

  revalidatePath("/dashboard/inquiries");
  return { success: true };
}

/**
 * Get unread inquiry count (for sidebar badge)
 */
export async function getUnreadInquiryCount(): Promise<ActionResult<number>> {
  const user = await getUser();
  if (!user) {
    return { success: true, data: 0 };
  }

  const supabase = await createClient();

  // Get listing
  const { data: listing } = await supabase
    .from("listings")
    .select("id")
    .eq("profile_id", user.id)
    .single();

  if (!listing) {
    return { success: true, data: 0 };
  }

  // Get unread count
  const { count } = await supabase
    .from("inquiries")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listing.id)
    .eq("status", "unread");

  return { success: true, data: count || 0 };
}
