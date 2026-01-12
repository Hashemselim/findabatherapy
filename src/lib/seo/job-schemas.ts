import { POSITION_TYPES, EMPLOYMENT_TYPES } from "@/lib/validations/jobs";
import type { PublicJobPosting } from "@/lib/queries/jobs";

const BASE_URL = "https://www.findabajobs.org";

/**
 * Generate JobPosting JSON-LD schema for a job
 * @see https://developers.google.com/search/docs/appearance/structured-data/job-posting
 */
export function generateJobPostingSchema(job: PublicJobPosting) {
  const positionLabel = POSITION_TYPES.find((p) => p.value === job.positionType)?.label || job.positionType;

  // Map employment types to Google's expected values
  const employmentTypeMap: Record<string, string> = {
    full_time: "FULL_TIME",
    part_time: "PART_TIME",
    contract: "CONTRACTOR",
    per_diem: "PER_DIEM",
    internship: "INTERN",
  };

  const employmentTypes = job.employmentTypes
    .map((type) => employmentTypeMap[type] || type.toUpperCase())
    .filter(Boolean);

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description || `${positionLabel} position at ${job.provider.agencyName}`,
    identifier: {
      "@type": "PropertyValue",
      name: job.provider.agencyName,
      value: job.id,
    },
    datePosted: job.publishedAt,
    ...(job.expiresAt && { validThrough: job.expiresAt }),
    employmentType: employmentTypes.length > 0 ? employmentTypes : ["FULL_TIME"],
    hiringOrganization: {
      "@type": "Organization",
      name: job.provider.agencyName,
      sameAs: `${BASE_URL}/provider/${job.provider.slug}`,
      ...(job.provider.logoUrl && { logo: job.provider.logoUrl }),
    },
    directApply: true,
    url: `${BASE_URL}/job/${job.slug}`,
  };

  // Add job location or remote work indicator
  if (job.location) {
    schema.jobLocation = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location.city,
        addressRegion: job.location.state,
        addressCountry: "US",
      },
    };
  }

  if (job.remoteOption) {
    schema.jobLocationType = "TELECOMMUTE";
    if (!job.location) {
      schema.applicantLocationRequirements = {
        "@type": "Country",
        name: "United States",
      };
    }
  }

  // Add salary information if available
  if (job.salaryMin) {
    schema.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: {
        "@type": "QuantitativeValue",
        minValue: job.salaryMin,
        ...(job.salaryMax && { maxValue: job.salaryMax }),
        unitText: job.salaryType === "hourly" ? "HOUR" : "YEAR",
      },
    };
  }

  // Add industry and occupation category
  schema.industry = "Healthcare";
  schema.occupationalCategory = "29-1129.01"; // Behavior Analyst ONET code

  // Add qualifications based on position type
  const qualifications: string[] = [];
  if (job.positionType === "bcba") {
    qualifications.push("Board Certified Behavior Analyst (BCBA) certification required");
    qualifications.push("Master's degree in Applied Behavior Analysis or related field");
  } else if (job.positionType === "bcaba") {
    qualifications.push("Board Certified Assistant Behavior Analyst (BCaBA) certification required");
    qualifications.push("Bachelor's degree in Applied Behavior Analysis or related field");
  } else if (job.positionType === "rbt") {
    qualifications.push("Registered Behavior Technician (RBT) certification required or willingness to obtain");
    qualifications.push("High school diploma or equivalent");
  }

  if (qualifications.length > 0) {
    schema.qualifications = qualifications.join(". ");
  }

  // Add job requirements if available
  if (job.requirements) {
    schema.responsibilities = job.requirements;
  }

  return schema;
}

/**
 * Generate BreadcrumbList JSON-LD schema for job pages
 */
export function generateJobBreadcrumbSchema(job: PublicJobPosting) {
  const items = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: BASE_URL,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Search Jobs",
      item: `${BASE_URL}/search`,
    },
  ];

  // Add state if available
  if (job.location?.state) {
    const stateSlug = job.location.state.toLowerCase().replace(/\s+/g, "-");
    items.push({
      "@type": "ListItem",
      position: 3,
      name: `Jobs in ${job.location.state}`,
      item: `${BASE_URL}/${stateSlug}`,
    });
  }

  // Add current job
  items.push({
    "@type": "ListItem",
    position: items.length + 1,
    name: job.title,
    item: `${BASE_URL}/job/${job.slug}`,
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}

/**
 * Generate Organization JSON-LD schema for the jobs site
 */
export function generateJobsSiteOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Find ABA Jobs",
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    description: "Find ABA Jobs is the leading job board for BCBA, RBT, and behavior analyst careers in the ABA therapy industry.",
    contactPoint: {
      "@type": "ContactPoint",
      email: "support@findabajobs.org",
      contactType: "customer service",
    },
    sameAs: [
      "https://twitter.com/findabajobs",
      "https://www.linkedin.com/company/findabajobs",
    ],
  };
}

/**
 * Generate WebSite JSON-LD schema for the jobs site
 */
export function generateJobsSiteWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Find ABA Jobs",
    url: BASE_URL,
    description: "Search thousands of BCBA, RBT, and behavior analyst jobs from top ABA therapy providers nationwide.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// Re-export types for convenience
export type { PublicJobPosting };
