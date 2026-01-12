import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Briefcase, Search, GraduationCap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JobCard } from "@/components/jobs/job-card";
import { JsonLd } from "@/components/seo/json-ld";
import { searchJobs } from "@/lib/queries/jobs";
import { POSITION_TYPES, type PositionType } from "@/lib/validations/jobs";

interface PositionJobsPageProps {
  params: Promise<{ position: string }>;
}

// Position slug to value mapping
const POSITION_SLUG_MAP: Record<string, PositionType> = {
  "bcba": "bcba",
  "bcaba": "bcaba",
  "rbt": "rbt",
  "bt": "bt",
  "clinical-director": "clinical_director",
  "regional-director": "regional_director",
  "executive-director": "executive_director",
  "admin": "admin",
};

// Position-specific SEO content
const POSITION_SEO: Record<PositionType, {
  title: string;
  metaTitle: string;
  description: string;
  requirements: string[];
  salaryRange: string;
}> = {
  bcba: {
    title: "BCBA Jobs",
    metaTitle: "BCBA Jobs | Board Certified Behavior Analyst Careers",
    description: "Board Certified Behavior Analysts (BCBAs) lead ABA therapy programs, design treatment plans, and supervise behavior technicians. BCBAs work with individuals with autism and developmental disabilities.",
    requirements: [
      "Master's degree in ABA, psychology, or related field",
      "BCBA certification from the BACB",
      "State licensure where required",
      "Clinical experience preferred",
    ],
    salaryRange: "$70,000 - $95,000/year",
  },
  bcaba: {
    title: "BCaBA Jobs",
    metaTitle: "BCaBA Jobs | Board Certified Assistant Behavior Analyst Careers",
    description: "Board Certified Assistant Behavior Analysts (BCaBAs) implement behavior intervention plans under BCBA supervision. BCaBAs work directly with clients and support treatment teams.",
    requirements: [
      "Bachelor's degree in ABA or related field",
      "BCaBA certification from the BACB",
      "Supervision by a BCBA required",
      "Experience with ABA therapy",
    ],
    salaryRange: "$45,000 - $60,000/year",
  },
  rbt: {
    title: "RBT Jobs",
    metaTitle: "RBT Jobs | Registered Behavior Technician Careers",
    description: "Registered Behavior Technicians (RBTs) provide direct ABA therapy services to clients. RBTs implement behavior plans created by BCBAs and collect data on client progress.",
    requirements: [
      "High school diploma or equivalent",
      "RBT certification from the BACB",
      "40-hour RBT training completion",
      "Background check clearance",
    ],
    salaryRange: "$18 - $28/hour",
  },
  bt: {
    title: "Behavior Technician Jobs",
    metaTitle: "Behavior Technician Jobs | BT Careers in ABA",
    description: "Behavior Technicians (BTs) provide direct therapy services to individuals with autism and developmental disabilities. Great entry-level opportunity in the ABA field.",
    requirements: [
      "High school diploma or equivalent",
      "Willingness to obtain RBT certification",
      "Passion for working with children",
      "Reliable transportation",
    ],
    salaryRange: "$16 - $22/hour",
  },
  clinical_director: {
    title: "Clinical Director Jobs",
    metaTitle: "Clinical Director Jobs | ABA Clinical Leadership Careers",
    description: "Clinical Directors oversee clinical operations, ensure quality of services, and lead teams of BCBAs and therapists. Leadership role requiring extensive ABA experience.",
    requirements: [
      "Master's or doctoral degree",
      "BCBA certification with 5+ years experience",
      "Leadership and management experience",
      "Strong clinical and business acumen",
    ],
    salaryRange: "$85,000 - $120,000/year",
  },
  regional_director: {
    title: "Regional Director Jobs",
    metaTitle: "Regional Director Jobs | ABA Regional Management Careers",
    description: "Regional Directors manage multiple ABA therapy locations and ensure consistent service delivery across regions. Strategic leadership position.",
    requirements: [
      "Advanced degree in healthcare or business",
      "Multi-site management experience",
      "Strong operational expertise",
      "Travel flexibility required",
    ],
    salaryRange: "$100,000 - $150,000/year",
  },
  executive_director: {
    title: "Executive Director Jobs",
    metaTitle: "Executive Director Jobs | ABA Executive Leadership",
    description: "Executive Directors lead ABA organizations, set strategic direction, and ensure organizational success. C-suite level position.",
    requirements: [
      "Advanced degree required",
      "10+ years in healthcare leadership",
      "P&L responsibility experience",
      "Board-level communication skills",
    ],
    salaryRange: "$120,000 - $200,000+/year",
  },
  admin: {
    title: "Administrative Jobs",
    metaTitle: "ABA Administrative Jobs | Office & Support Careers",
    description: "Administrative professionals support ABA practices with scheduling, billing, credentialing, and office management. Essential role in therapy operations.",
    requirements: [
      "Administrative experience",
      "Healthcare billing knowledge preferred",
      "Strong organizational skills",
      "Proficiency in office software",
    ],
    salaryRange: "$35,000 - $55,000/year",
  },
  other: {
    title: "Other ABA Jobs",
    metaTitle: "Other ABA Jobs | Specialized Careers in Behavior Analysis",
    description: "Specialized positions in ABA therapy including trainers, quality assurance specialists, and other roles supporting autism services.",
    requirements: [
      "Varies by position",
      "ABA experience preferred",
      "Specialized skills may be required",
    ],
    salaryRange: "Varies by position",
  },
};

export async function generateMetadata({ params }: PositionJobsPageProps): Promise<Metadata> {
  const { position } = await params;
  const positionValue = POSITION_SLUG_MAP[position];

  if (!positionValue) {
    return {
      title: "Position Not Found | Find ABA Jobs",
    };
  }

  const seo = POSITION_SEO[positionValue];

  return {
    title: `${seo.metaTitle} | Find ABA Jobs`,
    description: seo.description.slice(0, 160),
    openGraph: {
      title: `${seo.metaTitle} | Find ABA Jobs`,
      description: seo.description.slice(0, 160),
    },
    alternates: {
      canonical: `/${position}-jobs`,
    },
  };
}

export default async function PositionJobsPage({ params }: PositionJobsPageProps) {
  const { position } = await params;
  const positionValue = POSITION_SLUG_MAP[position];

  if (!positionValue) {
    notFound();
  }

  const positionInfo = POSITION_TYPES.find((p) => p.value === positionValue);
  const seo = POSITION_SEO[positionValue];

  const { jobs, total } = await searchJobs({
    filters: { positionTypes: [positionValue] },
    limit: 20,
    sort: "date",
  });

  // Get state distribution
  const stateCounts = new Map<string, number>();
  jobs.forEach((job) => {
    if (job.location?.state) {
      const current = stateCounts.get(job.location.state) || 0;
      stateCounts.set(job.location.state, current + 1);
    }
  });

  const topStates = Array.from(stateCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Generate breadcrumb JSON-LD
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.findabajobs.org",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Search Jobs",
        item: "https://www.findabajobs.org/search",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: seo.title,
        item: `https://www.findabajobs.org/${position}-jobs`,
      },
    ],
  };

  return (
    <div className="min-h-screen">
      <JsonLd data={breadcrumbSchema} />

      {/* Hero Section */}
      <section className="border-b bg-gradient-to-br from-emerald-50 via-white to-slate-50 py-12 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-emerald-600">Home</Link>
            <span>/</span>
            <Link href="/jobs/search" className="hover:text-emerald-600">Jobs</Link>
            <span>/</span>
            <span className="text-foreground">{positionInfo?.label || position}</span>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
                {seo.title}
              </h1>
              <p className="mt-1 text-lg text-muted-foreground">
                {total} open position{total !== 1 ? "s" : ""} nationwide
              </p>
            </div>
          </div>

          <p className="mt-4 max-w-2xl text-muted-foreground">
            {seo.description}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700">
              <Link href={`/jobs/search?position=${positionValue}`}>
                <Search className="mr-2 h-4 w-4" />
                Search {positionInfo?.label} Jobs
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/jobs/search">
                View All Positions
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Position Info Cards */}
      <section className="border-b bg-white py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Requirements */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-emerald-600">
                  <GraduationCap className="h-5 w-5" />
                  <h3 className="font-semibold">Typical Requirements</h3>
                </div>
                <ul className="mt-4 space-y-2">
                  {seo.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      {req}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Salary Info */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-emerald-600">
                  <Briefcase className="h-5 w-5" />
                  <h3 className="font-semibold">Salary Range</h3>
                </div>
                <p className="mt-4 text-2xl font-bold text-foreground">
                  {seo.salaryRange}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Salaries vary by location, experience, and employer. Many positions
                  include benefits such as health insurance, PTO, and CEU stipends.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Browse by State */}
      {topStates.length > 0 && (
        <section className="border-b bg-slate-50 py-10">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-lg font-semibold text-foreground">
              {positionInfo?.label} Jobs by State
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {topStates.map(([state, count]) => (
                <Link
                  key={state}
                  href={`/jobs/search?position=${positionValue}&state=${state}`}
                >
                  <Badge
                    variant="outline"
                    className="cursor-pointer px-3 py-1.5 hover:bg-emerald-50 hover:border-emerald-300"
                  >
                    {state} ({count})
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Job Listings */}
      <section className="py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-xl font-semibold text-foreground">
            Latest {positionInfo?.label} Jobs
          </h2>

          {jobs.length === 0 ? (
            <Card className="mt-6 border-dashed">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Briefcase className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold">No {positionInfo?.label} jobs found</h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  There are currently no open {positionInfo?.label} positions.
                  Try browsing other position types or check back later.
                </p>
                <Button asChild className="mt-6 rounded-full" variant="outline">
                  <Link href="/jobs/search">
                    Browse All Jobs
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="mt-6 space-y-4">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}

              {total > jobs.length && (
                <div className="pt-4 text-center">
                  <Button asChild className="rounded-full bg-emerald-600 text-white hover:bg-emerald-700">
                    <Link href={`/jobs/search?position=${positionValue}`}>
                      View All {total} Jobs
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
