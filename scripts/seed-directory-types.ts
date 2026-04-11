export type SeedDirectoryProfile = {
  id: string;
  agencyName: string;
  contactEmail: string;
  contactPhone: string | null;
  website: string | null;
  planTier: string | null;
  subscriptionStatus: string | null;
  onboardingCompletedAt: string | null;
  intakeFormSettings: unknown;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SeedDirectoryListing = {
  id: string;
  profileId: string;
  slug: string;
  headline: string | null;
  description: string | null;
  summary: string | null;
  serviceModes: string[];
  status: string | null;
  isAcceptingClients: boolean | null;
  videoUrl: string | null;
  logoUrl: string | null;
  careersBrandColor: string | null;
  careersHeadline: string | null;
  careersCtaText: string | null;
  careersHideBadge: boolean | null;
  clientIntakeEnabled: boolean | null;
  websitePublished: boolean | null;
  websiteSettings: unknown;
  publishedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SeedDirectoryLocation = {
  id: string;
  listingId: string;
  label: string | null;
  street: string | null;
  city: string;
  state: string;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  isPrimary: boolean | null;
  isFeatured: boolean | null;
  serviceRadiusMiles: number | null;
  serviceMode: string | null;
  serviceTypes: string[];
  insurances: string[];
  googlePlaceId: string | null;
  googleRating: number | null;
  googleRatingCount: number | null;
  showGoogleReviews: boolean | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactWebsite: string | null;
  useCompanyContact: boolean | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SeedDirectoryListingAttribute = {
  id: string;
  listingId: string;
  attributeKey: string;
  value: unknown;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SeedDirectoryMediaAsset = {
  id: string;
  listingId: string;
  mediaType: "logo" | "photo" | "video";
  bucket: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  byteSize: number;
  sortOrder: number;
  title: string | null;
  publicUrl: string | null;
  storageId?: string | null;
  createdAt: string | null;
};

export type SeedDirectoryGoogleReview = {
  id: string;
  locationId: string;
  reviewId: string;
  authorName: string;
  authorPhotoUrl: string | null;
  rating: number;
  text: string | null;
  relativeTimeDescription: string | null;
  publishedAt: string | null;
  isSelected: boolean;
  fetchedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SeedDirectoryGooglePlacesListing = {
  id: string;
  googlePlaceId: string;
  name: string;
  slug: string;
  street: string | null;
  city: string;
  state: string;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  formattedAddress: string | null;
  phone: string | null;
  website: string | null;
  googleRating: number | null;
  googleRatingCount: number | null;
  status: string | null;
  claimedListingId: string | null;
  claimedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SeedDirectoryCustomDomain = {
  id: string;
  profileId: string;
  listingId: string;
  domain: string;
  status: string | null;
  verificationToken: string | null;
  verifiedAt: string | null;
  vercelDomainId: string | null;
  errorMessage: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SeedDirectoryExportPayload = {
  exportedAt: string;
  source: {
    dataSourceUrl: string;
    seededProfileCount: number;
  };
  profiles: SeedDirectoryProfile[];
  listings: SeedDirectoryListing[];
  locations: SeedDirectoryLocation[];
  listingAttributes: SeedDirectoryListingAttribute[];
  mediaAssets: SeedDirectoryMediaAsset[];
  googleReviews: SeedDirectoryGoogleReview[];
  googlePlacesListings: SeedDirectoryGooglePlacesListing[];
  customDomains: SeedDirectoryCustomDomain[];
};
