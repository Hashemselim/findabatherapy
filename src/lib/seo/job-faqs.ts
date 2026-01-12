/**
 * Generate state-specific FAQs for ABA jobs pages
 * These FAQs target search queries like "ABA jobs in [State]" and "BCBA jobs [State]"
 */

export interface JobStateFAQ {
  question: string;
  answer: string;
}

export function generateJobStateFAQs(
  stateName: string,
  stateAbbrev: string,
  jobCount?: number,
  cityCount?: number
): JobStateFAQ[] {
  const count = jobCount || 0;
  const cities = cityCount || 0;

  return [
    {
      question: `How many ABA jobs are available in ${stateName}?`,
      answer: count > 0
        ? `Find ABA Jobs currently lists ${count} open ABA therapy position${count !== 1 ? "s" : ""} across ${stateName}${cities > 0 ? ` in ${cities} cities` : ""}. Browse our directory to see all available positions, filter by position type, employment type, and location to find the right opportunity for your career.`
        : `Find ABA Jobs maintains a growing directory of ABA therapy positions across ${stateName}. Browse our directory and filter by position type, employment type, and location. New jobs are added daily as employers post openings.`,
    },
    {
      question: `What types of ABA positions are available in ${stateName}?`,
      answer: `${stateName} offers a variety of ABA career opportunities including Board Certified Behavior Analyst (BCBA) positions, Board Certified Assistant Behavior Analyst (BCaBA) roles, Registered Behavior Technician (RBT) jobs, and Behavior Technician positions for those new to the field. Many employers also hire Clinical Directors, Program Supervisors, and administrative roles.`,
    },
    {
      question: `What is the average salary for BCBA jobs in ${stateName}?`,
      answer: `BCBA salaries in ${stateName} typically range from $70,000 to $95,000+ annually, depending on experience, location, and employer type. RBT positions usually pay $18-28 per hour. Many employers offer competitive benefits including health insurance, CEU stipends, supervision for certification, and flexible schedules.`,
    },
    {
      question: `Do I need certification to work in ABA therapy in ${stateName}?`,
      answer: `Certification requirements vary by position. BCBAs must hold national certification from the BACB and meet ${stateName}'s licensing requirements if applicable. RBTs need to complete 40+ hours of training and pass a competency assessment. Behavior Technician positions may hire candidates willing to obtain RBT certification while working. Always verify specific requirements with each employer.`,
    },
    {
      question: `Are there remote ABA jobs available in ${stateName}?`,
      answer: `Yes, many ABA employers in ${stateName} offer telehealth positions, especially for BCBAs providing supervision, parent training, and consultation services. Some roles are fully remote while others are hybrid with in-person requirements. Filter job listings by "Remote" to find telehealth opportunities.`,
    },
    {
      question: `How do I apply for ABA jobs in ${stateName}?`,
      answer: `To apply for ABA jobs in ${stateName}, browse our job listings and click on positions that match your qualifications. Each listing includes application instructions and employer contact information. Prepare your resume highlighting relevant experience, certifications, and education. Many employers respond within 1-2 weeks of application submission.`,
    },
  ];
}

/**
 * Generate city-specific FAQs for ABA jobs pages
 * These FAQs target long-tail search queries like "BCBA jobs in [City]"
 */

export interface JobCityFAQ {
  question: string;
  answer: string;
}

export function generateJobCityFAQs(
  cityName: string,
  stateName: string,
  stateAbbrev: string,
  jobCount?: number
): JobCityFAQ[] {
  const count = jobCount || 0;
  const hasJobs = count > 0;

  return [
    {
      question: `How do I find ABA jobs in ${cityName}, ${stateAbbrev}?`,
      answer: hasJobs
        ? `Find ABA Jobs lists ${count} open ABA therapy position${count !== 1 ? "s" : ""} in the ${cityName}, ${stateName} area. Browse BCBA, RBT, and Behavior Technician jobs from verified employers. Filter by position type, employment type, and salary to find the right opportunity for your career goals.`
        : `Search our directory for ABA therapy jobs in the ${cityName}, ${stateName} area. Filter by position type (BCBA, RBT, Behavior Technician), employment type, and salary. New positions are added daily as employers post openings.`,
    },
    {
      question: `What ABA positions are available in ${cityName}?`,
      answer: `ABA employers in ${cityName} typically hire for various positions: Board Certified Behavior Analysts (BCBAs) who oversee treatment programs, Registered Behavior Technicians (RBTs) who provide direct therapy, Behavior Technicians for entry-level roles, and Clinical Directors or supervisory positions. Many employers offer both full-time and part-time opportunities.`,
    },
    {
      question: `What is the average pay for ABA jobs in ${cityName}, ${stateAbbrev}?`,
      answer: `ABA therapy salaries in ${cityName} vary by position and experience. BCBAs typically earn $70,000-$95,000+ annually, BCaBAs earn $55,000-$70,000, and RBTs/Behavior Technicians earn $18-28 per hour. Many employers offer sign-on bonuses, CEU stipends, health benefits, and opportunities for advancement.`,
    },
    {
      question: `Do ABA employers in ${cityName} offer training for new hires?`,
      answer: `Many ABA employers in ${cityName} provide comprehensive training for new hires. This often includes RBT certification training for Behavior Technicians, ongoing supervision hours for those pursuing BCBA certification, and professional development opportunities. Some employers offer tuition assistance for graduate programs in ABA.`,
    },
    {
      question: `Are there part-time ABA jobs available in ${cityName}?`,
      answer: `Yes, many ABA providers in ${cityName} offer part-time positions, especially for RBTs and Behavior Technicians. Part-time roles are great for students, those seeking work-life balance, or professionals transitioning into the ABA field. Filter job listings by employment type to find part-time opportunities.`,
    },
    {
      question: `What qualifications do I need for ABA jobs in ${cityName}?`,
      answer: `Qualifications vary by position. BCBAs need a master's degree and national certification. RBTs require high school diploma plus 40-hour training and competency assessment. Behavior Technicians may start without certification if willing to obtain RBT credential. Most positions require reliable transportation and ability to pass background checks.`,
    },
  ];
}

/**
 * Generate shorter FAQ set for compact displays
 */
export function generateJobStateFAQsShort(
  stateName: string,
  stateAbbrev: string
): JobStateFAQ[] {
  return [
    {
      question: `What ABA jobs are available in ${stateName}?`,
      answer: `Find ABA Jobs lists BCBA, BCaBA, RBT, and Behavior Technician positions across ${stateName}. Browse full-time, part-time, and telehealth opportunities from verified employers.`,
    },
    {
      question: `How much do ABA jobs pay in ${stateName}?`,
      answer: `BCBA salaries typically range $70,000-$95,000+ annually. RBT positions pay $18-28 per hour. Many employers offer benefits, CEU stipends, and opportunities for advancement.`,
    },
    {
      question: `Do I need certification for ABA jobs in ${stateName}?`,
      answer: `Requirements vary by position. BCBAs need national certification, RBTs need 40+ hours of training, and some entry-level positions hire candidates willing to obtain certification.`,
    },
  ];
}

/**
 * Generate shorter FAQ set for city pages
 */
export function generateJobCityFAQsShort(
  cityName: string,
  stateName: string,
  stateAbbrev: string
): JobCityFAQ[] {
  return [
    {
      question: `How do I find ABA jobs in ${cityName}?`,
      answer: `Search our directory for BCBA, RBT, and Behavior Technician jobs in ${cityName}, ${stateName}. Filter by position type, employment type, and salary to find the right match.`,
    },
    {
      question: `What positions are hiring in ${cityName}?`,
      answer: `ABA employers in ${cityName} hire BCBAs, BCaBAs, RBTs, and Behavior Technicians. Many offer full-time, part-time, and flexible scheduling options.`,
    },
    {
      question: `Do ${cityName} ABA employers provide training?`,
      answer: `Many ABA employers in ${cityName} offer RBT certification training, supervision hours for BCBA candidates, and ongoing professional development opportunities.`,
    },
  ];
}
