"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { isClerkAuthEnabled } from "@/lib/platform/config";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { sendAdminNewSignupNotification } from "@/lib/email/notifications";
import { getRequestOrigin } from "@/lib/utils/domains";

export type AuthError = {
  error: string;
  message: string;
};

export type AuthSuccess = {
  success: true;
  message?: string;
  redirectTo?: string;
};

export type AuthResult = AuthError | AuthSuccess;

export type SignupIntent = "therapy" | "jobs" | "both";

function normalizeSignupIntent(value: string | null | undefined): SignupIntent {
  if (value === "therapy" || value === "jobs" || value === "both") {
    return value;
  }
  // Backward compatibility with older links that used context=jobs
  if (value === "context_jobs" || value === "jobs_only") {
    return "jobs";
  }
  return "both";
}

function buildAuthCallbackUrl(params: {
  origin: string;
  planTier: string;
  interval: string;
  intent?: string;
  inviteToken?: string | null;
}) {
  const callbackUrl = new URL("/auth/callback", params.origin);
  callbackUrl.searchParams.set("plan", params.planTier);
  callbackUrl.searchParams.set("interval", params.interval);

  if (params.intent) {
    callbackUrl.searchParams.set("intent", params.intent);
  }

  if (params.inviteToken) {
    callbackUrl.searchParams.set("invite", params.inviteToken);
  }

  return callbackUrl.toString();
}

/**
 * Sign in with email and password (Supabase mode only).
 * In Clerk mode, sign-in is handled by Clerk's UI components.
 */
export async function signInWithEmail(formData: FormData): Promise<AuthResult> {
  if (isClerkAuthEnabled()) {
    return { error: "auth_error", message: "Sign-in is handled by Clerk" };
  }

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const turnstileToken = formData.get("turnstileToken") as string | null;
  const inviteToken = formData.get("inviteToken") as string | null;

  if (!email || !password) {
    return {
      error: "validation_error",
      message: "Email and password are required",
    };
  }

  // Verify Turnstile token if provided (required after failed attempts)
  if (turnstileToken) {
    const turnstileResult = await verifyTurnstileToken(turnstileToken);
    if (!turnstileResult.success) {
      return {
        error: "validation_error",
        message: "Security verification failed. Please try again.",
      };
    }
  }

  const { createClient, getCurrentProfileId, getWorkspaceInviteCookie } =
    await import("@/lib/supabase/server");

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: "auth_error",
      message: error.message,
    };
  }

  // Check if user has completed onboarding to determine redirect
  const { data: { user } } = await supabase.auth.getUser();
  let redirectTo = "/dashboard/clients/pipeline";

  if (user) {
    const pendingInviteToken = inviteToken || (await getWorkspaceInviteCookie());
    let profileId = (await getCurrentProfileId()) || user.id;
    if (pendingInviteToken) {
      try {
        const { acceptWorkspaceInvitation } = await import(
          "@/lib/workspace/memberships"
        );
        const result = await acceptWorkspaceInvitation({
          token: pendingInviteToken,
          user,
        });
        profileId = result.profileId;
      } catch (error) {
        return {
          error: "auth_error",
          message: error instanceof Error ? error.message : "Failed to accept workspace invitation",
        };
      }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", profileId)
      .single();

    if (!profile || !profile.onboarding_completed_at) {
      redirectTo = "/dashboard/onboarding";
    }
  }

  revalidatePath("/", "layout");
  return { success: true, redirectTo };
}

/**
 * Sign up with email and password (Supabase mode only).
 * In Clerk mode, sign-up is handled by Clerk's UI components.
 */
export async function signUpWithEmail(formData: FormData): Promise<AuthResult> {
  if (isClerkAuthEnabled()) {
    return { error: "auth_error", message: "Sign-up is handled by Clerk" };
  }

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const agencyName = formData.get("agencyName") as string;
  const selectedPlan = (formData.get("selectedPlan") as string) || "free";
  const billingInterval = (formData.get("billingInterval") as string) || "monthly";
  const selectedIntent = normalizeSignupIntent(formData.get("selectedIntent") as string | null);
  const turnstileToken = formData.get("turnstileToken") as string;
  const inviteToken = formData.get("inviteToken") as string | null;

  // Verify Turnstile token
  if (!turnstileToken) {
    return {
      error: "validation_error",
      message: "Security verification required",
    };
  }

  const turnstileResult = await verifyTurnstileToken(turnstileToken);
  if (!turnstileResult.success) {
    return {
      error: "validation_error",
      message: "Security verification failed. Please try again.",
    };
  }

  // Validate plan tier and billing interval
  // Normalize to "month"/"year" to match Stripe's convention
  const validPlans = ["free", "pro"];
  const planTier = validPlans.includes(selectedPlan) ? selectedPlan : "free";
  const interval = billingInterval === "annual" || billingInterval === "year" ? "year" : "month";

  if (!email || !password) {
    return {
      error: "validation_error",
      message: "Email and password are required",
    };
  }

  if (password.length < 8) {
    return {
      error: "validation_error",
      message: "Password must be at least 8 characters",
    };
  }

  const headersList = await headers();
  const origin = getRequestOrigin(headersList, "goodaba");

  const { setWorkspaceInviteCookie, createClient } =
    await import("@/lib/supabase/server");

  if (inviteToken) {
    await setWorkspaceInviteCookie(inviteToken);
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: buildAuthCallbackUrl({
        origin,
        planTier,
        interval,
        inviteToken,
      }),
      data: {
        agency_name: agencyName || email.split("@")[0],
        selected_plan: planTier,
        billing_interval: interval,
        selected_intent: selectedIntent,
      },
    },
  });

  if (error) {
    return {
      error: "auth_error",
      message: error.message,
    };
  }

  // If email confirmation is required
  if (data.user && !data.user.email_confirmed_at) {
    return {
      success: true,
      message: "Please check your email to confirm your account",
    };
  }

  // If user was created and confirmed (e.g., in development), create profile
  if (data.user) {
    const finalAgencyName = agencyName || email.split("@")[0];
    const { acceptWorkspaceInvitation, createWorkspaceForUser } =
      await import("@/lib/workspace/memberships");
    if (inviteToken) {
      await acceptWorkspaceInvitation({
        token: inviteToken,
        user: data.user,
      });
    } else {
      await createWorkspaceForUser({
        userId: data.user.id,
        email,
        agencyName: finalAgencyName,
        planTier,
        billingInterval: interval,
        primaryIntent: selectedIntent,
      });
    }

    // Send admin notification for new signup
    await sendAdminNewSignupNotification({
      agencyName: finalAgencyName,
      email,
      planTier,
      billingInterval: interval,
      signupMethod: "email",
    });
  }

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Sign in with OAuth provider (Supabase mode only).
 * In Clerk mode, OAuth is handled by Clerk's UI components.
 */
export async function signInWithOAuth(
  provider: "google" | "azure",
  selectedPlan?: string,
  billingInterval?: string,
  selectedIntent?: string,
  inviteToken?: string
): Promise<{ url: string } | AuthError> {
  if (isClerkAuthEnabled()) {
    return { error: "oauth_error", message: "OAuth is handled by Clerk" };
  }

  const headersList = await headers();
  const origin = getRequestOrigin(headersList, "goodaba");

  // Validate plan tier and billing interval
  // Normalize to "month"/"year" to match Stripe's convention
  const validPlans = ["free", "pro"];
  const planTier = selectedPlan && validPlans.includes(selectedPlan) ? selectedPlan : "free";
  const interval = billingInterval === "annual" || billingInterval === "year" ? "year" : "month";
  const intent = normalizeSignupIntent(selectedIntent);

  const { setWorkspaceInviteCookie, createClient } =
    await import("@/lib/supabase/server");

  if (inviteToken) {
    await setWorkspaceInviteCookie(inviteToken);
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: buildAuthCallbackUrl({
        origin,
        planTier,
        interval,
        intent,
        inviteToken,
      }),
      queryParams: provider === "azure" ? {
        // Microsoft-specific params if needed
      } : undefined,
    },
  });

  if (error) {
    return {
      error: "oauth_error",
      message: error.message,
    };
  }

  if (!data.url) {
    return {
      error: "oauth_error",
      message: "Failed to get OAuth URL",
    };
  }

  return { url: data.url };
}

/**
 * Sign out the current user.
 * In Clerk mode, sign-out is primarily client-side; server action just revalidates and redirects.
 */
export async function signOut(): Promise<void> {
  if (isClerkAuthEnabled()) {
    revalidatePath("/", "layout");
    redirect("/");
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Send password reset email (Supabase mode only).
 * In Clerk mode, password reset is handled by Clerk's UI.
 */
export async function resetPassword(formData: FormData): Promise<AuthResult> {
  if (isClerkAuthEnabled()) {
    return { error: "auth_error", message: "Password reset is handled by Clerk" };
  }

  const email = formData.get("email") as string;
  const turnstileToken = formData.get("turnstileToken") as string;

  // Verify Turnstile token
  if (!turnstileToken) {
    return {
      error: "validation_error",
      message: "Security verification required",
    };
  }

  const turnstileResult = await verifyTurnstileToken(turnstileToken);
  if (!turnstileResult.success) {
    return {
      error: "validation_error",
      message: "Security verification failed. Please try again.",
    };
  }

  if (!email) {
    return {
      error: "validation_error",
      message: "Email is required",
    };
  }

  const headersList = await headers();
  const origin = getRequestOrigin(headersList, "goodaba");

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/reset-password`,
  });

  if (error) {
    return {
      error: "auth_error",
      message: error.message,
    };
  }

  return {
    success: true,
    message: "Password reset email sent. Please check your inbox.",
  };
}

/**
 * Update password (Supabase mode only).
 * In Clerk mode, password updates are handled by Clerk's UI.
 */
export async function updatePassword(formData: FormData): Promise<AuthResult> {
  if (isClerkAuthEnabled()) {
    return { error: "auth_error", message: "Password update is handled by Clerk" };
  }

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return {
      error: "validation_error",
      message: "Password and confirmation are required",
    };
  }

  if (password !== confirmPassword) {
    return {
      error: "validation_error",
      message: "Passwords do not match",
    };
  }

  if (password.length < 8) {
    return {
      error: "validation_error",
      message: "Password must be at least 8 characters",
    };
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return {
      error: "auth_error",
      message: error.message,
    };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
