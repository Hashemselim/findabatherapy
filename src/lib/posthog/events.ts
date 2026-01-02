import posthog from "posthog-js";

// ============================================================================
// Event Names - All PostHog events in one place
// ============================================================================

export const POSTHOG_EVENTS = {
  // Search & Discovery
  SEARCH_PERFORMED: "search_performed",
  SEARCH_FILTER_APPLIED: "search_filter_applied",
  SEARCH_RESULT_CLICKED: "search_result_clicked",
  SEARCH_NO_RESULTS: "search_no_results",

  // Listing/Provider Views
  LISTING_VIEWED: "listing_viewed",
  LISTING_CONTACT_CLICKED: "listing_contact_clicked",
  LISTING_PHONE_CLICKED: "listing_phone_clicked",
  LISTING_EMAIL_CLICKED: "listing_email_clicked",
  LISTING_WEBSITE_CLICKED: "listing_website_clicked",
  LISTING_DIRECTIONS_CLICKED: "listing_directions_clicked",
  LISTING_SHARED: "listing_shared",

  // Inquiry Flow
  INQUIRY_FORM_STARTED: "inquiry_form_started",
  INQUIRY_FORM_SUBMITTED: "inquiry_form_submitted",
  INQUIRY_FORM_ERROR: "inquiry_form_error",

  // Get Listed Landing Page (CRO)
  GET_LISTED_PAGE_VIEWED: "get_listed_page_viewed",
  GET_LISTED_PRICING_VIEWED: "get_listed_pricing_viewed",
  GET_LISTED_PLAN_CTA_CLICKED: "get_listed_plan_cta_clicked",
  GET_LISTED_DEMO_CLICKED: "get_listed_demo_clicked",
  GET_LISTED_FAQ_VIEWED: "get_listed_faq_viewed",

  // Sign Up Flow (CRO)
  SIGNUP_PAGE_VIEWED: "signup_page_viewed",
  SIGNUP_METHOD_SELECTED: "signup_method_selected",
  SIGNUP_FORM_STARTED: "signup_form_started",
  SIGNUP_FORM_FIELD_COMPLETED: "signup_form_field_completed",
  SIGNUP_TERMS_ACCEPTED: "signup_terms_accepted",
  SIGNUP_CAPTCHA_COMPLETED: "signup_captcha_completed",
  SIGNUP_FORM_SUBMITTED: "signup_form_submitted",
  SIGNUP_FORM_ERROR: "signup_form_error",
  SIGNUP_EMAIL_SENT: "signup_email_sent",
  SIGNUP_COMPLETED: "signup_completed",

  // Onboarding Flow (CRO)
  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_STEP_VIEWED: "onboarding_step_viewed",
  ONBOARDING_STEP_COMPLETED: "onboarding_step_completed",
  ONBOARDING_FIELD_COMPLETED: "onboarding_field_completed",
  ONBOARDING_LOCATION_ADDED: "onboarding_location_added",
  ONBOARDING_PHOTO_UPLOADED: "onboarding_photo_uploaded",
  ONBOARDING_VIDEO_ADDED: "onboarding_video_added",
  ONBOARDING_PLAN_VIEWED: "onboarding_plan_viewed",
  ONBOARDING_PLAN_SELECTED: "onboarding_plan_selected",
  ONBOARDING_COMPLETED: "onboarding_completed",
  ONBOARDING_ABANDONED: "onboarding_abandoned",
  ONBOARDING_SKIPPED_STEP: "onboarding_skipped_step",

  // Checkout & Subscription (CRO)
  CHECKOUT_PAGE_VIEWED: "checkout_page_viewed",
  CHECKOUT_STARTED: "checkout_started",
  CHECKOUT_PLAN_SELECTED: "checkout_plan_selected",
  CHECKOUT_BILLING_INTERVAL_CHANGED: "checkout_billing_interval_changed",
  CHECKOUT_STRIPE_REDIRECT: "checkout_stripe_redirect",
  CHECKOUT_COMPLETED: "checkout_completed",
  CHECKOUT_ABANDONED: "checkout_abandoned",
  CHECKOUT_ERROR: "checkout_error",
  SUBSCRIPTION_UPGRADED: "subscription_upgraded",
  SUBSCRIPTION_DOWNGRADED: "subscription_downgraded",
  SUBSCRIPTION_CANCELLED: "subscription_cancelled",

  // Dashboard
  DASHBOARD_VIEWED: "dashboard_viewed",
  DASHBOARD_LISTING_EDITED: "dashboard_listing_edited",
  DASHBOARD_LOCATION_ADDED: "dashboard_location_added",
  DASHBOARD_LOCATION_EDITED: "dashboard_location_edited",
  DASHBOARD_LOCATION_DELETED: "dashboard_location_deleted",
  DASHBOARD_PHOTO_UPLOADED: "dashboard_photo_uploaded",
  DASHBOARD_PHOTO_DELETED: "dashboard_photo_deleted",
  DASHBOARD_INQUIRY_VIEWED: "dashboard_inquiry_viewed",
  DASHBOARD_INQUIRY_RESPONDED: "dashboard_inquiry_responded",

  // Authentication
  AUTH_SIGNUP_STARTED: "auth_signup_started",
  AUTH_SIGNUP_COMPLETED: "auth_signup_completed",
  AUTH_LOGIN: "auth_login",
  AUTH_LOGOUT: "auth_logout",
  AUTH_PASSWORD_RESET_REQUESTED: "auth_password_reset_requested",

  // Errors
  ERROR_OCCURRED: "error_occurred",
  API_ERROR: "api_error",
  FORM_VALIDATION_ERROR: "form_validation_error",

  // Engagement
  CTA_CLICKED: "cta_clicked",
  EXTERNAL_LINK_CLICKED: "external_link_clicked",
  FAQ_EXPANDED: "faq_expanded",
  FEEDBACK_SUBMITTED: "feedback_submitted",
} as const;

export type PostHogEventName = (typeof POSTHOG_EVENTS)[keyof typeof POSTHOG_EVENTS];

// ============================================================================
// Type-safe tracking functions
// ============================================================================

// Generic capture with safety check
function capture(event: PostHogEventName, properties?: Record<string, unknown>) {
  if (typeof window !== "undefined" && posthog) {
    posthog.capture(event, properties);
  }
}

// ============================================================================
// Search & Discovery Events
// ============================================================================

export function trackSearch(params: {
  query?: string;
  location?: string;
  state?: string;
  city?: string;
  serviceTypes?: string[];
  insurances?: string[];
  languages?: string[];
  agesServedMin?: number;
  agesServedMax?: number;
  acceptingClients?: boolean;
  resultsCount: number;
  page?: number;
}) {
  // All params as top-level properties for better analytics segmentation
  capture(POSTHOG_EVENTS.SEARCH_PERFORMED, {
    query: params.query,
    location: params.location,
    state: params.state,
    city: params.city,
    service_types: params.serviceTypes,
    insurances: params.insurances,
    languages: params.languages,
    ages_served_min: params.agesServedMin,
    ages_served_max: params.agesServedMax,
    accepting_clients: params.acceptingClients,
    results_count: params.resultsCount,
    page: params.page,
  });

  if (params.resultsCount === 0) {
    capture(POSTHOG_EVENTS.SEARCH_NO_RESULTS, {
      query: params.query,
      location: params.location,
      state: params.state,
      city: params.city,
      service_types: params.serviceTypes,
      insurances: params.insurances,
    });
  }
}

export function trackSearchFilterApplied(params: {
  filterType: string;
  filterValue: string | string[];
  totalFiltersActive: number;
}) {
  capture(POSTHOG_EVENTS.SEARCH_FILTER_APPLIED, params);
}

export function trackSearchResultClicked(params: {
  listingId: string;
  listingName: string;
  position: number;
  searchQuery?: string;
  isFeatured?: boolean;
}) {
  capture(POSTHOG_EVENTS.SEARCH_RESULT_CLICKED, params);
}

// ============================================================================
// Listing/Provider Events
// ============================================================================

export function trackListingViewed(params: {
  listingId: string;
  listingSlug: string;
  listingName: string;
  city?: string;
  state?: string;
  planTier?: string;
  source?: "search" | "direct" | "state_page" | "city_page" | "homepage";
}) {
  capture(POSTHOG_EVENTS.LISTING_VIEWED, params);
}

export function trackListingContactClicked(params: {
  listingId: string;
  listingName: string;
  contactType: "phone" | "email" | "website" | "directions" | "inquiry_form";
  city?: string;
  state?: string;
}) {
  const eventMap = {
    phone: POSTHOG_EVENTS.LISTING_PHONE_CLICKED,
    email: POSTHOG_EVENTS.LISTING_EMAIL_CLICKED,
    website: POSTHOG_EVENTS.LISTING_WEBSITE_CLICKED,
    directions: POSTHOG_EVENTS.LISTING_DIRECTIONS_CLICKED,
    inquiry_form: POSTHOG_EVENTS.LISTING_CONTACT_CLICKED,
  };

  capture(eventMap[params.contactType], params);
}

export function trackListingShared(params: {
  listingId: string;
  listingName: string;
  shareMethod: "copy_link" | "native_share" | "email" | "social";
}) {
  capture(POSTHOG_EVENTS.LISTING_SHARED, params);
}

// ============================================================================
// Inquiry Events
// ============================================================================

export function trackInquiryFormStarted(params: {
  listingId: string;
  listingName: string;
}) {
  capture(POSTHOG_EVENTS.INQUIRY_FORM_STARTED, params);
}

export function trackInquiryFormSubmitted(params: {
  listingId: string;
  listingName: string;
  inquiryId?: string;
}) {
  capture(POSTHOG_EVENTS.INQUIRY_FORM_SUBMITTED, params);
}

export function trackInquiryFormError(params: {
  listingId: string;
  errorType: string;
  errorMessage?: string;
}) {
  capture(POSTHOG_EVENTS.INQUIRY_FORM_ERROR, params);
}

// ============================================================================
// Get Listed Landing Page Events (CRO)
// ============================================================================

export function trackGetListedPageViewed(params: {
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}) {
  capture(POSTHOG_EVENTS.GET_LISTED_PAGE_VIEWED, {
    referrer: params.referrer,
    utm_source: params.utmSource,
    utm_medium: params.utmMedium,
    utm_campaign: params.utmCampaign,
  });
}

export function trackGetListedPricingViewed() {
  capture(POSTHOG_EVENTS.GET_LISTED_PRICING_VIEWED, {});
}

export function trackGetListedPlanCtaClicked(params: {
  planTier: "free" | "pro" | "enterprise";
  billingInterval?: "monthly" | "annual";
  ctaText: string;
  ctaPosition: "hero" | "pricing" | "footer";
}) {
  capture(POSTHOG_EVENTS.GET_LISTED_PLAN_CTA_CLICKED, {
    plan_tier: params.planTier,
    billing_interval: params.billingInterval,
    cta_text: params.ctaText,
    cta_position: params.ctaPosition,
  });
}

export function trackGetListedDemoClicked(params: {
  ctaPosition: "hero" | "pricing" | "features";
}) {
  capture(POSTHOG_EVENTS.GET_LISTED_DEMO_CLICKED, {
    cta_position: params.ctaPosition,
  });
}

export function trackGetListedFaqViewed(params: {
  question: string;
  questionIndex: number;
}) {
  capture(POSTHOG_EVENTS.GET_LISTED_FAQ_VIEWED, {
    question: params.question,
    question_index: params.questionIndex,
  });
}

// ============================================================================
// Sign Up Flow Events (CRO)
// ============================================================================

export function trackSignupPageViewed(params: {
  selectedPlan?: string;
  billingInterval?: string;
  referrer?: string;
}) {
  capture(POSTHOG_EVENTS.SIGNUP_PAGE_VIEWED, {
    selected_plan: params.selectedPlan,
    billing_interval: params.billingInterval,
    referrer: params.referrer,
  });
}

export function trackSignupMethodSelected(params: {
  method: "google" | "microsoft" | "email";
  selectedPlan?: string;
}) {
  capture(POSTHOG_EVENTS.SIGNUP_METHOD_SELECTED, {
    method: params.method,
    selected_plan: params.selectedPlan,
  });
}

export function trackSignupFormStarted(params: {
  selectedPlan?: string;
}) {
  capture(POSTHOG_EVENTS.SIGNUP_FORM_STARTED, {
    selected_plan: params.selectedPlan,
  });
}

export function trackSignupFormFieldCompleted(params: {
  field: "email" | "password";
  selectedPlan?: string;
}) {
  capture(POSTHOG_EVENTS.SIGNUP_FORM_FIELD_COMPLETED, {
    field: params.field,
    selected_plan: params.selectedPlan,
  });
}

export function trackSignupTermsAccepted(params: {
  selectedPlan?: string;
}) {
  capture(POSTHOG_EVENTS.SIGNUP_TERMS_ACCEPTED, {
    selected_plan: params.selectedPlan,
  });
}

export function trackSignupCaptchaCompleted(params: {
  selectedPlan?: string;
}) {
  capture(POSTHOG_EVENTS.SIGNUP_CAPTCHA_COMPLETED, {
    selected_plan: params.selectedPlan,
  });
}

export function trackSignupFormSubmitted(params: {
  method: "email" | "google" | "microsoft";
  selectedPlan?: string;
  billingInterval?: string;
}) {
  capture(POSTHOG_EVENTS.SIGNUP_FORM_SUBMITTED, {
    method: params.method,
    selected_plan: params.selectedPlan,
    billing_interval: params.billingInterval,
  });
}

export function trackSignupFormError(params: {
  errorMessage: string;
  field?: string;
  selectedPlan?: string;
}) {
  capture(POSTHOG_EVENTS.SIGNUP_FORM_ERROR, {
    error_message: params.errorMessage,
    field: params.field,
    selected_plan: params.selectedPlan,
  });
}

export function trackSignupEmailSent(params: {
  selectedPlan?: string;
}) {
  capture(POSTHOG_EVENTS.SIGNUP_EMAIL_SENT, {
    selected_plan: params.selectedPlan,
  });
}

export function trackSignupCompleted(params: {
  method: "email" | "google" | "microsoft";
  selectedPlan?: string;
  billingInterval?: string;
}) {
  capture(POSTHOG_EVENTS.SIGNUP_COMPLETED, {
    method: params.method,
    selected_plan: params.selectedPlan,
    billing_interval: params.billingInterval,
  });
}

// ============================================================================
// Onboarding Events (CRO)
// ============================================================================

export function trackOnboardingStarted(params?: {
  selectedPlan?: string;
}) {
  capture(POSTHOG_EVENTS.ONBOARDING_STARTED, {
    selected_plan: params?.selectedPlan,
  });
}

export function trackOnboardingStepViewed(params: {
  step: string;
  stepNumber: number;
  totalSteps: number;
}) {
  capture(POSTHOG_EVENTS.ONBOARDING_STEP_VIEWED, {
    step: params.step,
    step_number: params.stepNumber,
    total_steps: params.totalSteps,
  });
}

export function trackOnboardingStepCompleted(params: {
  step: string;
  stepNumber: number;
  totalSteps: number;
  timeOnStepSeconds?: number;
}) {
  capture(POSTHOG_EVENTS.ONBOARDING_STEP_COMPLETED, {
    step: params.step,
    step_number: params.stepNumber,
    total_steps: params.totalSteps,
    time_on_step_seconds: params.timeOnStepSeconds,
  });
}

export function trackOnboardingFieldCompleted(params: {
  step: string;
  field: string;
  hasValue: boolean;
}) {
  capture(POSTHOG_EVENTS.ONBOARDING_FIELD_COMPLETED, {
    step: params.step,
    field: params.field,
    has_value: params.hasValue,
  });
}

export function trackOnboardingLocationAdded(params: {
  locationIndex: number;
  city?: string;
  state?: string;
  hasAddress: boolean;
}) {
  capture(POSTHOG_EVENTS.ONBOARDING_LOCATION_ADDED, {
    location_index: params.locationIndex,
    city: params.city,
    state: params.state,
    has_address: params.hasAddress,
  });
}

export function trackOnboardingPhotoUploaded(params: {
  photoCount: number;
}) {
  capture(POSTHOG_EVENTS.ONBOARDING_PHOTO_UPLOADED, {
    photo_count: params.photoCount,
  });
}

export function trackOnboardingVideoAdded() {
  capture(POSTHOG_EVENTS.ONBOARDING_VIDEO_ADDED, {});
}

export function trackOnboardingPlanViewed(params: {
  currentPlan?: string;
}) {
  capture(POSTHOG_EVENTS.ONBOARDING_PLAN_VIEWED, {
    current_plan: params.currentPlan,
  });
}

export function trackOnboardingPlanSelected(params: {
  planTier: string;
  billingInterval: "monthly" | "annual";
  previousPlan?: string;
}) {
  capture(POSTHOG_EVENTS.ONBOARDING_PLAN_SELECTED, {
    plan_tier: params.planTier,
    billing_interval: params.billingInterval,
    previous_plan: params.previousPlan,
  });
}

export function trackOnboardingCompleted(params: {
  totalTimeSeconds?: number;
  planSelected?: string;
  locationsCount?: number;
  photosCount?: number;
  hasVideo?: boolean;
}) {
  capture(POSTHOG_EVENTS.ONBOARDING_COMPLETED, {
    total_time_seconds: params.totalTimeSeconds,
    plan_selected: params.planSelected,
    locations_count: params.locationsCount,
    photos_count: params.photosCount,
    has_video: params.hasVideo,
  });
}

export function trackOnboardingAbandoned(params: {
  lastStep: string;
  stepNumber: number;
  timeSpentSeconds?: number;
}) {
  capture(POSTHOG_EVENTS.ONBOARDING_ABANDONED, {
    last_step: params.lastStep,
    step_number: params.stepNumber,
    time_spent_seconds: params.timeSpentSeconds,
  });
}

export function trackOnboardingSkippedStep(params: {
  step: string;
  stepNumber: number;
}) {
  capture(POSTHOG_EVENTS.ONBOARDING_SKIPPED_STEP, {
    step: params.step,
    step_number: params.stepNumber,
  });
}

// ============================================================================
// Checkout & Subscription Events (CRO)
// ============================================================================

export function trackCheckoutPageViewed(params: {
  planTier: string;
  billingInterval: "month" | "year";
  source?: string;
}) {
  capture(POSTHOG_EVENTS.CHECKOUT_PAGE_VIEWED, {
    plan_tier: params.planTier,
    billing_interval: params.billingInterval,
    source: params.source,
  });
}

export function trackCheckoutStarted(params: {
  planTier: string;
  billingInterval: "month" | "year";
  source?: string;
}) {
  capture(POSTHOG_EVENTS.CHECKOUT_STARTED, {
    plan_tier: params.planTier,
    billing_interval: params.billingInterval,
    source: params.source,
  });
}

export function trackCheckoutPlanSelected(params: {
  planTier: string;
  billingInterval: "month" | "year";
  previousPlan?: string;
}) {
  capture(POSTHOG_EVENTS.CHECKOUT_PLAN_SELECTED, {
    plan_tier: params.planTier,
    billing_interval: params.billingInterval,
    previous_plan: params.previousPlan,
  });
}

export function trackCheckoutBillingIntervalChanged(params: {
  planTier: string;
  fromInterval: "month" | "year";
  toInterval: "month" | "year";
}) {
  capture(POSTHOG_EVENTS.CHECKOUT_BILLING_INTERVAL_CHANGED, {
    plan_tier: params.planTier,
    from_interval: params.fromInterval,
    to_interval: params.toInterval,
  });
}

export function trackCheckoutStripeRedirect(params: {
  planTier: string;
  billingInterval: "month" | "year";
}) {
  capture(POSTHOG_EVENTS.CHECKOUT_STRIPE_REDIRECT, {
    plan_tier: params.planTier,
    billing_interval: params.billingInterval,
  });
}

export function trackCheckoutCompleted(params: {
  planTier: string;
  billingInterval: "month" | "year";
  revenue?: number;
  currency?: string;
}) {
  capture(POSTHOG_EVENTS.CHECKOUT_COMPLETED, {
    plan_tier: params.planTier,
    billing_interval: params.billingInterval,
    revenue: params.revenue,
    currency: params.currency,
    $set: { plan_tier: params.planTier, billing_interval: params.billingInterval },
  });
}

export function trackCheckoutAbandoned(params: {
  planTier: string;
  billingInterval: "month" | "year";
  step?: string;
  timeSpentSeconds?: number;
}) {
  capture(POSTHOG_EVENTS.CHECKOUT_ABANDONED, {
    plan_tier: params.planTier,
    billing_interval: params.billingInterval,
    step: params.step,
    time_spent_seconds: params.timeSpentSeconds,
  });
}

export function trackCheckoutError(params: {
  planTier: string;
  billingInterval: "month" | "year";
  errorMessage: string;
  errorCode?: string;
}) {
  capture(POSTHOG_EVENTS.CHECKOUT_ERROR, {
    plan_tier: params.planTier,
    billing_interval: params.billingInterval,
    error_message: params.errorMessage,
    error_code: params.errorCode,
  });
}

export function trackSubscriptionChange(params: {
  type: "upgraded" | "downgraded" | "cancelled";
  fromPlan?: string;
  toPlan?: string;
  reason?: string;
}) {
  const eventMap = {
    upgraded: POSTHOG_EVENTS.SUBSCRIPTION_UPGRADED,
    downgraded: POSTHOG_EVENTS.SUBSCRIPTION_DOWNGRADED,
    cancelled: POSTHOG_EVENTS.SUBSCRIPTION_CANCELLED,
  };

  capture(eventMap[params.type], {
    from_plan: params.fromPlan,
    to_plan: params.toPlan,
    reason: params.reason,
  });
}

// ============================================================================
// Dashboard Events
// ============================================================================

export function trackDashboardViewed(params: {
  section: "overview" | "listing" | "locations" | "inbox" | "analytics" | "settings";
}) {
  capture(POSTHOG_EVENTS.DASHBOARD_VIEWED, params);
}

export function trackDashboardListingEdited(params: {
  listingId: string;
  fieldsChanged: string[];
}) {
  capture(POSTHOG_EVENTS.DASHBOARD_LISTING_EDITED, params);
}

export function trackDashboardLocationAction(params: {
  action: "added" | "edited" | "deleted";
  locationId?: string;
  city?: string;
  state?: string;
}) {
  const eventMap = {
    added: POSTHOG_EVENTS.DASHBOARD_LOCATION_ADDED,
    edited: POSTHOG_EVENTS.DASHBOARD_LOCATION_EDITED,
    deleted: POSTHOG_EVENTS.DASHBOARD_LOCATION_DELETED,
  };

  capture(eventMap[params.action], params);
}

export function trackDashboardPhotoAction(params: {
  action: "uploaded" | "deleted";
  listingId: string;
  photoCount?: number;
}) {
  const event =
    params.action === "uploaded"
      ? POSTHOG_EVENTS.DASHBOARD_PHOTO_UPLOADED
      : POSTHOG_EVENTS.DASHBOARD_PHOTO_DELETED;

  capture(event, params);
}

export function trackDashboardInquiryViewed(params: {
  inquiryId: string;
  listingId: string;
}) {
  capture(POSTHOG_EVENTS.DASHBOARD_INQUIRY_VIEWED, params);
}

export function trackDashboardInquiryResponded(params: {
  inquiryId: string;
  listingId: string;
  responseTime?: number; // seconds since inquiry received
}) {
  capture(POSTHOG_EVENTS.DASHBOARD_INQUIRY_RESPONDED, params);
}

// ============================================================================
// Authentication Events
// ============================================================================

export function trackAuthSignupStarted(params: { source?: string }) {
  capture(POSTHOG_EVENTS.AUTH_SIGNUP_STARTED, params);
}

export function trackAuthSignupCompleted(params: { source?: string }) {
  capture(POSTHOG_EVENTS.AUTH_SIGNUP_COMPLETED, params);
}

export function trackAuthLogin(params: { method?: "email" | "google" | "magic_link" }) {
  capture(POSTHOG_EVENTS.AUTH_LOGIN, params);
}

export function trackAuthLogout() {
  capture(POSTHOG_EVENTS.AUTH_LOGOUT, {});
}

// ============================================================================
// Error Tracking
// ============================================================================

export function trackError(params: {
  errorType: "api" | "form_validation" | "runtime" | "network";
  errorMessage: string;
  errorCode?: string | number;
  componentName?: string;
  additionalData?: Record<string, unknown>;
}) {
  const event =
    params.errorType === "api"
      ? POSTHOG_EVENTS.API_ERROR
      : params.errorType === "form_validation"
        ? POSTHOG_EVENTS.FORM_VALIDATION_ERROR
        : POSTHOG_EVENTS.ERROR_OCCURRED;

  capture(event, {
    error_type: params.errorType,
    error_message: params.errorMessage,
    error_code: params.errorCode,
    component: params.componentName,
    ...params.additionalData,
  });
}

// ============================================================================
// Engagement Events
// ============================================================================

export function trackCtaClicked(params: {
  ctaName: string;
  ctaLocation: string;
  ctaText?: string;
}) {
  capture(POSTHOG_EVENTS.CTA_CLICKED, params);
}

export function trackExternalLinkClicked(params: {
  url: string;
  linkText?: string;
  location: string;
}) {
  capture(POSTHOG_EVENTS.EXTERNAL_LINK_CLICKED, params);
}

export function trackFaqExpanded(params: {
  question: string;
  pageLocation: string;
}) {
  capture(POSTHOG_EVENTS.FAQ_EXPANDED, params);
}

export function trackFeedbackSubmitted(params: {
  feedbackType: string;
  rating?: number;
  hasComment: boolean;
}) {
  capture(POSTHOG_EVENTS.FEEDBACK_SUBMITTED, params);
}

// ============================================================================
// User Properties (for segmentation)
// ============================================================================

export function setUserProperties(properties: {
  plan_tier?: string;
  billing_interval?: string;
  agency_name?: string;
  locations_count?: number;
  has_published_listing?: boolean;
  signup_date?: string;
}) {
  if (typeof window !== "undefined" && posthog) {
    posthog.setPersonProperties(properties);
  }
}

// ============================================================================
// Group Analytics (for B2B - track by agency)
// ============================================================================

export function setAgencyGroup(agencyId: string, properties?: Record<string, unknown>) {
  if (typeof window !== "undefined" && posthog) {
    posthog.group("agency", agencyId, properties);
  }
}
