export type SocialCategory =
  | "aba_observance"
  | "autism_observance"
  | "national_holiday"
  | "seasonal"
  | "aba_tip"
  | "quote"
  | "announcement";

export type LayoutId =
  | "bold-quote"
  | "event-banner"
  | "tip-card"
  | "split-block"
  | "announcement"
  | "minimal";

export interface SocialTemplate {
  id: string;
  title: string;
  caption: string;
  hashtags: string;
  category: SocialCategory;
  layoutId: LayoutId;
  layoutProps: {
    headline: string;
    subline?: string;
    accent?: string;
  };
  /** MM-DD for dated templates, null for evergreen */
  eventDate: string | null;
  /** Human-readable date label */
  eventDateLabel?: string;
}

export interface BrandData {
  agencyName: string;
  logoUrl: string | null;
  brandColor: string;
  profileId: string;
}

export const CATEGORY_LABELS: Record<SocialCategory, string> = {
  aba_observance: "ABA Observance",
  autism_observance: "Autism Observance",
  national_holiday: "Holiday",
  seasonal: "Seasonal",
  aba_tip: "ABA Tip",
  quote: "Quote",
  announcement: "Announcement",
};

export const CATEGORY_COLORS: Record<SocialCategory, string> = {
  aba_observance: "bg-blue-100 text-blue-800",
  autism_observance: "bg-violet-100 text-violet-800",
  national_holiday: "bg-red-100 text-red-800",
  seasonal: "bg-amber-100 text-amber-800",
  aba_tip: "bg-emerald-100 text-emerald-800",
  quote: "bg-pink-100 text-pink-800",
  announcement: "bg-indigo-100 text-indigo-800",
};
