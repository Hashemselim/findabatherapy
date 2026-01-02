import type { ListingWithRelations } from "@/lib/actions/listings";
import type { Inquiry } from "@/lib/actions/inquiries";

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
