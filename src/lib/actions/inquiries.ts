"use server";

import { revalidatePath } from "next/cache";

import { createNotification } from "@/lib/actions/notifications";
import { sendFamilyInquiryConfirmation, sendProviderInquiryNotification } from "@/lib/email/notifications";
import {
  mutateConvex,
  mutateConvexUnauthenticated,
  queryConvex,
} from "@/lib/platform/convex/server";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { contactFormSchema, type ContactFormData, type InquiryStatus } from "@/lib/validations/contact";

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
 * Submit an inquiry from a family to a provider.
 * This is a public action (no auth required).
 */
export async function submitInquiry(
  listingId: string,
  data: ContactFormData,
  turnstileToken: string,
  locationId?: string,
  source: InquirySource = "listing_page"
): Promise<ActionResult> {
  const parsed = contactFormSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  if (parsed.data.website && parsed.data.website.length > 0) {
    return { success: true };
  }

  if (!turnstileToken) {
    return { success: false, error: "Security verification required" };
  }

  const turnstileResult = await verifyTurnstileToken(turnstileToken);
  if (!turnstileResult.success) {
    return { success: false, error: "Security verification failed. Please try again." };
  }

  try {
    const result = await mutateConvexUnauthenticated<{
      success: boolean;
      inquiryId?: string;
      clientId?: string;
      providerEmail?: string;
      providerName?: string;
      providerSlug?: string;
      logoUrl?: string | null;
      brandColor?: string;
      website?: string | null;
      phone?: string | null;
      workspaceId?: string;
    }>("inquiries:submitInquiry", {
      listingId,
      familyName: parsed.data.familyName,
      familyEmail: parsed.data.familyEmail,
      familyPhone: parsed.data.familyPhone || null,
      childAge: parsed.data.childAge || null,
      message: parsed.data.message,
      locationId: locationId || null,
      source,
      referralSource: parsed.data.referralSource || null,
      referralSourceOther:
        parsed.data.referralSource === "other" ? (parsed.data.referralSourceOther || null) : null,
    });

    if (!result?.success) {
      return { success: false, error: "Provider not found" };
    }

    if (result.providerEmail) {
      sendProviderInquiryNotification({
        to: result.providerEmail,
        providerName: result.providerName || "Provider",
        familyName: parsed.data.familyName,
        familyEmail: parsed.data.familyEmail,
        familyPhone: parsed.data.familyPhone,
        childAge: parsed.data.childAge,
        message: parsed.data.message,
      }).catch((err) => {
        console.error("[INQUIRY] Failed to send provider notification:", err);
      });

      sendFamilyInquiryConfirmation({
        to: parsed.data.familyEmail,
        familyName: parsed.data.familyName,
        providerName: result.providerName || "Provider",
        providerSlug: result.providerSlug || "",
        source,
        agencyBranding: {
          agencyName: result.providerName || "Provider",
          contactEmail: result.providerEmail,
          logoUrl: result.logoUrl || null,
          brandColor: result.brandColor || "#0866FF",
          website: result.website || null,
          phone: result.phone || null,
        },
      }).catch((err) => {
        console.error("[INQUIRY] Failed to send family confirmation:", err);
      });
    }

    if (result.workspaceId && result.clientId) {
      createNotification({
        profileId: result.workspaceId,
        type: "contact_form",
        title: `New contact from ${parsed.data.familyName}`,
        body: parsed.data.message.slice(0, 200),
        link: `/dashboard/clients/${result.clientId}`,
        entityId: result.clientId,
        entityType: "client",
      }).catch((err) => {
        console.error("[INQUIRY] Failed to create notification:", err);
      });
    }

    return { success: true };
  } catch (error) {
    console.error("[INQUIRY] submitInquiry error:", error);
    return { success: false, error: "Failed to submit inquiry. Please try again." };
  }
}

/**
 * Get all inquiries for the current workspace listing.
 */
export async function getInquiries(
  filter?: { status?: InquiryStatus; locationIds?: string[] }
): Promise<ActionResult<{ inquiries: Inquiry[]; unreadCount: number }>> {
  try {
    const result = await queryConvex<{ inquiries: Inquiry[]; unreadCount: number }>(
      "inquiries:getInquiries",
      {
        status: filter?.status,
        locationIds: filter?.locationIds ?? null,
      },
    );
    return { success: true, data: result };
  } catch (error) {
    console.error("[INQUIRY] getInquiries error:", error);
    return { success: false, error: "Not authenticated" };
  }
}

/**
 * Get a single inquiry by ID.
 */
export async function getInquiry(
  inquiryId: string
): Promise<ActionResult<Inquiry>> {
  try {
    const result = await queryConvex<Inquiry | null>("inquiries:getInquiry", { inquiryId });
    if (!result) {
      return { success: false, error: "Inquiry not found" };
    }
    return { success: true, data: result };
  } catch (error) {
    console.error("[INQUIRY] getInquiry error:", error);
    return { success: false, error: "Not authenticated" };
  }
}

/**
 * Mark an inquiry as read.
 */
export async function markInquiryAsRead(
  inquiryId: string
): Promise<ActionResult> {
  try {
    await mutateConvex("inquiries:markInquiryAsRead", { inquiryId });
    revalidatePath("/dashboard/inquiries");
    return { success: true };
  } catch (error) {
    console.error("[INQUIRY] markInquiryAsRead error:", error);
    return { success: false, error: "Failed to update inquiry" };
  }
}

/**
 * Mark an inquiry as replied.
 */
export async function markInquiryAsReplied(
  inquiryId: string
): Promise<ActionResult> {
  try {
    await mutateConvex("inquiries:markInquiryAsReplied", { inquiryId });
    revalidatePath("/dashboard/inquiries");
    return { success: true };
  } catch (error) {
    console.error("[INQUIRY] markInquiryAsReplied error:", error);
    return { success: false, error: "Failed to update inquiry" };
  }
}

/**
 * Archive an inquiry.
 */
export async function archiveInquiry(
  inquiryId: string
): Promise<ActionResult> {
  try {
    await mutateConvex("inquiries:archiveInquiry", { inquiryId });
    revalidatePath("/dashboard/inquiries");
    return { success: true };
  } catch (error) {
    console.error("[INQUIRY] archiveInquiry error:", error);
    return { success: false, error: "Failed to archive inquiry" };
  }
}

/**
 * Get unread inquiry count (for sidebar badge).
 */
export async function getUnreadInquiryCount(): Promise<ActionResult<number>> {
  try {
    const count = await queryConvex<number>("inquiries:getUnreadInquiryCount");
    return { success: true, data: count };
  } catch {
    return { success: true, data: 0 };
  }
}
