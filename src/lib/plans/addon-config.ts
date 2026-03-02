import { ADDON_PRICE_IDS } from "@/lib/stripe/config";

export type AddonType = keyof typeof ADDON_PRICE_IDS;

export interface ActiveAddon {
  id: string;
  addonType: AddonType;
  quantity: number;
  status: string;
  stripeSubscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  grandfatheredUntil: string | null;
  createdAt: string;
}

export interface EffectiveLimits {
  maxLocations: number;
  maxJobPostings: number;
  maxUsers: number;
  maxStorageGB: number;
  hasHomepagePlacement: boolean;
}

/** Human-readable labels and unit info for each addon type */
export const ADDON_INFO: Record<
  AddonType,
  { label: string; unitLabel: string; unitsPerPack: number; pricePerPack: number; priceLabel: string }
> = {
  extra_users: {
    label: "Extra Users",
    unitLabel: "user",
    unitsPerPack: 1,
    pricePerPack: 20,
    priceLabel: "$20/user/mo",
  },
  location_pack: {
    label: "Extra Locations",
    unitLabel: "location",
    unitsPerPack: 5,
    pricePerPack: 15,
    priceLabel: "$15/mo for 5 extra locations",
  },
  job_pack: {
    label: "Extra Jobs",
    unitLabel: "job posting",
    unitsPerPack: 5,
    pricePerPack: 15,
    priceLabel: "$15/mo for 5 extra jobs",
  },
  storage_pack: {
    label: "Extra Storage",
    unitLabel: "GB",
    unitsPerPack: 10,
    pricePerPack: 5,
    priceLabel: "$5/mo for 10GB extra storage",
  },
  homepage_placement: {
    label: "Homepage Placement on FindABATherapy.org",
    unitLabel: "placement",
    unitsPerPack: 1,
    pricePerPack: 149,
    priceLabel: "$149/mo on FindABATherapy.org",
  },
};
