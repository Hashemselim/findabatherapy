"use server";

import { createClient, getCurrentProfileId } from "@/lib/supabase/server";

import { evaluateOnboardingFlow, type OnboardingFlowSnapshot } from "./flow";

export async function getOnboardingFlow(): Promise<OnboardingFlowSnapshot> {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return evaluateOnboardingFlow({
      onboardingCompleted: false,
      selectedPlan: "free",
      billingInterval: "month",
      subscriptionStatus: null,
      hasAgencyStep: false,
      hasLocationStep: false,
      hasServicesStep: false,
    });
  }

  const supabase = await createClient();

  const [{ data: profile }, { data: listing }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "agency_name, contact_email, plan_tier, billing_interval, onboarding_completed_at, subscription_status"
      )
      .eq("id", profileId)
      .single(),
    supabase
      .from("listings")
      .select("id, description")
      .eq("profile_id", profileId)
      .single(),
  ]);

  let hasLocationStep = false;
  let hasServicesStep = false;

  if (listing?.id) {
    const [{ count }, { data: servicesAttr }] = await Promise.all([
      supabase
        .from("locations")
        .select("id", { count: "exact", head: true })
        .eq("listing_id", listing.id),
      supabase
        .from("listing_attribute_values")
        .select("value_json")
        .eq("listing_id", listing.id)
        .eq("attribute_key", "services_offered")
        .maybeSingle(),
    ]);

    hasLocationStep = (count || 0) > 0;
    hasServicesStep = Array.isArray(servicesAttr?.value_json) && servicesAttr.value_json.length > 0;
  }

  const hasAgencyStep =
    Boolean(profile?.agency_name) &&
    Boolean(profile?.contact_email) &&
    Boolean(listing?.description?.trim());

  return evaluateOnboardingFlow({
    onboardingCompleted: Boolean(profile?.onboarding_completed_at),
    selectedPlan: profile?.plan_tier,
    billingInterval: profile?.billing_interval,
    subscriptionStatus: profile?.subscription_status,
    hasAgencyStep,
    hasLocationStep,
    hasServicesStep,
  });
}
