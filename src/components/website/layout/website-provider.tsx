"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ProviderWebsiteData } from "@/lib/actions/provider-website";

interface WebsiteContextValue {
  provider: ProviderWebsiteData;
  brandColor: string;
  contrastColor: string;
  isPremium: boolean;
  showWatermark: boolean;
}

const WebsiteContext = createContext<WebsiteContextValue | null>(null);

function getContrastColor(hexColor: string) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#1a1a2e" : "#FFFFFF";
}

export function WebsiteProvider({
  provider,
  children,
}: {
  provider: ProviderWebsiteData;
  children: ReactNode;
}) {
  const brandColor = provider.profile.intakeFormSettings.background_color;
  const contrastColor = getContrastColor(brandColor);

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
