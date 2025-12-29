/**
 * Generate state-specific FAQs for ABA therapy pages
 * These FAQs target search queries like "ABA therapy in [State]"
 */

export interface StateFAQ {
  question: string;
  answer: string;
}

export function generateStateFAQs(
  stateName: string,
  stateAbbrev: string,
  providerCount?: number,
  cityCount?: number
): StateFAQ[] {
  const count = providerCount || 0;
  const cities = cityCount || 0;

  return [
    {
      question: `How many ABA therapy providers are in ${stateName}?`,
      answer: count > 0
        ? `Find ABA Therapy currently lists ${count} ABA therapy provider${count !== 1 ? "s" : ""} across ${stateName}${cities > 0 ? ` serving ${cities} cities` : ""}. Browse our directory to see all available providers, filter by city, insurance, and service type to find the right fit for your family.`
        : `Find ABA Therapy maintains a growing directory of ABA therapy providers across ${stateName}. Browse our directory and filter by city, insurance, and service type. New providers are added regularly as our network expands.`,
    },
    {
      question: `Is ABA therapy covered by insurance in ${stateName}?`,
      answer: `${stateName} has autism insurance mandates that require most private health insurance plans to cover Applied Behavior Analysis (ABA) therapy. This includes major carriers like Blue Cross Blue Shield, Aetna, UnitedHealthcare, Cigna, and Anthem. ${stateName} Medicaid (and Medicaid waiver programs) also covers ABA therapy for eligible children with autism spectrum disorder diagnoses.`,
    },
    {
      question: `What is the average cost of ABA therapy in ${stateName}?`,
      answer: `The cost of ABA therapy in ${stateName} varies based on insurance coverage, treatment intensity, and provider rates. With insurance, most families pay $0-50 per session after meeting their deductible. Without insurance, ABA therapy typically costs $120-200 per hour. Many ${stateName} providers offer payment plans and can assist with insurance authorization.`,
    },
    {
      question: `How do I find in-home ABA therapy in ${stateName}?`,
      answer: `To find in-home ABA therapy in ${stateName}, use our search filters to select "In-Home" as the service type. In-home ABA brings Board Certified Behavior Analysts (BCBAs) and Registered Behavior Technicians (RBTs) directly to your home, which can be beneficial for children who thrive in familiar environments and allows therapists to address skills in natural settings.`,
    },
    {
      question: `What qualifications do ABA therapists need in ${stateName}?`,
      answer: `In ${stateName}, ABA therapy should be overseen by Board Certified Behavior Analysts (BCBAs) who hold a master's degree and national certification. Direct therapy is typically provided by Registered Behavior Technicians (RBTs) who complete 40+ hours of training and pass a competency assessment. Some states have additional licensing requirements—verify your provider's credentials before starting services.`,
    },
    {
      question: `How long does it take to start ABA therapy in ${stateName}?`,
      answer: `The timeline to start ABA therapy in ${stateName} varies by provider and insurance requirements. After contacting a provider, expect: 1-2 weeks for initial intake, 2-4 weeks for insurance authorization (if required), and variable waitlist time depending on provider capacity. To speed up the process, contact multiple providers simultaneously and begin the intake process as early as possible.`,
    },
  ];
}

/**
 * Generate shorter FAQ set for compact displays
 */
export function generateStateFAQsShort(
  stateName: string,
  stateAbbrev: string
): StateFAQ[] {
  return [
    {
      question: `Does insurance cover ABA therapy in ${stateName}?`,
      answer: `Yes, ${stateName} has autism insurance mandates requiring most private insurance plans to cover ABA therapy. Medicaid also covers ABA for eligible children with autism diagnoses.`,
    },
    {
      question: `How do I find ABA providers in ${stateName}?`,
      answer: `Use Find ABA Therapy's directory to search verified providers across ${stateName}. Filter by city, insurance, and service type to find providers that match your needs.`,
    },
    {
      question: `What types of ABA therapy are available in ${stateName}?`,
      answer: `Providers in ${stateName} offer in-home ABA, center-based therapy, telehealth services, and school-based programs. Many offer multiple delivery models for flexibility.`,
    },
  ];
}
