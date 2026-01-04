"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { verifyTurnstileToken } from "@/lib/turnstile";

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

/**
 * Sign in with email and password
 */
export async function signInWithEmail(formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const turnstileToken = formData.get("turnstileToken") as string | null;

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
  let redirectTo = "/dashboard";

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", user.id)
      .single();

    if (!profile || !profile.onboarding_completed_at) {
      redirectTo = "/dashboard/onboarding";
    }
  }

  revalidatePath("/", "layout");
  return { success: true, redirectTo };
}

/**
 * Sign up with email and password
 * Plan is passed from URL param (from pricing page) and stored in DB
 */
export async function signUpWithEmail(formData: FormData): Promise<AuthResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const agencyName = formData.get("agencyName") as string;
  const selectedPlan = (formData.get("selectedPlan") as string) || "free";
  const billingInterval = (formData.get("billingInterval") as string) || "monthly";
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

  // Validate plan tier and billing interval
  // Normalize to "month"/"year" to match Stripe's convention
  const validPlans = ["free", "pro", "enterprise"];
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
  const origin = headersList.get("origin") || process.env.NEXT_PUBLIC_SITE_URL;

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?plan=${planTier}&interval=${interval}`,
      data: {
        agency_name: agencyName || email.split("@")[0],
        selected_plan: planTier,
        billing_interval: interval,
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
    const adminClient = await createAdminClient();
    await adminClient.from("profiles").insert({
      id: data.user.id,
      agency_name: agencyName || email.split("@")[0],
      contact_email: email,
      plan_tier: planTier,
      billing_interval: interval,
    });
  }

  revalidatePath("/", "layout");
  return { success: true };
}

/**
 * Sign in with OAuth provider (Google, Microsoft)
 * Plan and billing interval are passed via redirect URL and stored after callback
 */
export async function signInWithOAuth(
  provider: "google" | "azure",
  selectedPlan?: string,
  billingInterval?: string
): Promise<{ url: string } | AuthError> {
  const headersList = await headers();
  const origin = headersList.get("origin") || process.env.NEXT_PUBLIC_SITE_URL;

  // Validate plan tier and billing interval
  // Normalize to "month"/"year" to match Stripe's convention
  const validPlans = ["free", "pro", "enterprise"];
  const planTier = selectedPlan && validPlans.includes(selectedPlan) ? selectedPlan : "free";
  const interval = billingInterval === "annual" || billingInterval === "year" ? "year" : "month";

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${origin}/auth/callback?plan=${planTier}&interval=${interval}`,
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
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Send password reset email
 */
export async function resetPassword(formData: FormData): Promise<AuthResult> {
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
  const origin = headersList.get("origin") || process.env.NEXT_PUBLIC_SITE_URL;

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
 * Update password (after reset)
 */
export async function updatePassword(formData: FormData): Promise<AuthResult> {
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
