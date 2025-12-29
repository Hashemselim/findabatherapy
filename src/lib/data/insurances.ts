/**
 * Insurance providers for SEO landing pages
 * Used for /insurance/[slug] routes and filtering
 */

export interface Insurance {
  slug: string;
  name: string;
  shortName: string;
  description: string;
  coverageInfo: string;
}

export const INSURANCES: Insurance[] = [
  {
    slug: "medicaid",
    name: "Medicaid",
    shortName: "Medicaid",
    description: "State-funded health insurance program covering ABA therapy for eligible children with autism.",
    coverageInfo: "Medicaid covers ABA therapy in all 50 states for children diagnosed with autism spectrum disorder. Coverage requirements and prior authorization processes vary by state.",
  },
  {
    slug: "blue-cross-blue-shield",
    name: "Blue Cross Blue Shield",
    shortName: "BCBS",
    description: "One of the largest health insurance networks in the US, with extensive ABA therapy coverage.",
    coverageInfo: "Most BCBS plans cover ABA therapy as part of autism treatment benefits. Coverage varies by state and plan type. Many states have autism insurance mandates requiring BCBS to cover ABA.",
  },
  {
    slug: "aetna",
    name: "Aetna",
    shortName: "Aetna",
    description: "Major national health insurer offering comprehensive ABA therapy benefits.",
    coverageInfo: "Aetna covers ABA therapy for members with autism spectrum disorder diagnoses. Coverage includes both in-home and center-based services, subject to medical necessity review.",
  },
  {
    slug: "unitedhealthcare",
    name: "UnitedHealthcare",
    shortName: "UHC",
    description: "America's largest health insurer with broad ABA therapy coverage nationwide.",
    coverageInfo: "UnitedHealthcare provides ABA therapy coverage under behavioral health benefits. Prior authorization is typically required, and coverage varies based on state mandates and plan design.",
  },
  {
    slug: "cigna",
    name: "Cigna",
    shortName: "Cigna",
    description: "Global health service company offering ABA therapy as part of autism treatment benefits.",
    coverageInfo: "Cigna covers ABA therapy for autism spectrum disorder treatment. Services must be provided by licensed or certified behavior analysts and are subject to utilization management.",
  },
  {
    slug: "tricare",
    name: "Tricare",
    shortName: "Tricare",
    description: "Military health insurance program providing ABA therapy for service members' dependents.",
    coverageInfo: "TRICARE covers ABA therapy through the Autism Care Demonstration program for dependents of active duty service members, retirees, and their families.",
  },
  {
    slug: "anthem",
    name: "Anthem",
    shortName: "Anthem",
    description: "Blue Cross Blue Shield affiliate offering extensive ABA coverage in multiple states.",
    coverageInfo: "Anthem provides ABA therapy coverage as part of autism spectrum disorder treatment. Coverage includes assessment, treatment planning, and ongoing therapy services.",
  },
  {
    slug: "humana",
    name: "Humana",
    shortName: "Humana",
    description: "Major health insurer with growing ABA therapy network and coverage options.",
    coverageInfo: "Humana covers ABA therapy for autism treatment under behavioral health benefits. Services require prior authorization and must be deemed medically necessary.",
  },
  {
    slug: "kaiser-permanente",
    name: "Kaiser Permanente",
    shortName: "Kaiser",
    description: "Integrated healthcare system offering in-network ABA therapy services.",
    coverageInfo: "Kaiser Permanente provides ABA therapy through its integrated care model. Members receive services from Kaiser-employed or contracted behavior analysts.",
  },
  {
    slug: "magellan",
    name: "Magellan Health",
    shortName: "Magellan",
    description: "Behavioral health specialty insurer managing ABA benefits for many health plans.",
    coverageInfo: "Magellan manages ABA therapy benefits for various health plans. They specialize in behavioral health services and have established provider networks nationwide.",
  },
];

// Quick lookup map
export const insuranceBySlug = new Map(
  INSURANCES.map((ins) => [ins.slug, ins])
);

// Get all insurance slugs for static params
export function getAllInsuranceSlugs(): string[] {
  return INSURANCES.map((ins) => ins.slug);
}

// Get insurance by slug
export function getInsurance(slug: string): Insurance | undefined {
  return insuranceBySlug.get(slug);
}
