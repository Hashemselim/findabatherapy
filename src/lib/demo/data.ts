import type { ListingWithRelations } from "@/lib/actions/listings";
import type { Inquiry } from "@/lib/actions/inquiries";
import type { ClientListItem } from "@/lib/actions/clients";
import type {
  PipelineSummary,
  AttentionItem,
  ActivityItem,
} from "@/lib/actions/pipeline";
import type { TeamMember } from "@/lib/actions/team";
import type { JobPostingSummary } from "@/lib/actions/jobs";
import type { ClientCommunication } from "@/lib/actions/communications";
import type { ReferralAnalytics } from "@/lib/actions/referral-analytics";

// Helper to generate dates relative to now
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const hoursAgo = (hours: number) => {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date.toISOString();
};

// Demo Profile
export const DEMO_PROFILE = {
  id: "demo-profile-id",
  agency_name: "Sunrise ABA Therapy",
  contact_email: "hello@sunriseaba.example.com",
  plan_tier: "pro" as const,
  has_featured_addon: true,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  onboarding_completed_at: daysAgo(180),
  created_at: daysAgo(200),
  updated_at: daysAgo(1),
};

// Demo Listing
export const DEMO_LISTING: ListingWithRelations = {
  id: "demo-listing-id",
  slug: "sunrise-aba-therapy",
  headline:
    "Compassionate, evidence-based ABA therapy for children of all abilities",
  description: `At Sunrise ABA Therapy, we believe every child deserves the opportunity to reach their full potential. Our team of Board Certified Behavior Analysts (BCBAs) and dedicated Registered Behavior Technicians (RBTs) work together with families to create individualized treatment plans that make a real difference.

We specialize in early intervention, social skills development, and helping children build independence in daily living activities. Our warm, child-centered approach ensures therapy feels like play while achieving meaningful goals.

Whether you're looking for center-based services in our state-of-the-art facilities or prefer in-home therapy in the comfort of your own space, we're here to support your family's journey.

Our services include:
- Comprehensive assessments and individualized treatment planning
- One-on-one ABA therapy sessions
- Social skills groups
- Parent training and family support
- School consultation and IEP support
- Feeding therapy
- Toilet training programs

We accept most major insurance plans and offer flexible scheduling to accommodate busy families.`,
  summary:
    "Family-centered ABA therapy with 5 convenient locations across California. Specializing in early intervention, social skills, and daily living skills for children ages 2-21.",
  serviceModes: ["center_based", "in_home", "telehealth"],
  status: "published",
  isAcceptingClients: true,
  logoUrl: "https://images.unsplash.com/photo-1607453998774-d533f65dac99?w=400&q=80",
  videoUrl: "https://www.youtube.com/watch?v=E1qUzSXZOlQ",
  publishedAt: daysAgo(175),
  createdAt: daysAgo(200),
  updatedAt: daysAgo(1),
  profile: {
    agencyName: "Sunrise ABA Therapy",
    contactEmail: "hello@sunriseaba.example.com",
    contactPhone: "(555) 123-4567",
    website: "https://sunriseaba.example.com",
    planTier: "pro",
    subscriptionStatus: "active",
    intakeFormSettings: {
      background_color: "#0866FF",
      show_powered_by: true,
    },
  },
  primaryLocation: {
    id: "demo-loc-1",
    street: "123 Therapy Lane",
    city: "Los Angeles",
    state: "CA",
    postalCode: "90001",
    latitude: 34.0522,
    longitude: -118.2437,
    serviceRadiusMiles: 25,
  },
  locations: [
    {
      id: "demo-loc-1",
      label: "Main Office - Los Angeles",
      serviceMode: "both",
      street: "123 Therapy Lane",
      city: "Los Angeles",
      state: "CA",
      postalCode: "90001",
      latitude: 34.0522,
      longitude: -118.2437,
      serviceRadiusMiles: 25,
      insurances: [
        "Blue Cross Blue Shield",
        "Aetna",
        "UnitedHealthcare",
        "Cigna",
        "Medicaid",
      ],
      isPrimary: true,
      isFeatured: true,
      googlePlaceId: "ChIJE9on3F3HwoAR9AhGJW_fL-I",
      googleRating: 4.8,
      googleRatingCount: 127,
    },
    {
      id: "demo-loc-2",
      label: "San Diego Center",
      serviceMode: "center_based",
      street: "456 Wellness Blvd",
      city: "San Diego",
      state: "CA",
      postalCode: "92101",
      latitude: 32.7157,
      longitude: -117.1611,
      serviceRadiusMiles: 20,
      insurances: [
        "Blue Cross Blue Shield",
        "Aetna",
        "UnitedHealthcare",
        "TRICARE",
      ],
      isPrimary: false,
      isFeatured: false,
      googlePlaceId: "ChIJSx6SrQ9T2YARed8V_f0hOg0",
      googleRating: 4.9,
      googleRatingCount: 89,
    },
    {
      id: "demo-loc-3",
      label: "San Francisco Bay Area",
      serviceMode: "in_home",
      street: null,
      city: "San Francisco",
      state: "CA",
      postalCode: "94102",
      latitude: 37.7749,
      longitude: -122.4194,
      serviceRadiusMiles: 30,
      insurances: ["Blue Cross Blue Shield", "Aetna", "Kaiser Permanente"],
      isPrimary: false,
      isFeatured: false,
      googlePlaceId: null,
      googleRating: null,
      googleRatingCount: null,
    },
    {
      id: "demo-loc-4",
      label: "Sacramento Office",
      serviceMode: "both",
      street: "789 Capitol Ave",
      city: "Sacramento",
      state: "CA",
      postalCode: "95814",
      latitude: 38.5816,
      longitude: -121.4944,
      serviceRadiusMiles: 25,
      insurances: ["Blue Cross Blue Shield", "Medicaid", "UnitedHealthcare"],
      isPrimary: false,
      isFeatured: false,
      googlePlaceId: "ChIJ-ZeDsnLGmoAR238ZdKpqH5I",
      googleRating: 4.7,
      googleRatingCount: 52,
    },
    {
      id: "demo-loc-5",
      label: "Irvine Center",
      serviceMode: "center_based",
      street: "321 Innovation Dr",
      city: "Irvine",
      state: "CA",
      postalCode: "92618",
      latitude: 33.6846,
      longitude: -117.8265,
      serviceRadiusMiles: 15,
      insurances: [
        "Blue Cross Blue Shield",
        "Aetna",
        "UnitedHealthcare",
        "Cigna",
      ],
      isPrimary: false,
      isFeatured: false,
      googlePlaceId: "ChIJAcpK3_ri3IAR7o_38Owk1GM",
      googleRating: 5.0,
      googleRatingCount: 34,
    },
  ],
  attributes: {
    insurances: [
      "Blue Cross Blue Shield",
      "Aetna",
      "UnitedHealthcare",
      "Cigna",
      "Medicaid",
      "TRICARE",
      "Kaiser Permanente",
    ],
    languages: ["English", "Spanish", "Mandarin"],
    diagnoses: [
      "Autism Spectrum Disorder (ASD)",
      "ADHD",
      "Developmental Delays",
      "Intellectual Disabilities",
    ],
    clinical_specialties: [
      "Early Intervention (0-3)",
      "Social Skills Groups",
      "Feeding Therapy",
      "Toilet Training",
      "Parent Training",
      "School Consultation",
    ],
    ages_served: { min: 2, max: 21 },
    contact_form_enabled: true,
  },
  photoUrls: [
    "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800&q=80",
    "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&q=80",
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80",
    "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&q=80",
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
  ],
};

// Demo Photos (for photo gallery manager)
export const DEMO_PHOTOS = [
  {
    id: "demo-photo-1",
    url: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800&q=80",
    order: 0,
  },
  {
    id: "demo-photo-2",
    url: "https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&q=80",
    order: 1,
  },
  {
    id: "demo-photo-3",
    url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80",
    order: 2,
  },
  {
    id: "demo-photo-4",
    url: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&q=80",
    order: 3,
  },
  {
    id: "demo-photo-5",
    url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
    order: 4,
  },
];

// Demo Inquiries
export const DEMO_INQUIRIES: Inquiry[] = [
  {
    id: "demo-inq-1",
    listingId: "demo-listing-id",
    familyName: "Emily Johnson",
    familyEmail: "emily.j@example.com",
    familyPhone: "(555) 234-5678",
    childAge: "4",
    message:
      "Hi, we recently received an autism diagnosis for our son and are looking for ABA services. We live in the Los Angeles area and would prefer in-home therapy. Do you have availability for new clients? We're particularly interested in early intervention services.",
    status: "unread",
    createdAt: hoursAgo(2),
    readAt: null,
    repliedAt: null,
    locationId: "demo-loc-1",
    location: {
      id: "demo-loc-1",
      label: "Main Office - Los Angeles",
      city: "Los Angeles",
      state: "CA",
    },
    source: "listing_page",
  },
  {
    id: "demo-inq-2",
    listingId: "demo-listing-id",
    familyName: "Michael Chen",
    familyEmail: "m.chen@example.com",
    familyPhone: "(555) 345-6789",
    childAge: "7",
    message:
      "Hello! My son has been receiving ABA therapy for 2 years and we're relocating to San Diego. We'd like to continue services without interruption. Can you tell me about your San Diego center and availability?",
    status: "unread",
    createdAt: hoursAgo(8),
    readAt: null,
    repliedAt: null,
    locationId: "demo-loc-2",
    location: {
      id: "demo-loc-2",
      label: "San Diego Center",
      city: "San Diego",
      state: "CA",
    },
    source: "intake_standalone",
  },
  {
    id: "demo-inq-3",
    listingId: "demo-listing-id",
    familyName: "Sarah Martinez",
    familyEmail: "sarah.m@example.com",
    familyPhone: "(555) 456-7890",
    childAge: "3",
    message:
      "We're interested in your early intervention program. Our daughter was recently diagnosed and our pediatrician recommended ABA therapy. Do you accept Blue Cross Blue Shield? What does the initial assessment process look like?",
    status: "unread",
    createdAt: daysAgo(1),
    readAt: null,
    repliedAt: null,
    locationId: "demo-loc-1",
    location: {
      id: "demo-loc-1",
      label: "Main Office - Los Angeles",
      city: "Los Angeles",
      state: "CA",
    },
    source: "listing_page",
  },
  {
    id: "demo-inq-4",
    listingId: "demo-listing-id",
    familyName: "David Williams",
    familyEmail: "d.williams@example.com",
    familyPhone: "(555) 567-8901",
    childAge: "10",
    message:
      "Hi there, I'm looking for a provider who offers social skills groups for my son. He's high-functioning and does well in one-on-one settings but struggles in group situations. Do you have any group programs available?",
    status: "read",
    createdAt: daysAgo(3),
    readAt: daysAgo(2),
    repliedAt: null,
    locationId: "demo-loc-4",
    location: {
      id: "demo-loc-4",
      label: "Sacramento Office",
      city: "Sacramento",
      state: "CA",
    },
    source: "listing_page",
  },
  {
    id: "demo-inq-5",
    listingId: "demo-listing-id",
    familyName: "Jennifer Lee",
    familyEmail: "j.lee@example.com",
    familyPhone: "(555) 678-9012",
    childAge: "5",
    message:
      "We're interested in your feeding therapy program. Our son has very limited food preferences and mealtimes are extremely challenging. We're in the Irvine area. Can you provide more information about this service?",
    status: "read",
    createdAt: daysAgo(5),
    readAt: daysAgo(4),
    repliedAt: null,
    locationId: "demo-loc-5",
    location: {
      id: "demo-loc-5",
      label: "Irvine Center",
      city: "Irvine",
      state: "CA",
    },
    source: "listing_page",
  },
  {
    id: "demo-inq-6",
    listingId: "demo-listing-id",
    familyName: "Robert Thompson",
    familyEmail: "r.thompson@example.com",
    familyPhone: "(555) 789-0123",
    childAge: "6",
    message:
      "Hello! We've been on several waitlists for ABA services. Our son needs help with toilet training and daily living skills. We have UnitedHealthcare. How long is your current wait time for new clients?",
    status: "replied",
    createdAt: daysAgo(7),
    readAt: daysAgo(6),
    repliedAt: daysAgo(5),
    locationId: "demo-loc-1",
    location: {
      id: "demo-loc-1",
      label: "Main Office - Los Angeles",
      city: "Los Angeles",
      state: "CA",
    },
    source: "listing_page",
  },
  {
    id: "demo-inq-7",
    listingId: "demo-listing-id",
    familyName: "Amanda Garcia",
    familyEmail: "a.garcia@example.com",
    familyPhone: "(555) 890-1234",
    childAge: "8",
    message:
      "We're looking for a Spanish-speaking BCBA for our daughter. Is that something you offer? We live in the San Francisco Bay Area and would prefer in-home services.",
    status: "replied",
    createdAt: daysAgo(10),
    readAt: daysAgo(9),
    repliedAt: daysAgo(8),
    locationId: "demo-loc-3",
    location: {
      id: "demo-loc-3",
      label: "San Francisco Bay Area",
      city: "San Francisco",
      state: "CA",
    },
    source: "intake_standalone",
  },
  {
    id: "demo-inq-8",
    listingId: "demo-listing-id",
    familyName: "Kevin Brown",
    familyEmail: "k.brown@example.com",
    familyPhone: null,
    childAge: "12",
    message:
      "My son's school IEP team recommended we look into ABA services. He's struggling with transitions and has some behavioral challenges at school. Do you offer school consultation services?",
    status: "read",
    createdAt: daysAgo(12),
    readAt: daysAgo(11),
    repliedAt: null,
    locationId: null,
    location: null,
    source: "listing_page",
  },
];

// Demo Analytics - Time series data for 30 days
const generateTimeSeries = (
  baseValue: number,
  variance: number,
  trend: number = 0
) => {
  const data: { date: string; value: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const trendFactor = 1 + (trend * (29 - i)) / 29;
    const randomVariance = 1 + (Math.random() - 0.5) * variance;
    const value = Math.round(baseValue * trendFactor * randomVariance);
    data.push({
      date: date.toISOString().split("T")[0],
      value: Math.max(0, value),
    });
  }
  return data;
};

export const DEMO_ANALYTICS = {
  current: {
    views: 1847,
    uniqueViews: 1423,
    searchImpressions: 12450,
    searchClicks: 892,
    clickThroughRate: 7.2,
    contactClicks: 234,
    inquiries: 34,
    conversionRate: 2.4,
  },
  previous: {
    views: 1523,
    uniqueViews: 1189,
    searchImpressions: 10200,
    searchClicks: 714,
    clickThroughRate: 7.0,
    contactClicks: 198,
    inquiries: 28,
    conversionRate: 2.4,
  },
  timeSeries: {
    views: generateTimeSeries(60, 0.4, 0.2),
    impressions: generateTimeSeries(400, 0.3, 0.22),
    clicks: generateTimeSeries(30, 0.5, 0.25),
  },
  topSources: [
    { source: "Google Search", count: 1023, percentage: 55.4 },
    { source: "Direct", count: 412, percentage: 22.3 },
    { source: "Facebook", count: 198, percentage: 10.7 },
    { source: "Insurance Directories", count: 156, percentage: 8.4 },
    { source: "Other", count: 58, percentage: 3.2 },
  ],
  byLocation: [
    {
      locationId: "demo-loc-1",
      label: "Main Office - Los Angeles",
      city: "Los Angeles",
      state: "CA",
      metrics: { views: 687, impressions: 4523, clicks: 342, ctr: 7.6 },
      timeSeries: {
        views: generateTimeSeries(23, 0.4, 0.2),
        impressions: generateTimeSeries(150, 0.3, 0.22),
        clicks: generateTimeSeries(11, 0.5, 0.25),
      },
    },
    {
      locationId: "demo-loc-2",
      label: "San Diego Center",
      city: "San Diego",
      state: "CA",
      metrics: { views: 412, impressions: 2890, clicks: 198, ctr: 6.9 },
      timeSeries: {
        views: generateTimeSeries(14, 0.4, 0.15),
        impressions: generateTimeSeries(96, 0.3, 0.18),
        clicks: generateTimeSeries(7, 0.5, 0.2),
      },
    },
    {
      locationId: "demo-loc-3",
      label: "San Francisco Bay Area",
      city: "San Francisco",
      state: "CA",
      metrics: { views: 324, impressions: 2234, clicks: 156, ctr: 7.0 },
      timeSeries: {
        views: generateTimeSeries(11, 0.4, 0.1),
        impressions: generateTimeSeries(74, 0.3, 0.12),
        clicks: generateTimeSeries(5, 0.5, 0.15),
      },
    },
    {
      locationId: "demo-loc-4",
      label: "Sacramento Office",
      city: "Sacramento",
      state: "CA",
      metrics: { views: 256, impressions: 1678, clicks: 112, ctr: 6.7 },
      timeSeries: {
        views: generateTimeSeries(9, 0.4, 0.08),
        impressions: generateTimeSeries(56, 0.3, 0.1),
        clicks: generateTimeSeries(4, 0.5, 0.12),
      },
    },
    {
      locationId: "demo-loc-5",
      label: "Irvine Center",
      city: "Irvine",
      state: "CA",
      metrics: { views: 168, impressions: 1125, clicks: 84, ctr: 7.5 },
      timeSeries: {
        views: generateTimeSeries(6, 0.4, 0.25),
        impressions: generateTimeSeries(38, 0.3, 0.28),
        clicks: generateTimeSeries(3, 0.5, 0.3),
      },
    },
  ],
};

// Demo Quick Stats for Overview page
export const DEMO_QUICK_STATS = {
  totalViews: DEMO_ANALYTICS.current.views,
  viewsChange: Math.round(
    ((DEMO_ANALYTICS.current.views - DEMO_ANALYTICS.previous.views) /
      DEMO_ANALYTICS.previous.views) *
      100
  ),
  totalInquiries: DEMO_ANALYTICS.current.inquiries,
  inquiriesChange: Math.round(
    ((DEMO_ANALYTICS.current.inquiries - DEMO_ANALYTICS.previous.inquiries) /
      DEMO_ANALYTICS.previous.inquiries) *
      100
  ),
  unreadInquiries: DEMO_INQUIRIES.filter((i) => i.status === "unread").length,
  listingStatus: "published" as const,
  planTier: "pro" as const,
  locationsCount: DEMO_LISTING.locations.length,
  featuredLocations: DEMO_LISTING.locations.filter((l) => l.isFeatured).length,
};

// Demo Onboarding Checklist (all complete for demo)
export const DEMO_ONBOARDING_CHECKLIST = {
  hasBasicInfo: true,
  hasLocation: true,
  hasServices: true,
  hasInsurances: true,
  hasDescription: true,
  hasPhotos: true,
  hasVideo: true,
  isPublished: true,
};

// =============================================================================
// DEMO CLIENTS
// =============================================================================

export const DEMO_CLIENTS: ClientListItem[] = [
  {
    id: "demo-client-1",
    status: "inquiry",
    child_first_name: "Liam",
    child_last_name: "Nguyen",
    child_date_of_birth: "2021-06-15",
    created_at: daysAgo(3),
    updated_at: daysAgo(3),
    primary_parent_name: "Trang Nguyen",
    primary_parent_phone: "(555) 201-3344",
    primary_parent_email: "trang.nguyen@example.com",
    primary_insurance_name: "Blue Cross Blue Shield",
    primary_insurance_member_id: "BCBS-884712",
  },
  {
    id: "demo-client-2",
    status: "inquiry",
    child_first_name: "Ava",
    child_last_name: "Patel",
    child_date_of_birth: "2020-11-02",
    created_at: daysAgo(5),
    updated_at: daysAgo(4),
    primary_parent_name: "Priya Patel",
    primary_parent_phone: "(555) 302-5567",
    primary_parent_email: "priya.patel@example.com",
    primary_insurance_name: "Aetna",
    primary_insurance_member_id: "AET-221098",
  },
  {
    id: "demo-client-3",
    status: "assessment",
    child_first_name: "Noah",
    child_last_name: "Rivera",
    child_date_of_birth: "2019-03-22",
    created_at: daysAgo(21),
    updated_at: daysAgo(2),
    primary_parent_name: "Maria Rivera",
    primary_parent_phone: "(555) 403-7789",
    primary_parent_email: "maria.r@example.com",
    primary_insurance_name: "UnitedHealthcare",
    primary_insurance_member_id: "UHC-556234",
  },
  {
    id: "demo-client-4",
    status: "authorization",
    child_first_name: "Sophia",
    child_last_name: "Kim",
    child_date_of_birth: "2020-08-10",
    created_at: daysAgo(30),
    updated_at: daysAgo(1),
    primary_parent_name: "Jisoo Kim",
    primary_parent_phone: "(555) 504-2211",
    primary_parent_email: "jisoo.kim@example.com",
    primary_insurance_name: "Cigna",
    primary_insurance_member_id: "CGN-778345",
  },
  {
    id: "demo-client-5",
    status: "active",
    child_first_name: "Ethan",
    child_last_name: "Williams",
    child_date_of_birth: "2018-01-30",
    created_at: daysAgo(75),
    updated_at: daysAgo(1),
    primary_parent_name: "Jessica Williams",
    primary_parent_phone: "(555) 605-8834",
    primary_parent_email: "j.williams@example.com",
    primary_insurance_name: "Blue Cross Blue Shield",
    primary_insurance_member_id: "BCBS-112978",
  },
  {
    id: "demo-client-6",
    status: "active",
    child_first_name: "Mia",
    child_last_name: "Garcia",
    child_date_of_birth: "2019-09-14",
    created_at: daysAgo(60),
    updated_at: daysAgo(3),
    primary_parent_name: "Carlos Garcia",
    primary_parent_phone: "(555) 706-4456",
    primary_parent_email: "c.garcia@example.com",
    primary_insurance_name: "Medicaid",
    primary_insurance_member_id: "MCD-443210",
  },
  {
    id: "demo-client-7",
    status: "active",
    child_first_name: "Oliver",
    child_last_name: "Thompson",
    child_date_of_birth: "2017-12-05",
    created_at: daysAgo(90),
    updated_at: daysAgo(5),
    primary_parent_name: "Rachel Thompson",
    primary_parent_phone: "(555) 807-9912",
    primary_parent_email: "rachel.t@example.com",
    primary_insurance_name: "TRICARE",
    primary_insurance_member_id: "TRI-667891",
  },
  {
    id: "demo-client-8",
    status: "discharged",
    child_first_name: "Emma",
    child_last_name: "Johnson",
    child_date_of_birth: "2016-04-18",
    created_at: daysAgo(180),
    updated_at: daysAgo(14),
    primary_parent_name: "David Johnson",
    primary_parent_phone: "(555) 908-3345",
    primary_parent_email: "d.johnson@example.com",
    primary_insurance_name: "Aetna",
    primary_insurance_member_id: "AET-998456",
  },
];

// Counts derived from DEMO_CLIENTS
export const DEMO_CLIENT_COUNTS = {
  total: DEMO_CLIENTS.length,
  inquiry: DEMO_CLIENTS.filter((c) => c.status === "inquiry").length,
  intake_pending: 0,
  waitlist: 0,
  assessment: DEMO_CLIENTS.filter((c) => c.status === "assessment").length,
  authorization: DEMO_CLIENTS.filter((c) => c.status === "authorization")
    .length,
  active: DEMO_CLIENTS.filter((c) => c.status === "active").length,
  on_hold: 0,
  discharged: DEMO_CLIENTS.filter((c) => c.status === "discharged").length,
};

// =============================================================================
// DEMO LEADS (inquiry-stage clients presented as leads)
// =============================================================================

export const DEMO_LEADS: ClientListItem[] = [
  {
    id: "demo-lead-1",
    status: "inquiry",
    child_first_name: "Harper",
    child_last_name: "Davis",
    child_date_of_birth: "2022-02-11",
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
    primary_parent_name: "Samantha Davis",
    primary_parent_phone: "(555) 110-2233",
    primary_parent_email: "sam.davis@example.com",
    primary_insurance_name: "Blue Cross Blue Shield",
    primary_insurance_member_id: "BCBS-332147",
  },
  {
    id: "demo-lead-2",
    status: "inquiry",
    child_first_name: "Lucas",
    child_last_name: "Martinez",
    child_date_of_birth: "2021-07-25",
    created_at: daysAgo(3),
    updated_at: daysAgo(2),
    primary_parent_name: "Ana Martinez",
    primary_parent_phone: "(555) 220-4455",
    primary_parent_email: "ana.m@example.com",
    primary_insurance_name: "Cigna",
    primary_insurance_member_id: "CGN-558901",
  },
  {
    id: "demo-lead-3",
    status: "inquiry",
    child_first_name: "Charlotte",
    child_last_name: "Brown",
    child_date_of_birth: "2020-12-08",
    created_at: daysAgo(6),
    updated_at: daysAgo(5),
    primary_parent_name: "Michael Brown",
    primary_parent_phone: "(555) 330-6677",
    primary_parent_email: "m.brown@example.com",
    primary_insurance_name: "UnitedHealthcare",
    primary_insurance_member_id: "UHC-774523",
  },
  {
    id: "demo-lead-4",
    status: "intake_pending",
    child_first_name: "James",
    child_last_name: "Wilson",
    child_date_of_birth: "2019-05-19",
    created_at: daysAgo(10),
    updated_at: daysAgo(7),
    primary_parent_name: "Laura Wilson",
    primary_parent_phone: "(555) 440-8899",
    primary_parent_email: "laura.w@example.com",
    primary_insurance_name: "Aetna",
    primary_insurance_member_id: "AET-119873",
  },
  {
    id: "demo-lead-5",
    status: "intake_pending",
    child_first_name: "Benjamin",
    child_last_name: "Taylor",
    child_date_of_birth: "2021-01-03",
    created_at: daysAgo(12),
    updated_at: daysAgo(8),
    primary_parent_name: "Christine Taylor",
    primary_parent_phone: "(555) 550-1122",
    primary_parent_email: "c.taylor@example.com",
    primary_insurance_name: "Kaiser Permanente",
    primary_insurance_member_id: "KP-665432",
  },
];

// =============================================================================
// DEMO PIPELINE STATS
// =============================================================================

export const DEMO_PIPELINE_STATS: PipelineSummary = {
  counts: {
    inquiry: 2,
    intake_pending: 2,
    waitlist: 1,
    assessment: 1,
    authorization: 1,
    active: 3,
    on_hold: 0,
    discharged: 1,
  },
  attentionItems: [
    {
      type: "expiring_auth",
      clientId: "demo-client-4",
      clientName: "Sophia Kim",
      description: "Insurance authorization expiring in 3 days",
      dueDate: new Date(
        Date.now() + 3 * 24 * 60 * 60 * 1000
      ).toISOString(),
    },
    {
      type: "stale_inquiry",
      clientId: "demo-lead-3",
      clientName: "Charlotte Brown",
      description: "No response to inquiry for 6 days",
      daysSince: 6,
    },
    {
      type: "overdue_task",
      clientId: "demo-client-5",
      clientName: "Ethan Williams",
      description: "Overdue: Submit treatment plan update",
      dueDate: daysAgo(2),
    },
    {
      type: "stale_waitlist",
      clientId: "demo-lead-5",
      clientName: "Benjamin Taylor",
      description: "On waitlist for 12 days without follow-up",
      daysSince: 12,
    },
  ] satisfies AttentionItem[],
  recentActivity: [
    {
      type: "new_client",
      clientId: "demo-lead-1",
      clientName: "Harper Davis",
      description: "New inquiry submitted via website",
      timestamp: daysAgo(1),
    },
    {
      type: "status_change",
      clientId: "demo-client-3",
      clientName: "Noah Rivera",
      description: "Moved to Assessment stage",
      timestamp: daysAgo(2),
    },
    {
      type: "communication_sent",
      clientId: "demo-client-5",
      clientName: "Ethan Williams",
      description: "Session reminder email sent",
      timestamp: daysAgo(2),
    },
    {
      type: "task_completed",
      clientId: "demo-client-6",
      clientName: "Mia Garcia",
      description: "Completed: Initial assessment report",
      timestamp: daysAgo(3),
    },
    {
      type: "status_change",
      clientId: "demo-client-4",
      clientName: "Sophia Kim",
      description: "Insurance verification completed",
      timestamp: daysAgo(4),
    },
    {
      type: "new_client",
      clientId: "demo-lead-2",
      clientName: "Lucas Martinez",
      description: "New inquiry via pediatrician referral",
      timestamp: daysAgo(3),
    },
  ] satisfies ActivityItem[],
};

// =============================================================================
// DEMO TASKS
// =============================================================================

export const DEMO_TASKS = [
  {
    id: "demo-task-1",
    client_id: "demo-client-5",
    profile_id: "demo-profile-id",
    title: "Submit treatment plan update",
    content: "Quarterly treatment plan update due for Ethan Williams. Review goals and update progress notes.",
    status: "pending" as const,
    due_date: daysAgo(2),
    reminder_at: null,
    created_at: daysAgo(10),
    updated_at: daysAgo(2),
    completed_at: null,
    deleted_at: null,
    client_name: "Ethan Williams",
  },
  {
    id: "demo-task-2",
    client_id: "demo-client-4",
    profile_id: "demo-profile-id",
    title: "Follow up on insurance authorization",
    content: "Cigna authorization for Sophia Kim expires soon. Contact representative to request extension.",
    status: "pending" as const,
    due_date: daysAgo(1),
    reminder_at: null,
    created_at: daysAgo(7),
    updated_at: daysAgo(1),
    completed_at: null,
    deleted_at: null,
    client_name: "Sophia Kim",
  },
  {
    id: "demo-task-3",
    client_id: "demo-client-3",
    profile_id: "demo-profile-id",
    title: "Schedule initial assessment",
    content: "Contact Maria Rivera to schedule Noah's initial assessment at the LA office.",
    status: "in_progress" as const,
    due_date: new Date().toISOString().split("T")[0],
    reminder_at: null,
    created_at: daysAgo(5),
    updated_at: daysAgo(1),
    completed_at: null,
    deleted_at: null,
    client_name: "Noah Rivera",
  },
  {
    id: "demo-task-4",
    client_id: "demo-lead-1",
    profile_id: "demo-profile-id",
    title: "Follow up with guardian",
    content: "Respond to Samantha Davis's inquiry about services for Harper. Share availability and insurance info.",
    status: "pending" as const,
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reminder_at: null,
    created_at: daysAgo(1),
    updated_at: daysAgo(1),
    completed_at: null,
    deleted_at: null,
    client_name: "Harper Davis",
  },
  {
    id: "demo-task-5",
    client_id: "demo-client-6",
    profile_id: "demo-profile-id",
    title: "Prepare parent training materials",
    content: "Create take-home strategies packet for the Garcia family covering mealtime routines.",
    status: "pending" as const,
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reminder_at: null,
    created_at: daysAgo(3),
    updated_at: daysAgo(3),
    completed_at: null,
    deleted_at: null,
    client_name: "Mia Garcia",
  },
  {
    id: "demo-task-6",
    client_id: "demo-client-7",
    profile_id: "demo-profile-id",
    title: "Submit TRICARE reauthorization",
    content: "Oliver Thompson's TRICARE authorization renewal is due next week. Gather session notes and submit.",
    status: "pending" as const,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    reminder_at: null,
    created_at: daysAgo(2),
    updated_at: daysAgo(2),
    completed_at: null,
    deleted_at: null,
    client_name: "Oliver Thompson",
  },
];

// =============================================================================
// DEMO EMPLOYEES (Team Members)
// =============================================================================

export const DEMO_EMPLOYEES: TeamMember[] = [
  {
    id: "demo-emp-1",
    profile_id: "demo-profile-id",
    first_name: "Dr. Sarah",
    last_name: "Mitchell",
    email: "s.mitchell@sunriseaba.example.com",
    phone: "(555) 100-1001",
    address: "Los Angeles, CA",
    role: "BCBA",
    notes: "Clinical Director. Specializes in early intervention and feeding therapy.",
    status: "active",
    hired_date: daysAgo(365),
    job_application_id: null,
    created_at: daysAgo(365),
    updated_at: daysAgo(10),
    credential_count: 3,
    expiring_credential_count: 0,
  },
  {
    id: "demo-emp-2",
    profile_id: "demo-profile-id",
    first_name: "Marcus",
    last_name: "Chen",
    email: "m.chen@sunriseaba.example.com",
    phone: "(555) 100-1002",
    address: "Los Angeles, CA",
    role: "RBT",
    notes: "Experienced RBT, bilingual English/Mandarin.",
    status: "active",
    hired_date: daysAgo(240),
    job_application_id: null,
    created_at: daysAgo(240),
    updated_at: daysAgo(5),
    credential_count: 2,
    expiring_credential_count: 1,
  },
  {
    id: "demo-emp-3",
    profile_id: "demo-profile-id",
    first_name: "Jasmine",
    last_name: "Rodriguez",
    email: "j.rodriguez@sunriseaba.example.com",
    phone: "(555) 100-1003",
    address: "San Diego, CA",
    role: "RBT",
    notes: "Bilingual English/Spanish. Works with the San Diego center.",
    status: "active",
    hired_date: daysAgo(150),
    job_application_id: null,
    created_at: daysAgo(150),
    updated_at: daysAgo(3),
    credential_count: 2,
    expiring_credential_count: 0,
  },
  {
    id: "demo-emp-4",
    profile_id: "demo-profile-id",
    first_name: "Kelly",
    last_name: "Park",
    email: "k.park@sunriseaba.example.com",
    phone: "(555) 100-1004",
    address: "Los Angeles, CA",
    role: "Office Manager",
    notes: "Handles scheduling, billing, and insurance verifications.",
    status: "active",
    hired_date: daysAgo(300),
    job_application_id: null,
    created_at: daysAgo(300),
    updated_at: daysAgo(1),
    credential_count: 0,
    expiring_credential_count: 0,
  },
];

// =============================================================================
// DEMO JOBS
// =============================================================================

export const DEMO_JOBS: JobPostingSummary[] = [
  {
    id: "demo-job-1",
    title: "Board Certified Behavior Analyst (BCBA)",
    slug: "bcba-los-angeles-sunrise-aba",
    positionType: "bcba",
    status: "published",
    publishedAt: daysAgo(14),
    createdAt: daysAgo(16),
    applicationCount: 7,
    location: { city: "Los Angeles", state: "CA" },
  },
  {
    id: "demo-job-2",
    title: "Registered Behavior Technician (RBT)",
    slug: "rbt-san-diego-sunrise-aba",
    positionType: "rbt",
    status: "published",
    publishedAt: daysAgo(7),
    createdAt: daysAgo(9),
    applicationCount: 12,
    location: { city: "San Diego", state: "CA" },
  },
  {
    id: "demo-job-3",
    title: "Administrative Coordinator",
    slug: "admin-coordinator-sunrise-aba",
    positionType: "other",
    status: "draft",
    publishedAt: null,
    createdAt: daysAgo(2),
    applicationCount: 0,
    location: { city: "Los Angeles", state: "CA" },
  },
];

// =============================================================================
// DEMO COMMUNICATIONS
// =============================================================================

export const DEMO_COMMUNICATIONS: ClientCommunication[] = [
  {
    id: "demo-comm-1",
    client_id: "demo-client-5",
    profile_id: "demo-profile-id",
    template_slug: "welcome",
    subject: "Welcome to Sunrise ABA Therapy!",
    body: "Dear Jessica, Thank you for choosing Sunrise ABA Therapy for Ethan's care...",
    recipient_email: "j.williams@example.com",
    recipient_name: "Jessica Williams",
    status: "sent",
    sent_at: daysAgo(75),
    sent_by: "demo-profile-id",
    created_at: daysAgo(75),
    client_name: "Ethan Williams",
  },
  {
    id: "demo-comm-2",
    client_id: "demo-client-6",
    profile_id: "demo-profile-id",
    template_slug: "session-reminder",
    subject: "Session Reminder: Mia's ABA Therapy Tomorrow",
    body: "Hi Carlos, This is a friendly reminder that Mia's ABA session is scheduled for tomorrow...",
    recipient_email: "c.garcia@example.com",
    recipient_name: "Carlos Garcia",
    status: "sent",
    sent_at: daysAgo(2),
    sent_by: "demo-profile-id",
    created_at: daysAgo(2),
    client_name: "Mia Garcia",
  },
  {
    id: "demo-comm-3",
    client_id: "demo-client-4",
    profile_id: "demo-profile-id",
    template_slug: "insurance-update",
    subject: "Insurance Authorization Update for Sophia",
    body: "Dear Jisoo, We wanted to update you on the status of Sophia's insurance authorization with Cigna...",
    recipient_email: "jisoo.kim@example.com",
    recipient_name: "Jisoo Kim",
    status: "sent",
    sent_at: daysAgo(5),
    sent_by: "demo-profile-id",
    created_at: daysAgo(5),
    client_name: "Sophia Kim",
  },
  {
    id: "demo-comm-4",
    client_id: "demo-client-3",
    profile_id: "demo-profile-id",
    template_slug: "assessment-scheduled",
    subject: "Assessment Appointment Confirmation for Noah",
    body: "Dear Maria, We are pleased to confirm Noah's initial assessment appointment...",
    recipient_email: "maria.r@example.com",
    recipient_name: "Maria Rivera",
    status: "sent",
    sent_at: daysAgo(3),
    sent_by: "demo-profile-id",
    created_at: daysAgo(3),
    client_name: "Noah Rivera",
  },
  {
    id: "demo-comm-5",
    client_id: "demo-client-8",
    profile_id: "demo-profile-id",
    template_slug: null,
    subject: "Final Billing Statement — Emma Johnson",
    body: "Dear David, Please find attached Emma's final billing statement following her discharge...",
    recipient_email: "d.johnson@example.com",
    recipient_name: "David Johnson",
    status: "sent",
    sent_at: daysAgo(14),
    sent_by: "demo-profile-id",
    created_at: daysAgo(14),
    client_name: "Emma Johnson",
  },
];

// =============================================================================
// DEMO REFERRAL SOURCES
// =============================================================================

export const DEMO_REFERRAL_SOURCES: ReferralAnalytics = {
  totalClients: 11,
  totalWithSource: 9,
  findabatherapyCount: 3,
  breakdown: [
    {
      source: "findabatherapy",
      label: "FindABATherapy.org",
      count: 3,
      percentage: 33.3,
    },
    {
      source: "google",
      label: "Google Search",
      count: 2,
      percentage: 22.2,
    },
    {
      source: "physician",
      label: "Pediatrician Referral",
      count: 2,
      percentage: 22.2,
    },
    {
      source: "word_of_mouth",
      label: "Parent Referral",
      count: 1,
      percentage: 11.1,
    },
    {
      source: "social_media",
      label: "Social Media",
      count: 1,
      percentage: 11.1,
    },
  ],
};
