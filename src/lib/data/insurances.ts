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
  {
    slug: "centene-ambetter",
    name: "Centene / Ambetter",
    shortName: "Ambetter",
    description: "Largest Medicaid managed care organization and major ACA marketplace insurer.",
    coverageInfo: "Centene and its Ambetter marketplace plans cover ABA therapy as part of autism treatment benefits. Coverage is available through Medicaid managed care programs in most states and through ACA marketplace plans.",
  },
  {
    slug: "molina-healthcare",
    name: "Molina Healthcare",
    shortName: "Molina",
    description: "Major Medicaid and Medicare managed care provider with nationwide presence.",
    coverageInfo: "Molina Healthcare covers ABA therapy for members with autism spectrum disorder through its Medicaid and Medicare managed care plans. Prior authorization is typically required.",
  },
  {
    slug: "hcsc",
    name: "Health Care Service Corporation",
    shortName: "HCSC",
    description: "Largest customer-owned health insurer operating Blue Cross Blue Shield plans in IL, TX, MT, OK, and NM.",
    coverageInfo: "HCSC operates Blue Cross Blue Shield plans in five states and covers ABA therapy as part of autism treatment benefits. Coverage varies by state and plan type.",
  },
  {
    slug: "wellcare",
    name: "Wellcare",
    shortName: "Wellcare",
    description: "Medicare Advantage and Medicaid managed care insurer with growing ABA therapy coverage.",
    coverageInfo: "Wellcare covers ABA therapy for autism treatment through its Medicare Advantage and Medicaid managed care plans. Services require prior authorization and must be provided by credentialed providers.",
  },
  {
    slug: "oscar-health",
    name: "Oscar Health",
    shortName: "Oscar",
    description: "Technology-focused health insurer offering ACA marketplace plans with ABA coverage.",
    coverageInfo: "Oscar Health covers ABA therapy as part of its behavioral health benefits in ACA marketplace plans. Coverage includes assessment, treatment planning, and ongoing therapy services.",
  },
  {
    slug: "beacon-health",
    name: "Beacon Health Options",
    shortName: "Beacon",
    description: "Behavioral health management company administering ABA benefits for many employers and health plans.",
    coverageInfo: "Beacon Health Options manages behavioral health benefits including ABA therapy for various health plans and employers. They have an established network of ABA providers nationwide.",
  },
  {
    slug: "optum",
    name: "Optum Behavioral Health",
    shortName: "Optum",
    description: "UnitedHealth Group subsidiary managing behavioral health benefits including ABA therapy.",
    coverageInfo: "Optum manages behavioral health benefits for UnitedHealthcare and other health plans. ABA therapy coverage includes assessment, treatment, and ongoing services subject to medical necessity review.",
  },
  {
    slug: "carefirst",
    name: "CareFirst BlueCross BlueShield",
    shortName: "CareFirst",
    description: "Blue Cross Blue Shield affiliate serving Maryland, Washington D.C., and Northern Virginia.",
    coverageInfo: "CareFirst covers ABA therapy as part of autism spectrum disorder treatment. Coverage includes both in-home and center-based services for members in the Mid-Atlantic region.",
  },
  {
    slug: "horizon-bcbs",
    name: "Horizon Blue Cross Blue Shield",
    shortName: "Horizon",
    description: "New Jersey's largest health insurer with comprehensive ABA therapy coverage.",
    coverageInfo: "Horizon BCBS covers ABA therapy for autism treatment in New Jersey. Coverage includes assessment, treatment planning, and ongoing therapy services as required by state autism insurance mandates.",
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
