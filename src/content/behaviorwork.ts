export type BehaviorWorkPlanTier = "free" | "pro" | "enterprise";

export interface BehaviorWorkMetric {
  value: string;
  label: string;
  description: string;
}

export interface BehaviorWorkTestimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
  initials: string;
}

export interface BehaviorWorkFaq {
  question: string;
  answer: string;
}

export interface BehaviorWorkLane {
  title: string;
  subtitle: string;
  colorClass: string;
  borderClass: string;
  steps: string[];
}

export const behaviorWorkHeroChips = [
  "Find ABA Therapy",
  "Find ABA Jobs",
  "Behavior Work Operations",
] as const;

export const behaviorWorkEngineCards = [
  {
    title: "Capture Families with Find ABA Therapy",
    subtitle: "Directory listing + branded intake forms",
    flow: "Discovery -> Contact -> Intake -> Client",
    colorClass: "from-[#5788FF]/15 to-[#5788FF]/5",
    iconBgClass: "bg-[#5788FF]/15",
    iconTextClass: "text-[#5788FF]",
  },
  {
    title: "Nurture Every Family's Journey",
    subtitle: "Lifecycle templates + task automation",
    flow: "Inquiry -> Assessment -> Active Services",
    colorClass: "from-violet-500/15 to-violet-500/5",
    iconBgClass: "bg-violet-500/15",
    iconTextClass: "text-violet-600",
  },
  {
    title: "Manage Your Entire Caseload",
    subtitle: "Insurance, authorizations, documents & team",
    flow: "Active clients -> Tracked progress -> Outcomes",
    colorClass: "from-emerald-500/15 to-emerald-500/5",
    iconBgClass: "bg-emerald-500/15",
    iconTextClass: "text-emerald-600",
  },
] as const;

export const behaviorWorkLanes: BehaviorWorkLane[] = [
  {
    title: "Capture",
    subtitle: "Directory + Branded Pages",
    colorClass: "bg-[#5788FF]/8",
    borderClass: "border-[#5788FF]/30",
    steps: [
      "Directory Discovery",
      "Contact Form",
      "Client Intake",
      "Inquiry Inbox",
    ],
  },
  {
    title: "Nurture",
    subtitle: "Lifecycle Communications",
    colorClass: "bg-violet-500/8",
    borderClass: "border-violet-500/30",
    steps: [
      "Email Templates",
      "Task Automation",
      "Status Pipeline",
      "Follow-up Tracking",
    ],
  },
  {
    title: "Manage",
    subtitle: "Caseload Operations",
    colorClass: "bg-emerald-500/8",
    borderClass: "border-emerald-500/30",
    steps: [
      "Insurance + Auth",
      "Documents + Notes",
      "Team + Credentials",
      "Analytics + Referrals",
    ],
  },
];

export const behaviorWorkTherapyHighlights = [
  "Public provider directory listing on Find ABA Therapy",
  "Low-friction contact form for high-intent family leads",
  "Detailed client intake form before the first call",
  "Inbox workflow from inquiry to client conversion",
] as const;

export const behaviorWorkFormsShowcase = [
  {
    title: "Branded Contact Form",
    path: "/contact/[slug]",
    description: "Capture fast inquiry details from families ready to talk.",
  },
  {
    title: "Branded Client Intake",
    path: "/intake/[slug]/client",
    description: "Collect parent, child, and insurance details up front.",
  },
  {
    title: "Branded Family Resources",
    path: "/resources/[slug]",
    description: "Share FAQs and education while your team works the lead.",
  },
] as const;

export const behaviorWorkJobsHighlights = [
  "Public job postings in the ABA-specific job marketplace",
  "Private branded careers page for your agency",
  "Direct applications with resume capture",
  "Applicant pipeline statuses from new to hired",
] as const;

export const behaviorWorkApplicantStages = [
  "new",
  "reviewed",
  "interview",
  "offered",
  "hired",
] as const;

export const behaviorWorkOperationsNow = [
  "Full client lifecycle from inquiry to discharge",
  "Insurance verification and authorization tracking",
  "Communication templates for every stage",
  "Task automation with expiration reminders",
  "Branded pages, intake forms, and referral tracking",
] as const;

export const behaviorWorkOperationsExpanding = [
  "Team management with credential tracking",
  "Expanded hiring workflows and onboarding",
  "Advanced analytics and outcome reporting",
] as const;

export const behaviorWorkMetrics: BehaviorWorkMetric[] = [
  {
    value: "50K+",
    label: "Monthly therapy searches",
    description: "Families use the network to find ABA providers.",
  },
  {
    value: "500+",
    label: "Provider profiles",
    description: "Agencies building local visibility and intake flow.",
  },
  {
    value: "1,000+",
    label: "ABA professionals reached",
    description: "Candidates searching BCBA/RBT opportunities.",
  },
  {
    value: "100+",
    label: "Active job listings",
    description: "Hiring demand flowing through the jobs funnel.",
  },
];

export const behaviorWorkTestimonials: BehaviorWorkTestimonial[] = [
  {
    quote:
      "Behavior Work finally gave us one pipeline for inquiries and hiring. Our team stopped juggling disconnected tools.",
    name: "Lindsey W.",
    role: "Operations Director",
    company: "Northfield ABA",
    initials: "LW",
  },
  {
    quote:
      "We moved from missed calls and scattered applicants to one dashboard where leads and candidates are tracked clearly.",
    name: "David R.",
    role: "Practice Owner",
    company: "Bridgepoint Behavioral",
    initials: "DR",
  },
  {
    quote:
      "The branded forms and careers flow made us look more professional and helped us respond faster on both sides.",
    name: "Angela C.",
    role: "Client Growth Manager",
    company: "Elevate Kids ABA",
    initials: "AC",
  },
];

export const behaviorWorkFaqs: BehaviorWorkFaq[] = [
  {
    question: "Do I need separate accounts for Therapy and Jobs?",
    answer:
      "No. Behavior Work uses one account and one subscription to run both Find ABA Therapy and Find ABA Jobs workflows.",
  },
  {
    question: "Can I start free and upgrade later?",
    answer:
      "Yes. You can launch on the Free tier and upgrade to Pro or Enterprise when you want more visibility, forms, locations, jobs, and analytics.",
  },
  {
    question: "How fast can I launch branded pages?",
    answer:
      "Most agencies can publish branded contact, intake, resources, and careers pages the same day after onboarding.",
  },
  {
    question: "What does Operations include today?",
    answer:
      "Today includes clients, inquiries, applicants, tasks, and branded pages/forms. Employee lifecycle capabilities are actively expanding.",
  },
  {
    question: "Is this built for small and mid-sized ABA agencies?",
    answer:
      "Yes. The workflow is designed for growing ABA therapy agencies that need marketing, hiring, and operations in one place.",
  },
];

export const behaviorWorkPlanHighlights: Record<BehaviorWorkPlanTier, string[]> = {
  free: [
    "Professional listing with all profile details",
    "Up to 3 locations and 3 photos",
    "Ages, languages, diagnoses & specialties",
    "1 job posting + 10 client records",
  ],
  pro: [
    "Branded agency page & intake forms",
    "Up to 250 CRM contacts",
    "Communication templates & analytics",
    "Priority placement + 5 job postings",
  ],
  enterprise: [
    "Everything in Pro",
    "Unlimited locations, jobs & CRM contacts",
    "Homepage-level visibility",
    "Dedicated support",
  ],
};

export const behaviorWorkPlanFit: Record<BehaviorWorkPlanTier, string> = {
  free: "Professional listing with all the details families need",
  pro: "Branded pages, full CRM, and growth tools for scaling agencies",
  enterprise: "Maximum visibility and volume for large agencies",
};

export const behaviorWorkFeatureMatrix = [
  {
    group: "Listing & Profile",
    rows: [
      {
        label: "Directory listing",
        values: {
          free: "Standard",
          pro: "Priority",
          enterprise: "Priority",
        },
      },
      {
        label: "Ages, languages, diagnoses & specialties",
        values: {
          free: "Yes",
          pro: "Yes",
          enterprise: "Yes",
        },
      },
      {
        label: "Locations",
        values: {
          free: "Up to 3",
          pro: "Up to 5",
          enterprise: "Unlimited",
        },
      },
      {
        label: "Photos",
        values: {
          free: "Up to 3",
          pro: "Up to 10",
          enterprise: "Up to 10",
        },
      },
      {
        label: "Video embed",
        values: {
          free: "—",
          pro: "Yes",
          enterprise: "Yes",
        },
      },
      {
        label: "Verified badge & Google rating",
        values: {
          free: "—",
          pro: "Yes",
          enterprise: "Yes",
        },
      },
    ],
  },
  {
    group: "Branded Pages & CRM",
    rows: [
      {
        label: "Branded agency page",
        values: {
          free: "—",
          pro: "Yes",
          enterprise: "Yes",
        },
      },
      {
        label: "Contact form & inbox",
        values: {
          free: "—",
          pro: "Yes",
          enterprise: "Yes",
        },
      },
      {
        label: "Client intake form",
        values: {
          free: "—",
          pro: "Yes",
          enterprise: "Yes",
        },
      },
      {
        label: "Client records",
        values: {
          free: "Up to 10",
          pro: "Up to 250",
          enterprise: "Unlimited",
        },
      },
      {
        label: "Communication templates",
        values: {
          free: "—",
          pro: "Yes",
          enterprise: "Yes",
        },
      },
      {
        label: "Insurance & authorization tracking",
        values: {
          free: "—",
          pro: "Yes",
          enterprise: "Yes",
        },
      },
      {
        label: "Analytics & referral tracking",
        values: {
          free: "—",
          pro: "Yes",
          enterprise: "Advanced",
        },
      },
    ],
  },
  {
    group: "Hiring",
    rows: [
      {
        label: "Job postings",
        values: {
          free: "1",
          pro: "Up to 5",
          enterprise: "Unlimited",
        },
      },
      {
        label: "Branded careers page",
        values: {
          free: "Basic",
          pro: "Customizable",
          enterprise: "Customizable",
        },
      },
      {
        label: "Applicant pipeline",
        values: {
          free: "Yes",
          pro: "Yes",
          enterprise: "Yes",
        },
      },
    ],
  },
] as const;
