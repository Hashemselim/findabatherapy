/**
 * JSON-LD Schema generators for SEO
 * These create structured data for rich search results
 */

const BASE_URL = "https://www.findabatherapy.org";

// Organization schema for the main site
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Find ABA Therapy",
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description:
      "Find ABA Therapy is the leading directory for finding Applied Behavior Analysis therapy providers for autism treatment.",
    sameAs: [
      "https://twitter.com/findabatherapy",
      "https://www.linkedin.com/company/findabatherapy",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "support@findabatherapy.org",
    },
  };
}

// WebSite schema with search action
export function generateWebSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Find ABA Therapy",
    url: BASE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/search?query={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// LocalBusiness schema for provider pages
export function generateLocalBusinessSchema(provider: {
  name: string;
  slug: string;
  description?: string;
  headline?: string;
  logoUrl?: string;
  city?: string;
  state?: string;
  street?: string;
  postalCode?: string;
  serviceModes?: string[];
  insurances?: string[];
  isAcceptingClients?: boolean;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${BASE_URL}/provider/${provider.slug}`,
    name: provider.name,
    url: `${BASE_URL}/provider/${provider.slug}`,
    description: provider.description || provider.headline || `${provider.name} provides ABA therapy services.`,
  };

  if (provider.logoUrl) {
    schema.image = provider.logoUrl;
  }

  // Address
  if (provider.city && provider.state) {
    schema.address = {
      "@type": "PostalAddress",
      addressLocality: provider.city,
      addressRegion: provider.state,
      addressCountry: "US",
      ...(provider.street && { streetAddress: provider.street }),
      ...(provider.postalCode && { postalCode: provider.postalCode }),
    };
  }

  // Service type
  schema.serviceType = "ABA Therapy";

  // Area served
  if (provider.state) {
    schema.areaServed = {
      "@type": "State",
      name: provider.state,
    };
  }

  // Accepting new patients
  if (provider.isAcceptingClients !== undefined) {
    schema.isAcceptingNewPatients = provider.isAcceptingClients;
  }

  // Payment accepted (insurances)
  if (provider.insurances && provider.insurances.length > 0) {
    schema.paymentAccepted = provider.insurances.join(", ");
  }

  return schema;
}

// ItemList schema for listing pages (search, state, city)
export function generateItemListSchema(
  items: Array<{
    name: string;
    slug: string;
    position: number;
  }>,
  listName: string
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: listName,
    numberOfItems: items.length,
    itemListElement: items.map((item) => ({
      "@type": "ListItem",
      position: item.position,
      item: {
        "@type": "LocalBusiness",
        name: item.name,
        url: `${BASE_URL}/provider/${item.slug}`,
      },
    })),
  };
}

// BreadcrumbList schema
export function generateBreadcrumbSchema(
  breadcrumbs: Array<{
    name: string;
    url: string;
  }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${BASE_URL}${item.url}`,
    })),
  };
}

// FAQPage schema for insurance and city pages
export function generateFAQSchema(
  faqs: Array<{
    question: string;
    answer: string;
  }>
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

// Service schema for ABA therapy services
export function generateServiceSchema(provider: {
  name: string;
  slug: string;
  serviceModes?: string[];
}) {
  const serviceLabels: Record<string, string> = {
    in_home: "In-Home ABA Therapy",
    in_center: "Center-Based ABA Therapy",
    telehealth: "Telehealth ABA Therapy",
    school_based: "School-Based ABA Therapy",
  };

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Applied Behavior Analysis (ABA) Therapy",
    provider: {
      "@type": "LocalBusiness",
      name: provider.name,
      url: `${BASE_URL}/provider/${provider.slug}`,
    },
    serviceType: "ABA Therapy",
    areaServed: "United States",
    ...(provider.serviceModes && {
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "ABA Services",
        itemListElement: provider.serviceModes.map((mode) => ({
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: serviceLabels[mode] || mode,
          },
        })),
      },
    }),
  };
}

// Article schema for blog posts
export function generateArticleSchema(article: {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  updatedAt?: string;
  author?: string;
  image?: string;
  category?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: {
      "@type": "Organization",
      name: article.author || "Find ABA Therapy",
      url: BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Find ABA Therapy",
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/learn/${article.slug}`,
    },
    image: article.image || `${BASE_URL}/api/og?title=${encodeURIComponent(article.title)}`,
    ...(article.category && {
      articleSection: article.category,
    }),
  };
}

// HowTo schema for step-by-step guides
export function generateHowToSchema(howTo: {
  name: string;
  description: string;
  steps: Array<{
    name: string;
    text: string;
    image?: string;
  }>;
  totalTime?: string; // ISO 8601 duration format (e.g., "PT30M" for 30 minutes)
  estimatedCost?: {
    currency: string;
    value: string;
  };
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: howTo.name,
    description: howTo.description,
    step: howTo.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && {
        image: {
          "@type": "ImageObject",
          url: step.image,
        },
      }),
    })),
    ...(howTo.totalTime && { totalTime: howTo.totalTime }),
    ...(howTo.estimatedCost && {
      estimatedCost: {
        "@type": "MonetaryAmount",
        currency: howTo.estimatedCost.currency,
        value: howTo.estimatedCost.value,
      },
    }),
  };
}

// MedicalWebPage schema for health-related content (E-E-A-T signals)
export function generateMedicalWebPageSchema(page: {
  title: string;
  description: string;
  url: string;
  lastReviewed?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: page.title,
    description: page.description,
    url: page.url,
    ...(page.lastReviewed && { lastReviewed: page.lastReviewed }),
    specialty: {
      "@type": "MedicalSpecialty",
      name: "Applied Behavior Analysis",
    },
    about: {
      "@type": "MedicalCondition",
      name: "Autism Spectrum Disorder",
    },
    audience: {
      "@type": "PeopleAudience",
      audienceType: "Parents and caregivers of children with autism",
    },
  };
}

// HealthcareBusiness schema for ABA providers (more specific than LocalBusiness)
export function generateHealthcareBusinessSchema(provider: {
  name: string;
  slug: string;
  description?: string;
  headline?: string;
  logoUrl?: string;
  city?: string;
  state?: string;
  street?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  serviceModes?: string[];
  insurances?: string[];
  isAcceptingClients?: boolean;
  rating?: {
    value: number;
    count: number;
  };
  priceRange?: string;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "MedicalBusiness"],
    "@id": `${BASE_URL}/provider/${provider.slug}`,
    name: provider.name,
    url: `${BASE_URL}/provider/${provider.slug}`,
    description:
      provider.description ||
      provider.headline ||
      `${provider.name} provides Applied Behavior Analysis (ABA) therapy services for individuals with autism.`,
    medicalSpecialty: "Applied Behavior Analysis",
    serviceType: ["ABA Therapy", "Autism Therapy", "Behavioral Therapy"],
  };

  if (provider.logoUrl) {
    schema.image = provider.logoUrl;
    schema.logo = provider.logoUrl;
  }

  // Address
  if (provider.city && provider.state) {
    schema.address = {
      "@type": "PostalAddress",
      addressLocality: provider.city,
      addressRegion: provider.state,
      addressCountry: "US",
      ...(provider.street && { streetAddress: provider.street }),
      ...(provider.postalCode && { postalCode: provider.postalCode }),
    };
  }

  // Contact information
  if (provider.phone) {
    schema.telephone = provider.phone;
  }
  if (provider.email) {
    schema.email = provider.email;
  }
  if (provider.website) {
    schema.sameAs = provider.website;
  }

  // Area served
  if (provider.state) {
    schema.areaServed = {
      "@type": "State",
      name: provider.state,
    };
  }

  // Accepting new patients
  if (provider.isAcceptingClients !== undefined) {
    schema.isAcceptingNewPatients = provider.isAcceptingClients;
  }

  // Payment accepted (insurances)
  if (provider.insurances && provider.insurances.length > 0) {
    schema.paymentAccepted = provider.insurances.join(", ");
    schema.currenciesAccepted = "USD";
  }

  // Price range
  if (provider.priceRange) {
    schema.priceRange = provider.priceRange;
  }

  // Aggregate rating
  if (provider.rating && provider.rating.count > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: provider.rating.value,
      reviewCount: provider.rating.count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return schema;
}

// AggregateRating schema for reviews
export function generateAggregateRatingSchema(provider: {
  name: string;
  slug: string;
  rating: {
    value: number;
    count: number;
  };
}) {
  return {
    "@context": "https://schema.org",
    "@type": "AggregateRating",
    itemReviewed: {
      "@type": "LocalBusiness",
      name: provider.name,
      url: `${BASE_URL}/provider/${provider.slug}`,
    },
    ratingValue: provider.rating.value,
    reviewCount: provider.rating.count,
    bestRating: 5,
    worstRating: 1,
  };
}

// Place schema for multiple locations
export function generatePlaceSchema(location: {
  name: string;
  streetAddress?: string;
  city: string;
  state: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: location.name,
    address: {
      "@type": "PostalAddress",
      addressLocality: location.city,
      addressRegion: location.state,
      addressCountry: "US",
      ...(location.streetAddress && { streetAddress: location.streetAddress }),
      ...(location.postalCode && { postalCode: location.postalCode }),
    },
  };

  // Add geo coordinates if available
  if (location.latitude && location.longitude) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: location.latitude,
      longitude: location.longitude,
    };
  }

  return schema;
}
