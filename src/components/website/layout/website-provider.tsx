"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ProviderWebsiteData } from "@/lib/actions/provider-website";
import { getContrastingTextColor } from "@/lib/utils/brand-color";

interface WebsiteContextValue {
  provider: ProviderWebsiteData;
  brandColor: string;
  contrastColor: string;
  isPremium: boolean;
  showWatermark: boolean;
}

const WebsiteContext = createContext<WebsiteContextValue | null>(null);

export function WebsiteProvider({
  provider,
  children,
}: {
  provider: ProviderWebsiteData;
  children: ReactNode;
}) {
  const brandColor = provider.profile.intakeFormSettings.background_color;
  const contrastColor = getContrastingTextColor(brandColor);

  const isActiveSubscription =
    provider.profile.subscriptionStatus === "active" ||
    provider.profile.subscriptionStatus === "trialing";
  const isPremium =
    provider.profile.planTier !== "free" && isActiveSubscription;

  const showWatermark = !isPremium;

  return (
    <WebsiteContext.Provider
      value={{
        provider,
        brandColor,
        contrastColor,
        isPremium,
        showWatermark,
      }}
    >
      {children}
    </WebsiteContext.Provider>
  );
}

export function useWebsite() {
  const context = useContext(WebsiteContext);
  if (!context) {
    throw new Error("useWebsite must be used within a WebsiteProvider");
  }
  return context;
}
