/**
 * Generate city-specific FAQs for ABA therapy pages
 * These FAQs are designed to provide unique, helpful content for each city page
 * and to target long-tail search queries like "ABA therapy in [City]"
 */

export interface CityFAQ {
  question: string;
  answer: string;
}

export function generateCityFAQs(
  cityName: string,
  stateName: string,
  stateAbbrev: string,
  providerCount?: number
): CityFAQ[] {
  const count = providerCount || 0;
  const hasProviders = count > 0;

  return [
    {
      question: `How do I find ABA therapy providers in ${cityName}, ${stateAbbrev}?`,
      answer: hasProviders
        ? `Find ABA Therapy lists ${count} verified ABA therapy provider${count !== 1 ? "s" : ""} serving ${cityName}, ${stateName}. You can filter by service type (in-home, center-based, telehealth), insurance accepted, and specialties to find the right provider for your family. Each listing includes contact information, services offered, and insurance details.`
        : `Use our directory to search ABA therapy providers serving ${cityName}, ${stateName}. Filter by service type (in-home, center-based, telehealth), insurance accepted, and specialties to find the right provider for your family. New providers are added regularly.`,
    },
    {
      question: `What types of ABA therapy are available in ${cityName}?`,
      answer: `ABA therapy providers in ${cityName} typically offer multiple service delivery models: In-home ABA brings Board Certified Behavior Analysts (BCBAs) and Registered Behavior Technicians (RBTs) directly to your home. Center-based ABA provides therapy in a clinic setting with specialized equipment and peer interaction opportunities. Telehealth ABA offers remote parent training and consultation sessions. Many providers in ${cityName} offer a combination of these services.`,
    },
    {
      question: `Does insurance cover ABA therapy in ${stateName}?`,
      answer: `${stateName} has autism insurance mandates requiring most private insurance plans to cover ABA therapy as a medically necessary treatment for autism spectrum disorder. Major carriers like Medicaid, Blue Cross Blue Shield, Aetna, UnitedHealthcare, and Cigna typically cover ABA services. Coverage varies by plan, so contact your insurance provider to verify your specific benefits and any prior authorization requirements.`,
    },
    {
      question: `How long is the waitlist for ABA therapy in ${cityName}?`,
      answer: `ABA therapy waitlists in ${cityName} vary significantly by provider and can range from a few weeks to several months. To minimize wait time, we recommend contacting multiple providers simultaneously, asking about current availability during your initial call, considering providers that offer telehealth services while waiting for in-person openings, and getting on waitlists early—even before receiving a formal autism diagnosis.`,
    },
    {
      question: `How much does ABA therapy cost in ${cityName}, ${stateAbbrev}?`,
      answer: `The cost of ABA therapy in ${cityName} depends on your insurance coverage, the intensity of services, and the delivery model. With insurance, most families pay between $0-50 per session after meeting their deductible. Without insurance, ABA therapy can cost $120-200+ per hour. Many providers in ${cityName} work with families on payment plans and can help navigate insurance authorization processes.`,
    },
    {
      question: `What qualifications should I look for in an ABA provider in ${cityName}?`,
      answer: `When choosing an ABA provider in ${cityName}, look for: Board Certified Behavior Analysts (BCBAs) who develop and oversee treatment programs, Registered Behavior Technicians (RBTs) who provide direct therapy, experience with your child's age group and specific needs, positive reviews from other families, transparent communication about treatment goals and progress, and acceptance of your insurance plan.`,
    },
  ];
}

/**
 * Generate a shorter set of FAQs for use in compact sections
 */
export function generateCityFAQsShort(
  cityName: string,
  stateName: string,
  stateAbbrev: string
): CityFAQ[] {
  return [
    {
      question: `How do I find ABA therapy in ${cityName}?`,
      answer: `Search our directory for verified ABA therapy providers serving ${cityName}, ${stateName}. Filter by insurance, service type, and location to find providers that match your needs.`,
    },
    {
      question: `What types of ABA services are offered in ${cityName}?`,
      answer: `Providers in ${cityName} typically offer in-home ABA, center-based therapy, and telehealth services. Many offer a combination to provide flexible treatment options.`,
    },
    {
      question: `Is ABA therapy covered by insurance in ${stateName}?`,
      answer: `Most insurance plans in ${stateName} cover ABA therapy due to autism insurance mandates. Major carriers like Medicaid, BCBS, Aetna, and UnitedHealthcare typically provide coverage.`,
    },
  ];
}
