# Social Posts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a `/dashboard/social` page with ~50 curated, branded social post templates that Pro subscribers can copy (image + caption) and post to social media.

**Architecture:** Hardcoded template catalog in TypeScript. Satori-based image rendering via `next/og` (already installed). Pre-generate all branded PNGs per user on first visit, store in Supabase Storage `social-posts` bucket. Dashboard page with Upcoming + Library tabs, category filters, copy-to-clipboard actions.

**Tech Stack:** Next.js 15 App Router, `next/og` (Satori), Supabase Storage, existing dashboard UI components (`DashboardCard`, `DashboardPageHeader`, `DashboardEmptyState`, `PreviewBanner`/`PreviewOverlay`).

---

## Task 1: Plan Gating — Add `hasSocialPosts` Feature Flag

**Files:**
- Modify: `src/lib/plans/features.ts`
- Modify: `src/lib/plans/guards.ts`

**Step 1: Add feature flag to PlanFeatures interface**

In `src/lib/plans/features.ts`, add to `PlanFeatures` interface after `hasCredentialTracking`:

```typescript
  // Social Posts
  hasSocialPosts: boolean;
```

**Step 2: Set feature values in PLAN_CONFIGS**

In `free.features`, add:
```typescript
  hasSocialPosts: false,
```

In `pro.features`, add:
```typescript
  hasSocialPosts: true,
```

**Step 3: Add FEATURE_METADATA entry**

```typescript
  hasSocialPosts: {
    name: "Social Posts",
    description: "Branded social media post templates for your ABA practice",
    upgradeMessage: "Upgrade to Pro for branded social media post templates",
  },
```

**Step 4: Add guard function**

In `src/lib/plans/guards.ts`, add:

```typescript
/**
 * Guard: Check if user can access social posts
 */
export async function guardSocialPosts(): Promise<GuardResult> {
  const tier = await getCurrentPlanTier();
  const features = getPlanFeatures(tier);

  if (!features.hasSocialPosts) {
    return {
      allowed: false,
      reason: "Social posts is a Pro feature",
      requiredPlan: "pro",
    };
  }

  return { allowed: true };
}
```

**Step 5: Commit**

```bash
git add src/lib/plans/features.ts src/lib/plans/guards.ts
git commit -m "feat: add hasSocialPosts plan feature flag and guard"
```

---

## Task 2: Add Social Posts to Dashboard Navigation

**Files:**
- Modify: `src/components/dashboard/nav-config.ts`

**Step 1: Add import**

Add `Share2` to the lucide-react import.

**Step 2: Add nav item to Company section**

In `sectionNav`, find the `company` section and add after the Analytics item:

```typescript
      {
        href: "/dashboard/social",
        label: "Social Posts",
        icon: Share2,
        proBadge: true,
      },
```

**Step 3: Commit**

```bash
git add src/components/dashboard/nav-config.ts
git commit -m "feat: add Social Posts to dashboard navigation"
```

---

## Task 3: Template Catalog — Types and Data

**Files:**
- Create: `src/lib/social/types.ts`
- Create: `src/lib/social/templates.ts`
- Create: `src/lib/social/calendar.ts`

**Step 1: Create types file**

`src/lib/social/types.ts`:

```typescript
export type SocialCategory =
  | "aba_observance"
  | "autism_observance"
  | "national_holiday"
  | "seasonal"
  | "aba_tip"
  | "quote"
  | "announcement";

export type LayoutId =
  | "bold-quote"
  | "event-banner"
  | "tip-card"
  | "split-block"
  | "announcement"
  | "minimal";

export interface SocialTemplate {
  id: string;
  title: string;
  caption: string;
  hashtags: string;
  category: SocialCategory;
  layoutId: LayoutId;
  /** Props passed to the layout component: title, subtitle, icon label, etc. */
  layoutProps: {
    headline: string;
    subline?: string;
    accent?: string; // e.g. emoji or short label like "ABA Tip"
  };
  /** MM-DD for dated templates, null for evergreen */
  eventDate: string | null;
  /** Human-readable date label, e.g. "April 2" */
  eventDateLabel?: string;
}

export interface BrandData {
  agencyName: string;
  logoUrl: string | null;
  brandColor: string;
  profileId: string;
}

export const CATEGORY_LABELS: Record<SocialCategory, string> = {
  aba_observance: "ABA Observance",
  autism_observance: "Autism Observance",
  national_holiday: "Holiday",
  seasonal: "Seasonal",
  aba_tip: "ABA Tip",
  quote: "Quote",
  announcement: "Announcement",
};

export const CATEGORY_COLORS: Record<SocialCategory, string> = {
  aba_observance: "bg-blue-100 text-blue-800",
  autism_observance: "bg-violet-100 text-violet-800",
  national_holiday: "bg-red-100 text-red-800",
  seasonal: "bg-amber-100 text-amber-800",
  aba_tip: "bg-emerald-100 text-emerald-800",
  quote: "bg-pink-100 text-pink-800",
  announcement: "bg-indigo-100 text-indigo-800",
};
```

**Step 2: Create templates catalog**

`src/lib/social/templates.ts` — the full catalog of ~50 templates. Structure:

```typescript
import { type SocialTemplate } from "./types";

export const SOCIAL_TEMPLATES: SocialTemplate[] = [
  // === ABA Observances (8) ===
  {
    id: "bcba-appreciation-day",
    title: "BCBA Appreciation Day",
    caption: "Today we celebrate our incredible BCBAs who make a difference every single day. Thank you for your dedication, expertise, and heart. Happy BCBA Appreciation Day!",
    hashtags: "#BCBAAppreciationDay #BCBA #ABA #BehaviorAnalysis #ThankYouBCBAs",
    category: "aba_observance",
    layoutId: "event-banner",
    layoutProps: { headline: "Happy BCBA\nAppreciation Day", subline: "Thank you for making a difference", accent: "🎉" },
    eventDate: "03-15",
    eventDateLabel: "March 15",
  },
  {
    id: "rbt-appreciation-day",
    title: "RBT Appreciation Day",
    caption: "Shout out to the RBTs who show up every day with patience, compassion, and skill. You are the backbone of ABA therapy. Happy RBT Appreciation Day!",
    hashtags: "#RBTAppreciationDay #RBT #ABA #BehaviorAnalysis #ThankYouRBTs",
    category: "aba_observance",
    layoutId: "event-banner",
    layoutProps: { headline: "Happy RBT\nAppreciation Day", subline: "The backbone of ABA therapy", accent: "💙" },
    eventDate: "10-02",
    eventDateLabel: "October 2",
  },
  {
    id: "aba-day",
    title: "Applied Behavior Analysis Day",
    caption: "March 20th marks ABA Day — a day to recognize the science and the practitioners who use it to help individuals reach their full potential.",
    hashtags: "#ABADay #AppliedBehaviorAnalysis #ABA #BehaviorScience",
    category: "aba_observance",
    layoutId: "event-banner",
    layoutProps: { headline: "ABA Day", subline: "Celebrating the science of behavior", accent: "📊" },
    eventDate: "03-20",
    eventDateLabel: "March 20",
  },
  {
    id: "behavior-analysis-week",
    title: "Behavior Analysis Week",
    caption: "It's Behavior Analysis Week! This week we celebrate the science that helps us understand behavior and create meaningful change. Thank you to every behavior analyst, technician, and support professional making an impact.",
    hashtags: "#BehaviorAnalysisWeek #ABA #BACB #BehaviorScience",
    category: "aba_observance",
    layoutId: "bold-quote",
    layoutProps: { headline: "Behavior Analysis\nWeek", subline: "Understanding behavior. Creating change.", accent: "🧠" },
    eventDate: "03-08",
    eventDateLabel: "March (2nd week)",
  },
  {
    id: "speech-language-hearing-day",
    title: "Better Hearing and Speech Month",
    caption: "May is Better Hearing and Speech Month. Many of our clients benefit from collaborative care between ABA and speech-language pathology. Here's to the power of multidisciplinary teamwork!",
    hashtags: "#BHSM #SpeechTherapy #ABA #Collaboration #MultidisciplinaryCare",
    category: "aba_observance",
    layoutId: "minimal",
    layoutProps: { headline: "Better Hearing &\nSpeech Month", subline: "Collaboration makes the difference" },
    eventDate: "05-01",
    eventDateLabel: "May",
  },
  {
    id: "ot-month",
    title: "Occupational Therapy Month",
    caption: "April is Occupational Therapy Month! OTs play a vital role alongside ABA professionals in supporting daily living skills and independence. Teamwork at its best.",
    hashtags: "#OTMonth #OccupationalTherapy #ABA #Teamwork #Collaboration",
    category: "aba_observance",
    layoutId: "minimal",
    layoutProps: { headline: "Occupational\nTherapy Month", subline: "Supporting independence together" },
    eventDate: "04-01",
    eventDateLabel: "April",
  },
  {
    id: "special-education-day",
    title: "Special Education Day",
    caption: "December 2nd is Special Education Day, commemorating the signing of IDEA. Every child deserves access to the education and support they need to thrive.",
    hashtags: "#SpecialEducationDay #IDEA #SpecialEducation #ABA #Advocacy",
    category: "aba_observance",
    layoutId: "event-banner",
    layoutProps: { headline: "Special\nEducation Day", subline: "Every child deserves to thrive", accent: "📚" },
    eventDate: "12-02",
    eventDateLabel: "December 2",
  },
  {
    id: "developmental-disabilities-awareness",
    title: "Developmental Disabilities Awareness Month",
    caption: "March is Developmental Disabilities Awareness Month. We're proud to support individuals with developmental disabilities and their families on their journey.",
    hashtags: "#DDAM #DevelopmentalDisabilities #Inclusion #ABA #Awareness",
    category: "aba_observance",
    layoutId: "split-block",
    layoutProps: { headline: "Developmental\nDisabilities\nAwareness Month", subline: "Inclusion starts with understanding" },
    eventDate: "03-01",
    eventDateLabel: "March",
  },

  // === Autism Observances (6) ===
  {
    id: "autism-acceptance-month",
    title: "Autism Acceptance Month",
    caption: "April is Autism Acceptance Month. We celebrate the unique strengths and perspectives of autistic individuals. Acceptance means understanding, support, and inclusion every day.",
    hashtags: "#AutismAcceptanceMonth #AutismAcceptance #Neurodiversity #ABA #Inclusion",
    category: "autism_observance",
    layoutId: "bold-quote",
    layoutProps: { headline: "Autism\nAcceptance\nMonth", subline: "Celebrate. Accept. Include.", accent: "♾️" },
    eventDate: "04-01",
    eventDateLabel: "April",
  },
  {
    id: "world-autism-day",
    title: "World Autism Awareness Day",
    caption: "April 2nd is World Autism Awareness Day. Today and every day, we champion understanding, acceptance, and meaningful support for autistic individuals and their families.",
    hashtags: "#WorldAutismDay #WAAD #AutismAwareness #AutismAcceptance #ABA",
    category: "autism_observance",
    layoutId: "event-banner",
    layoutProps: { headline: "World Autism\nAwareness Day", subline: "April 2nd", accent: "🌍" },
    eventDate: "04-02",
    eventDateLabel: "April 2",
  },
  {
    id: "autistic-pride-day",
    title: "Autistic Pride Day",
    caption: "June 18th is Autistic Pride Day — a day to celebrate neurodiversity and the contributions of autistic people to our communities and world.",
    hashtags: "#AutisticPrideDay #Neurodiversity #AutismPride #Acceptance",
    category: "autism_observance",
    layoutId: "bold-quote",
    layoutProps: { headline: "Autistic\nPride Day", subline: "Celebrating neurodiversity", accent: "🌈" },
    eventDate: "06-18",
    eventDateLabel: "June 18",
  },
  {
    id: "disability-employment-awareness",
    title: "Disability Employment Awareness Month",
    caption: "October is National Disability Employment Awareness Month. Inclusive workplaces are stronger workplaces. We support meaningful employment opportunities for all.",
    hashtags: "#NDEAM #DisabilityEmployment #Inclusion #WorkplaceEquity #ABA",
    category: "autism_observance",
    layoutId: "split-block",
    layoutProps: { headline: "Disability\nEmployment\nAwareness Month", subline: "Inclusive workplaces are stronger" },
    eventDate: "10-01",
    eventDateLabel: "October",
  },
  {
    id: "communication-disabilities-awareness",
    title: "AAC Awareness Month",
    caption: "October is AAC Awareness Month. Augmentative and Alternative Communication tools empower individuals to express themselves. Communication is a right, not a privilege.",
    hashtags: "#AACawareness #AAC #Communication #AssistiveTechnology #ABA",
    category: "autism_observance",
    layoutId: "tip-card",
    layoutProps: { headline: "AAC Awareness\nMonth", subline: "Communication is a right", accent: "💬" },
    eventDate: "10-01",
    eventDateLabel: "October",
  },
  {
    id: "kindness-day-neurodiversity",
    title: "World Kindness Day",
    caption: "World Kindness Day reminds us that small acts of understanding go a long way. Kindness towards neurodivergent individuals means patience, acceptance, and genuine inclusion.",
    hashtags: "#WorldKindnessDay #Kindness #Neurodiversity #Inclusion #ABA",
    category: "autism_observance",
    layoutId: "minimal",
    layoutProps: { headline: "World\nKindness Day", subline: "Patience. Acceptance. Inclusion." },
    eventDate: "11-13",
    eventDateLabel: "November 13",
  },

  // === National Holidays (10) ===
  {
    id: "new-years-day",
    title: "Happy New Year",
    caption: "Happy New Year from our team! Wishing you a year filled with growth, progress, and new milestones. Here's to making a positive impact together in the year ahead.",
    hashtags: "#HappyNewYear #NewYear #ABA #NewBeginnings",
    category: "national_holiday",
    layoutId: "bold-quote",
    layoutProps: { headline: "Happy\nNew Year", subline: "Here's to growth and new milestones", accent: "🎆" },
    eventDate: "01-01",
    eventDateLabel: "January 1",
  },
  {
    id: "mlk-day",
    title: "Martin Luther King Jr. Day",
    caption: "Today we honor Dr. Martin Luther King Jr. and his vision of equality, justice, and compassion for all. Let's continue working toward a world where every individual is valued.",
    hashtags: "#MLKDay #MartinLutherKingJr #Equality #Justice #Community",
    category: "national_holiday",
    layoutId: "event-banner",
    layoutProps: { headline: "Martin Luther\nKing Jr. Day", subline: "Equality. Justice. Compassion." },
    eventDate: "01-20",
    eventDateLabel: "January (3rd Monday)",
  },
  {
    id: "valentines-day",
    title: "Valentine's Day",
    caption: "Happy Valentine's Day! Today we celebrate love in all its forms — the love between families, the love of learning, and the love we put into our work every day.",
    hashtags: "#ValentinesDay #Love #ABA #Community #Family",
    category: "national_holiday",
    layoutId: "minimal",
    layoutProps: { headline: "Happy\nValentine's Day", subline: "Celebrating love in all its forms", accent: "❤️" },
    eventDate: "02-14",
    eventDateLabel: "February 14",
  },
  {
    id: "memorial-day",
    title: "Memorial Day",
    caption: "This Memorial Day, we honor and remember those who made the ultimate sacrifice for our freedom. We are grateful for their service.",
    hashtags: "#MemorialDay #NeverForget #ThankYou #Honor",
    category: "national_holiday",
    layoutId: "event-banner",
    layoutProps: { headline: "Memorial Day", subline: "Honoring those who served", accent: "🇺🇸" },
    eventDate: "05-26",
    eventDateLabel: "May (last Monday)",
  },
  {
    id: "independence-day",
    title: "Happy 4th of July",
    caption: "Happy Independence Day! Wishing you a safe and joyful celebration with family and friends.",
    hashtags: "#4thOfJuly #IndependenceDay #HappyFourth #USA",
    category: "national_holiday",
    layoutId: "bold-quote",
    layoutProps: { headline: "Happy 4th\nof July", subline: "Celebrate safely!", accent: "🎇" },
    eventDate: "07-04",
    eventDateLabel: "July 4",
  },
  {
    id: "labor-day",
    title: "Happy Labor Day",
    caption: "Happy Labor Day! Thank you to our dedicated team and to ABA professionals everywhere who work tirelessly to make a difference. You deserve this rest.",
    hashtags: "#LaborDay #ThankYou #ABA #HardWork #TeamAppreciation",
    category: "national_holiday",
    layoutId: "minimal",
    layoutProps: { headline: "Happy\nLabor Day", subline: "Thank you to our dedicated team" },
    eventDate: "09-01",
    eventDateLabel: "September (1st Monday)",
  },
  {
    id: "thanksgiving",
    title: "Happy Thanksgiving",
    caption: "Happy Thanksgiving! We're grateful for the families we serve, the team members who give their best every day, and the community that supports us.",
    hashtags: "#Thanksgiving #Grateful #ABA #Community #Family",
    category: "national_holiday",
    layoutId: "split-block",
    layoutProps: { headline: "Happy\nThanksgiving", subline: "Grateful for our community", accent: "🦃" },
    eventDate: "11-27",
    eventDateLabel: "November (4th Thursday)",
  },
  {
    id: "christmas",
    title: "Merry Christmas",
    caption: "Merry Christmas from our family to yours! Wishing you a season filled with warmth, joy, and cherished moments with loved ones.",
    hashtags: "#MerryChristmas #HappyHolidays #ABA #Family #Joy",
    category: "national_holiday",
    layoutId: "bold-quote",
    layoutProps: { headline: "Merry\nChristmas", subline: "Warmth, joy, and cherished moments", accent: "🎄" },
    eventDate: "12-25",
    eventDateLabel: "December 25",
  },
  {
    id: "mothers-day",
    title: "Happy Mother's Day",
    caption: "Happy Mother's Day to all the incredible moms — especially the ABA moms who advocate, support, and love unconditionally. You are seen and appreciated.",
    hashtags: "#MothersDay #ABAMom #ThankYouMom #Family #Love",
    category: "national_holiday",
    layoutId: "split-block",
    layoutProps: { headline: "Happy\nMother's Day", subline: "You are seen and appreciated", accent: "💐" },
    eventDate: "05-11",
    eventDateLabel: "May (2nd Sunday)",
  },
  {
    id: "fathers-day",
    title: "Happy Father's Day",
    caption: "Happy Father's Day to all the dads who show up, support, and champion their children every single day. Your dedication matters.",
    hashtags: "#FathersDay #ABADad #ThankYouDad #Family",
    category: "national_holiday",
    layoutId: "split-block",
    layoutProps: { headline: "Happy\nFather's Day", subline: "Your dedication matters", accent: "👔" },
    eventDate: "06-15",
    eventDateLabel: "June (3rd Sunday)",
  },

  // === Seasonal (6) ===
  {
    id: "back-to-school",
    title: "Back to School",
    caption: "Back-to-school season is here! Transitions can be challenging, especially for our ABA families. Here are some tips: keep routines consistent, practice the school schedule at home, and communicate with your child's team.",
    hashtags: "#BackToSchool #ABA #SchoolTransition #AutismSupport #ParentTips",
    category: "seasonal",
    layoutId: "tip-card",
    layoutProps: { headline: "Back to School\nSeason", subline: "Tips for a smooth transition", accent: "🎒" },
    eventDate: "08-15",
    eventDateLabel: "Mid-August",
  },
  {
    id: "summer-break",
    title: "Summer Break Tips",
    caption: "Summer break can mean schedule changes for ABA families. Keep structure with visual schedules, plan sensory-friendly outings, and stay connected with your therapy team for summer goals.",
    hashtags: "#SummerBreak #ABA #SummerTips #VisualSchedules #FamilyFun",
    category: "seasonal",
    layoutId: "tip-card",
    layoutProps: { headline: "Summer Break\nTips", subline: "Stay structured. Stay connected.", accent: "☀️" },
    eventDate: "06-01",
    eventDateLabel: "June",
  },
  {
    id: "spring-renewal",
    title: "Spring Into Progress",
    caption: "Spring is a time for fresh starts and renewed energy. It's a great time to review goals, celebrate progress, and set new milestones with your ABA team.",
    hashtags: "#Spring #ABA #Progress #FreshStart #GoalSetting",
    category: "seasonal",
    layoutId: "bold-quote",
    layoutProps: { headline: "Spring Into\nProgress", subline: "Fresh starts. Renewed goals.", accent: "🌷" },
    eventDate: "03-20",
    eventDateLabel: "March 20",
  },
  {
    id: "fall-routine",
    title: "Fall Routine Reset",
    caption: "Fall is the perfect time to reset routines. Consistent schedules, clear expectations, and structured environments help everyone thrive — at home and in therapy.",
    hashtags: "#Fall #ABA #RoutineReset #Structure #Consistency",
    category: "seasonal",
    layoutId: "tip-card",
    layoutProps: { headline: "Fall Routine\nReset", subline: "Consistency is key", accent: "🍂" },
    eventDate: "09-22",
    eventDateLabel: "September 22",
  },
  {
    id: "holiday-season-tips",
    title: "Holiday Season Tips",
    caption: "The holiday season can be overstimulating. Prepare your child with social stories, plan quiet spaces at gatherings, and keep favorite comfort items handy. Small preparations make a big difference.",
    hashtags: "#HolidaySeason #ABA #SensoryTips #AutismSupport #FamilyTips",
    category: "seasonal",
    layoutId: "tip-card",
    layoutProps: { headline: "Holiday Season\nTips", subline: "Small preparations, big difference", accent: "🎁" },
    eventDate: "12-01",
    eventDateLabel: "December",
  },
  {
    id: "new-year-goals",
    title: "New Year, New Goals",
    caption: "New year, new goals! Whether it's communication milestones, social skills, or daily living tasks, we're here to support your family's journey every step of the way.",
    hashtags: "#NewYear #ABA #Goals #Progress #ABACommunity",
    category: "seasonal",
    layoutId: "split-block",
    layoutProps: { headline: "New Year\nNew Goals", subline: "Supporting your family's journey", accent: "🎯" },
    eventDate: "01-05",
    eventDateLabel: "Early January",
  },

  // === ABA Tips (10) ===
  {
    id: "tip-positive-reinforcement",
    title: "The Power of Positive Reinforcement",
    caption: "Positive reinforcement is one of the most powerful tools in ABA therapy. When we reward desired behaviors, they're more likely to happen again. Catch your child doing something great today and celebrate it!",
    hashtags: "#ABA #PositiveReinforcement #ABATip #BehaviorAnalysis #ParentTips",
    category: "aba_tip",
    layoutId: "tip-card",
    layoutProps: { headline: "The Power of Positive\nReinforcement", subline: "Catch them doing something great!", accent: "ABA Tip" },
    eventDate: null,
  },
  {
    id: "tip-visual-schedules",
    title: "Visual Schedules Work",
    caption: "Visual schedules reduce anxiety and increase independence by showing what comes next. Use pictures, icons, or written words depending on your child's level. Consistency is key!",
    hashtags: "#VisualSchedules #ABA #ABATip #Independence #AutismSupport",
    category: "aba_tip",
    layoutId: "tip-card",
    layoutProps: { headline: "Visual Schedules\nWork", subline: "Reduce anxiety. Increase independence.", accent: "ABA Tip" },
    eventDate: null,
  },
  {
    id: "tip-consistency",
    title: "Consistency Is Everything",
    caption: "In ABA therapy, consistency across environments is crucial. When home, school, and therapy teams use the same strategies, children make faster progress. Team communication matters!",
    hashtags: "#ABA #Consistency #ABATip #Teamwork #BehaviorAnalysis",
    category: "aba_tip",
    layoutId: "tip-card",
    layoutProps: { headline: "Consistency Is\nEverything", subline: "Same strategies. Faster progress.", accent: "ABA Tip" },
    eventDate: null,
  },
  {
    id: "tip-pairing",
    title: "What Is Pairing?",
    caption: "Pairing is when a therapist builds rapport with a child by associating themselves with fun, preferred activities. Before any teaching happens, trust and connection come first. That's good ABA.",
    hashtags: "#Pairing #ABA #ABATip #BuildingRapport #Trust",
    category: "aba_tip",
    layoutId: "tip-card",
    layoutProps: { headline: "What Is\nPairing?", subline: "Trust and connection come first", accent: "ABA Tip" },
    eventDate: null,
  },
  {
    id: "tip-generalization",
    title: "Skills That Transfer",
    caption: "A skill learned in therapy should work everywhere — at home, school, the grocery store. That's called generalization, and it's a core goal of ABA. Practice skills in different settings!",
    hashtags: "#Generalization #ABA #ABATip #SkillBuilding #RealWorldSkills",
    category: "aba_tip",
    layoutId: "tip-card",
    layoutProps: { headline: "Skills That\nTransfer", subline: "Generalization is the goal", accent: "ABA Tip" },
    eventDate: null,
  },
  {
    id: "tip-data-driven",
    title: "Data Drives Decisions",
    caption: "In ABA, we don't guess — we measure. Data collection helps us know what's working, what's not, and when to adjust. Every data point tells part of the story.",
    hashtags: "#DataDriven #ABA #ABATip #EvidenceBased #BehaviorAnalysis",
    category: "aba_tip",
    layoutId: "tip-card",
    layoutProps: { headline: "Data Drives\nDecisions", subline: "We don't guess — we measure", accent: "ABA Tip" },
    eventDate: null,
  },
  {
    id: "tip-natural-environment",
    title: "Learning in Natural Environments",
    caption: "Some of the best learning happens in everyday moments — during play, mealtime, or a walk outside. Natural Environment Teaching (NET) makes learning feel like life.",
    hashtags: "#NET #NaturalEnvironmentTeaching #ABA #ABATip #PlayBasedLearning",
    category: "aba_tip",
    layoutId: "tip-card",
    layoutProps: { headline: "Learning in\nNatural Environments", subline: "The best learning is everyday life", accent: "ABA Tip" },
    eventDate: null,
  },
  {
    id: "tip-self-care-families",
    title: "Self-Care for ABA Families",
    caption: "Caring for a child in ABA therapy is rewarding — and tiring. Remember to take care of yourself too. You can't pour from an empty cup. Your well-being matters.",
    hashtags: "#SelfCare #ABAFamilies #ABATip #ParentWellbeing #YouMatter",
    category: "aba_tip",
    layoutId: "bold-quote",
    layoutProps: { headline: "Self-Care for\nABA Families", subline: "You can't pour from an empty cup" },
    eventDate: null,
  },
  {
    id: "tip-communication-first",
    title: "Communication Comes First",
    caption: "Every behavior is communication. Before we focus on changing behavior, we ask: what is this person trying to tell us? Understanding the function of behavior is the foundation of ABA.",
    hashtags: "#Communication #ABA #ABATip #FunctionOfBehavior #Understanding",
    category: "aba_tip",
    layoutId: "tip-card",
    layoutProps: { headline: "Communication\nComes First", subline: "Every behavior is communication", accent: "ABA Tip" },
    eventDate: null,
  },
  {
    id: "tip-celebrate-small-wins",
    title: "Celebrate Small Wins",
    caption: "Progress isn't always big leaps — it's often small, consistent steps. Celebrate every new word, every successful transition, every moment of eye contact. Every win matters.",
    hashtags: "#CelebrateProgress #ABA #ABATip #SmallWins #Progress",
    category: "aba_tip",
    layoutId: "bold-quote",
    layoutProps: { headline: "Celebrate\nSmall Wins", subline: "Every step forward matters" },
    eventDate: null,
  },

  // === Quotes (6) ===
  {
    id: "quote-different-not-less",
    title: "Different, Not Less",
    caption: "\"Different, not less.\" Every individual brings unique strengths and perspectives. Our role is to support, not change who they are.",
    hashtags: "#DifferentNotLess #Neurodiversity #ABA #AutismAcceptance #Inclusion",
    category: "quote",
    layoutId: "bold-quote",
    layoutProps: { headline: "Different,\nNot Less", subline: "Every individual brings unique strengths" },
    eventDate: null,
  },
  {
    id: "quote-progress-not-perfection",
    title: "Progress, Not Perfection",
    caption: "We don't chase perfection — we chase progress. Every small step forward is a victory worth celebrating.",
    hashtags: "#ProgressNotPerfection #ABA #Growth #Motivation #ABACommunity",
    category: "quote",
    layoutId: "bold-quote",
    layoutProps: { headline: "Progress,\nNot Perfection", subline: "Every step forward is a victory" },
    eventDate: null,
  },
  {
    id: "quote-it-takes-a-village",
    title: "It Takes a Village",
    caption: "Supporting a child's growth takes a team — therapists, teachers, families, and community. Together, we can accomplish more than any of us could alone.",
    hashtags: "#ItTakesAVillage #ABA #Teamwork #Community #Support",
    category: "quote",
    layoutId: "split-block",
    layoutProps: { headline: "It Takes\na Village", subline: "Together, we accomplish more" },
    eventDate: null,
  },
  {
    id: "quote-believe-in-potential",
    title: "Believe in Their Potential",
    caption: "When we believe in someone's potential, we create space for growth. Every person has the capacity to learn, grow, and surprise us.",
    hashtags: "#BelieveInPotential #ABA #Growth #Motivation #Possibility",
    category: "quote",
    layoutId: "bold-quote",
    layoutProps: { headline: "Believe in\nTheir Potential", subline: "Everyone has the capacity to grow" },
    eventDate: null,
  },
  {
    id: "quote-compassion-in-action",
    title: "Compassion in Action",
    caption: "ABA therapy at its best is compassion in action — meeting people where they are and walking alongside them toward their goals.",
    hashtags: "#CompassionInAction #ABA #BehaviorAnalysis #Empathy #Support",
    category: "quote",
    layoutId: "minimal",
    layoutProps: { headline: "Compassion\nin Action", subline: "Meeting people where they are" },
    eventDate: null,
  },
  {
    id: "quote-every-child-can-learn",
    title: "Every Child Can Learn",
    caption: "Every child can learn. The question isn't if — it's how. That's what ABA helps us discover.",
    hashtags: "#EveryChildCanLearn #ABA #BehaviorAnalysis #Education #Potential",
    category: "quote",
    layoutId: "bold-quote",
    layoutProps: { headline: "Every Child\nCan Learn", subline: "The question isn't if — it's how" },
    eventDate: null,
  },

  // === Announcements (4) ===
  {
    id: "announcement-hiring",
    title: "We're Hiring!",
    caption: "We're growing! Join our team and make a difference in the lives of children and families. Check our careers page for open positions.",
    hashtags: "#NowHiring #ABAJobs #JoinOurTeam #ABA #Careers",
    category: "announcement",
    layoutId: "announcement",
    layoutProps: { headline: "We're Hiring!", subline: "Join our team and make a difference" },
    eventDate: null,
  },
  {
    id: "announcement-accepting-clients",
    title: "Now Accepting New Clients",
    caption: "We're currently accepting new clients! If your family is looking for quality ABA therapy services, reach out to us today. We'd love to support your child's journey.",
    hashtags: "#AcceptingClients #ABA #ABATherapy #NewClients #FamilySupport",
    category: "announcement",
    layoutId: "announcement",
    layoutProps: { headline: "Now Accepting\nNew Clients", subline: "Reach out to start your journey" },
    eventDate: null,
  },
  {
    id: "announcement-new-location",
    title: "New Location Opening",
    caption: "Exciting news! We're opening a new location to better serve our community. Stay tuned for more details on how we're bringing ABA services closer to you.",
    hashtags: "#NewLocation #ABA #GrowingTeam #Community #ABATherapy",
    category: "announcement",
    layoutId: "announcement",
    layoutProps: { headline: "New Location\nOpening Soon", subline: "Bringing ABA services closer to you" },
    eventDate: null,
  },
  {
    id: "announcement-thank-you-families",
    title: "Thank You to Our Families",
    caption: "To every family who trusts us with their child's care — thank you. Your partnership and dedication inspire us every day. We're honored to be part of your journey.",
    hashtags: "#ThankYou #ABAFamilies #Gratitude #ABA #Partnership",
    category: "announcement",
    layoutId: "split-block",
    layoutProps: { headline: "Thank You\nto Our Families", subline: "Your trust inspires us every day" },
    eventDate: null,
  },
];

/** Get templates by category */
export function getTemplatesByCategory(category: SocialCategory): SocialTemplate[] {
  return SOCIAL_TEMPLATES.filter((t) => t.category === category);
}

/** Get a single template by ID */
export function getTemplateById(id: string): SocialTemplate | undefined {
  return SOCIAL_TEMPLATES.find((t) => t.id === id);
}
```

**Step 3: Create calendar utility**

`src/lib/social/calendar.ts`:

```typescript
import { type SocialTemplate } from "./types";
import { SOCIAL_TEMPLATES } from "./templates";

/**
 * Get upcoming dated templates within the next N days (default 21).
 * Sorts by days until event (soonest first).
 */
export function getUpcomingTemplates(
  windowDays = 21,
  referenceDate = new Date()
): (SocialTemplate & { daysUntil: number; nextOccurrence: Date })[] {
  const today = referenceDate;
  const currentYear = today.getFullYear();

  const upcoming: (SocialTemplate & { daysUntil: number; nextOccurrence: Date })[] = [];

  for (const template of SOCIAL_TEMPLATES) {
    if (!template.eventDate) continue;

    const [month, day] = template.eventDate.split("-").map(Number);

    // Check this year and next year
    for (const year of [currentYear, currentYear + 1]) {
      const eventDate = new Date(year, month - 1, day);
      const diffMs = eventDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays >= -1 && diffDays <= windowDays) {
        upcoming.push({
          ...template,
          daysUntil: diffDays,
          nextOccurrence: eventDate,
        });
        break; // Only include the nearest occurrence
      }
    }
  }

  return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
}
```

**Step 4: Commit**

```bash
git add src/lib/social/
git commit -m "feat: add social post template catalog, types, and calendar utility"
```

---

## Task 4: Satori Layout Components

**Files:**
- Create: `src/lib/social/layouts.tsx`

**Step 1: Create all 6 layout components**

These are JSX components compatible with Satori (flexbox only, no grid, limited CSS).
Each renders at 1080x1080 and accepts brand data + layout props.

`src/lib/social/layouts.tsx`:

```tsx
/* eslint-disable @next/next/no-img-element */
import type { BrandData } from "./types";

interface LayoutComponentProps {
  brand: BrandData;
  headline: string;
  subline?: string;
  accent?: string;
}

/** Lighten/darken utility for text contrast */
function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#1a1a1a" : "#ffffff";
}

function lightenColor(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function BrandFooter({ brand, textColor = "#ffffff" }: { brand: BrandData; textColor?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      {brand.logoUrl && (
        <img
          src={brand.logoUrl}
          alt=""
          width={48}
          height={48}
          style={{ borderRadius: 8, objectFit: "cover" }}
        />
      )}
      <span style={{ fontSize: 28, color: textColor, fontWeight: 600 }}>
        {brand.agencyName}
      </span>
    </div>
  );
}

/** Layout 1: Bold quote — large centered text on brand color */
export function BoldQuoteLayout({ brand, headline, subline }: LayoutComponentProps) {
  const textColor = getContrastColor(brand.brandColor);
  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: brand.brandColor,
        padding: 80,
        textAlign: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, justifyContent: "center" }}>
        <span style={{ fontSize: 72, fontWeight: 800, color: textColor, lineHeight: 1.1 }}>
          {headline}
        </span>
        {subline && (
          <span style={{ fontSize: 32, color: textColor, opacity: 0.85, marginTop: 24 }}>
            {subline}
          </span>
        )}
      </div>
      <BrandFooter brand={brand} textColor={textColor} />
    </div>
  );
}

/** Layout 2: Event banner — event name big, date, border accent */
export function EventBannerLayout({ brand, headline, subline, accent }: LayoutComponentProps) {
  const textColor = getContrastColor(brand.brandColor);
  const bgLight = lightenColor(brand.brandColor, 40);
  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        backgroundColor: bgLight,
        border: `12px solid ${brand.brandColor}`,
        padding: 70,
      }}
    >
      {accent && (
        <span style={{ fontSize: 56, marginBottom: 16 }}>{accent}</span>
      )}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        <span style={{ fontSize: 68, fontWeight: 800, color: "#1a1a1a", lineHeight: 1.15 }}>
          {headline}
        </span>
        {subline && (
          <span style={{ fontSize: 30, color: "#444444", marginTop: 20 }}>
            {subline}
          </span>
        )}
      </div>
      <BrandFooter brand={brand} textColor="#1a1a1a" />
    </div>
  );
}

/** Layout 3: Tip card — header badge, body text, accent bar */
export function TipCardLayout({ brand, headline, subline, accent }: LayoutComponentProps) {
  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#ffffff",
        padding: 70,
      }}
    >
      {/* Accent bar top */}
      <div style={{ display: "flex", width: "100%", height: 8, backgroundColor: brand.brandColor, borderRadius: 4, marginBottom: 40 }} />
      {accent && (
        <div style={{ display: "flex" }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: brand.brandColor,
              backgroundColor: `${brand.brandColor}15`,
              padding: "8px 20px",
              borderRadius: 24,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            {accent}
          </span>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
        <span style={{ fontSize: 60, fontWeight: 800, color: "#1a1a1a", lineHeight: 1.15 }}>
          {headline}
        </span>
        {subline && (
          <span style={{ fontSize: 28, color: "#555555", marginTop: 20 }}>
            {subline}
          </span>
        )}
      </div>
      <BrandFooter brand={brand} textColor="#1a1a1a" />
    </div>
  );
}

/** Layout 4: Split block — left brand color, right white */
export function SplitBlockLayout({ brand, headline, subline, accent }: LayoutComponentProps) {
  const textColor = getContrastColor(brand.brandColor);
  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "row",
      }}
    >
      {/* Left half */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 540,
          backgroundColor: brand.brandColor,
          padding: 60,
          justifyContent: "center",
        }}
      >
        {accent && (
          <span style={{ fontSize: 48, marginBottom: 16 }}>{accent}</span>
        )}
        <span style={{ fontSize: 56, fontWeight: 800, color: textColor, lineHeight: 1.15 }}>
          {headline}
        </span>
        {subline && (
          <span style={{ fontSize: 26, color: textColor, opacity: 0.85, marginTop: 20 }}>
            {subline}
          </span>
        )}
      </div>
      {/* Right half */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: 540,
          backgroundColor: "#ffffff",
          padding: 60,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {brand.logoUrl && (
          <img
            src={brand.logoUrl}
            alt=""
            width={160}
            height={160}
            style={{ borderRadius: 16, objectFit: "cover", marginBottom: 24 }}
          />
        )}
        <span style={{ fontSize: 32, fontWeight: 700, color: "#1a1a1a", textAlign: "center" }}>
          {brand.agencyName}
        </span>
      </div>
    </div>
  );
}

/** Layout 5: Announcement — bold headline on brand color */
export function AnnouncementLayout({ brand, headline, subline }: LayoutComponentProps) {
  const textColor = getContrastColor(brand.brandColor);
  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: brand.brandColor,
        padding: 80,
        textAlign: "center",
      }}
    >
      {brand.logoUrl && (
        <img
          src={brand.logoUrl}
          alt=""
          width={100}
          height={100}
          style={{ borderRadius: 16, objectFit: "cover", marginBottom: 40 }}
        />
      )}
      <span style={{ fontSize: 72, fontWeight: 900, color: textColor, lineHeight: 1.1 }}>
        {headline}
      </span>
      {subline && (
        <span style={{ fontSize: 32, color: textColor, opacity: 0.85, marginTop: 24 }}>
          {subline}
        </span>
      )}
      <span style={{ fontSize: 28, fontWeight: 600, color: textColor, opacity: 0.7, marginTop: 40 }}>
        {brand.agencyName}
      </span>
    </div>
  );
}

/** Layout 6: Minimal — white bg, thin brand border, centered text */
export function MinimalLayout({ brand, headline, subline }: LayoutComponentProps) {
  return (
    <div
      style={{
        width: 1080,
        height: 1080,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#ffffff",
        border: `6px solid ${brand.brandColor}`,
        padding: 80,
        textAlign: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, justifyContent: "center" }}>
        <span style={{ fontSize: 64, fontWeight: 800, color: "#1a1a1a", lineHeight: 1.15 }}>
          {headline}
        </span>
        {subline && (
          <span style={{ fontSize: 28, color: "#555555", marginTop: 20 }}>
            {subline}
          </span>
        )}
      </div>
      <BrandFooter brand={brand} textColor="#1a1a1a" />
    </div>
  );
}

/** Map layout ID to component */
export const LAYOUT_COMPONENTS = {
  "bold-quote": BoldQuoteLayout,
  "event-banner": EventBannerLayout,
  "tip-card": TipCardLayout,
  "split-block": SplitBlockLayout,
  "announcement": AnnouncementLayout,
  "minimal": MinimalLayout,
} as const;
```

**Step 2: Commit**

```bash
git add src/lib/social/layouts.tsx
git commit -m "feat: add 6 Satori layout components for social post rendering"
```

---

## Task 5: Image Rendering API Route

**Files:**
- Create: `src/app/api/social/render/[templateId]/route.tsx`
- Create: `src/lib/social/render.tsx`

**Step 1: Create the render utility**

`src/lib/social/render.tsx`:

```tsx
import { ImageResponse } from "next/og";
import { type SocialTemplate, type BrandData } from "./types";
import { LAYOUT_COMPONENTS } from "./layouts";

/**
 * Render a social post template as a PNG ImageResponse.
 */
export function renderSocialImage(
  template: SocialTemplate,
  brand: BrandData
): ImageResponse {
  const LayoutComponent = LAYOUT_COMPONENTS[template.layoutId];

  return new ImageResponse(
    <LayoutComponent
      brand={brand}
      headline={template.layoutProps.headline}
      subline={template.layoutProps.subline}
      accent={template.layoutProps.accent}
    />,
    {
      width: 1080,
      height: 1080,
    }
  );
}
```

**Step 2: Create the API route**

`src/app/api/social/render/[templateId]/route.tsx`:

```tsx
import { NextRequest, NextResponse } from "next/server";
import { createClient, getCurrentProfileId } from "@/lib/supabase/server";
import { getTemplateById } from "@/lib/social/templates";
import { renderSocialImage } from "@/lib/social/render";
import type { BrandData } from "@/lib/social/types";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;

  // Auth
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get template
  const template = getTemplateById(templateId);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Get brand data
  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select(
      "logo_url, profiles!inner(agency_name, intake_form_settings)"
    )
    .eq("profile_id", profileId)
    .single();

  const profile = listing?.profiles as unknown as {
    agency_name: string | null;
    intake_form_settings: { background_color?: string } | null;
  };

  const brand: BrandData = {
    agencyName: profile?.agency_name || "Your Agency",
    logoUrl: listing?.logo_url || null,
    brandColor:
      profile?.intake_form_settings?.background_color || "#5788FF",
    profileId,
  };

  // Render
  return renderSocialImage(template, brand);
}
```

**Step 3: Commit**

```bash
git add src/lib/social/render.tsx src/app/api/social/render/
git commit -m "feat: add social post image rendering API route using Satori"
```

---

## Task 6: Pre-Generation Server Action

**Files:**
- Create: `src/lib/actions/social.ts`

**Step 1: Create the social server action file**

`src/lib/actions/social.ts`:

```typescript
"use server";

import { createClient, getCurrentProfileId } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SOCIAL_TEMPLATES } from "@/lib/social/templates";
import { type BrandData } from "@/lib/social/types";
import crypto from "crypto";
import type { ActionResult } from "@/lib/actions/types";

const BUCKET = "social-posts";

/** Hash brand inputs to detect changes */
function hashBrand(brand: BrandData): string {
  const input = `${brand.agencyName}|${brand.logoUrl || ""}|${brand.brandColor}`;
  return crypto.createHash("md5").update(input).digest("hex").slice(0, 12);
}

/** Get brand data for the current user */
export async function getSocialBrandData(): Promise<ActionResult<BrandData>> {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("logo_url, profiles!inner(agency_name, intake_form_settings)")
    .eq("profile_id", profileId)
    .single();

  const profile = listing?.profiles as unknown as {
    agency_name: string | null;
    intake_form_settings: { background_color?: string } | null;
  };

  return {
    success: true,
    data: {
      agencyName: profile?.agency_name || "Your Agency",
      logoUrl: listing?.logo_url || null,
      brandColor: profile?.intake_form_settings?.background_color || "#5788FF",
      profileId,
    },
  };
}

/** Check if pre-generated assets exist and are current */
export async function checkSocialAssetsStatus(): Promise<
  ActionResult<{ ready: boolean; brandHash: string; assetCount: number }>
> {
  const brandResult = await getSocialBrandData();
  if (!brandResult.success || !brandResult.data) {
    return { success: false, error: brandResult.error || "No brand data" };
  }

  const brand = brandResult.data;
  const currentHash = hashBrand(brand);
  const supabase = await createClient();

  // Check for the manifest file which contains the brand hash
  const { data: manifestData } = await supabase.storage
    .from(BUCKET)
    .download(`${brand.profileId}/manifest.json`);

  if (manifestData) {
    try {
      const manifest = JSON.parse(await manifestData.text());
      if (manifest.brandHash === currentHash) {
        return {
          success: true,
          data: {
            ready: true,
            brandHash: currentHash,
            assetCount: manifest.count || 0,
          },
        };
      }
    } catch {
      // Manifest corrupt, regenerate
    }
  }

  return {
    success: true,
    data: { ready: false, brandHash: currentHash, assetCount: 0 },
  };
}

/** Trigger async pre-generation of all social post images */
export async function generateSocialAssets(): Promise<ActionResult<{ started: boolean }>> {
  const profileId = await getCurrentProfileId();
  if (!profileId) {
    return { success: false, error: "Not authenticated" };
  }

  const brandResult = await getSocialBrandData();
  if (!brandResult.success || !brandResult.data) {
    return { success: false, error: brandResult.error || "No brand data" };
  }

  const brand = brandResult.data;
  const currentHash = hashBrand(brand);

  // Call the generation API route (fire and forget via fetch to our own API)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.findabatherapy.org";

  // We generate inline here instead of calling an external API route.
  // This runs in the server action context.
  try {
    const serviceClient = createServiceClient();
    let generatedCount = 0;

    for (const template of SOCIAL_TEMPLATES) {
      try {
        // Render the image by calling our API route
        const renderUrl = `${baseUrl}/api/social/render/${template.id}`;
        const response = await fetch(renderUrl, {
          headers: {
            cookie: "", // Will be auth'd via service client below
          },
        });

        // Actually, we should render directly here. Import the render function.
        const { renderSocialImage } = await import("@/lib/social/render");
        const imageResponse = renderSocialImage(template, brand);
        const imageBuffer = await imageResponse.arrayBuffer();

        // Upload to Supabase Storage
        const path = `${profileId}/${template.id}.png`;
        await serviceClient.storage
          .from(BUCKET)
          .upload(path, imageBuffer, {
            contentType: "image/png",
            upsert: true,
          });

        generatedCount++;
      } catch (err) {
        console.error(`Failed to generate social post ${template.id}:`, err);
      }
    }

    // Write manifest
    const manifest = JSON.stringify({
      brandHash: currentHash,
      count: generatedCount,
      generatedAt: new Date().toISOString(),
    });

    await serviceClient.storage
      .from(BUCKET)
      .upload(`${profileId}/manifest.json`, manifest, {
        contentType: "application/json",
        upsert: true,
      });

    return { success: true, data: { started: true } };
  } catch (error) {
    console.error("Failed to generate social assets:", error);
    return { success: false, error: "Failed to generate assets" };
  }
}

/** Get the public URL for a pre-generated social post image */
export function getSocialImageUrl(profileId: string, templateId: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${profileId}/${templateId}.png`;
}
```

**Step 2: Check if `createServiceClient` exists, and verify ActionResult import path**

Look at existing server actions to find the `ActionResult` type import path and `createServiceClient`.

**Step 3: Commit**

```bash
git add src/lib/actions/social.ts
git commit -m "feat: add social posts server actions for pre-generation and asset management"
```

---

## Task 7: Supabase Storage Bucket Setup

**Files:**
- Modify: `src/lib/storage/config.ts`
- Create: `supabase/migrations/XXX_create_social_posts_bucket.sql` (next migration number)

**Step 1: Add bucket to storage config**

In `src/lib/storage/config.ts`, add to `STORAGE_BUCKETS`:

```typescript
  socialPosts: "social-posts",
```

**Step 2: Create migration for bucket + RLS**

Create migration (determine next number from existing migrations):

```sql
-- Create social-posts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-posts', 'social-posts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read their own social posts
CREATE POLICY "Users can read own social posts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'social-posts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow service role to write (via server actions)
-- Public bucket allows read for all, write is handled by service role
CREATE POLICY "Public read for social posts"
ON storage.objects FOR SELECT
USING (bucket_id = 'social-posts');
```

**Step 3: Commit**

```bash
git add src/lib/storage/config.ts supabase/migrations/
git commit -m "feat: add social-posts storage bucket and RLS policies"
```

---

## Task 8: Dashboard Page — Server Component

**Files:**
- Create: `src/app/(dashboard)/dashboard/social/page.tsx`

**Step 1: Create the page**

`src/app/(dashboard)/dashboard/social/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { Share2 } from "lucide-react";

import { DashboardPageHeader } from "@/components/dashboard/dashboard-page-header";
import { DashboardCard, DashboardEmptyState } from "@/components/dashboard/ui";
import { PreviewBanner } from "@/components/ui/preview-banner";
import { PreviewOverlay } from "@/components/ui/preview-overlay";
import { getUser } from "@/lib/supabase/server";
import { getCurrentPlanTier } from "@/lib/plans/guards";
import {
  getSocialBrandData,
  checkSocialAssetsStatus,
} from "@/lib/actions/social";
import { SOCIAL_TEMPLATES } from "@/lib/social/templates";
import { getUpcomingTemplates } from "@/lib/social/calendar";
import { SocialPostsClient } from "@/components/dashboard/social/social-posts-client";

export const metadata = {
  title: "Social Posts | Dashboard",
  description: "Branded social media post templates for your ABA practice",
};

export default async function SocialPostsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const planTier = await getCurrentPlanTier();
  const isPreview = planTier === "free";

  if (isPreview) {
    return (
      <div className="space-y-3">
        <PreviewBanner
          message="Social Posts is a Pro feature. Upgrade to access branded social media templates."
          variant="inline"
          triggerFeature="social_posts"
        />
        <DashboardPageHeader
          title="Social Posts"
          description="Branded social media templates for your ABA practice"
        />
        <PreviewOverlay isPreview>
          <DashboardCard className="p-5 sm:p-6">
            <DashboardEmptyState
              icon={Share2}
              title="Branded Social Posts"
              description="Get ready-to-use, branded social media posts for holidays, ABA tips, and announcements."
              benefits={[
                "50+ curated post templates",
                "Branded with your logo and colors",
                "Copy image and caption with one click",
                "Upcoming holidays and events calendar",
              ]}
            />
          </DashboardCard>
        </PreviewOverlay>
      </div>
    );
  }

  // Get brand data
  const brandResult = await getSocialBrandData();
  const brand = brandResult.success ? brandResult.data : null;

  if (!brand || (!brand.logoUrl && brand.agencyName === "Your Agency")) {
    return (
      <div className="space-y-3">
        <DashboardPageHeader
          title="Social Posts"
          description="Branded social media templates for your ABA practice"
        />
        <DashboardCard className="p-5 sm:p-6">
          <DashboardEmptyState
            icon={Share2}
            title="Complete Your Brand Setup"
            description="Add your agency name and logo to generate branded social posts. Visit your Brand Style page to get started."
          />
        </DashboardCard>
      </div>
    );
  }

  // Check asset generation status
  const statusResult = await checkSocialAssetsStatus();
  const assetsReady = statusResult.success && statusResult.data?.ready;

  // Get upcoming templates
  const upcoming = getUpcomingTemplates();

  return (
    <div className="space-y-3">
      <DashboardPageHeader
        title="Social Posts"
        description={`${SOCIAL_TEMPLATES.length} branded templates ready to share`}
      />
      <SocialPostsClient
        templates={SOCIAL_TEMPLATES}
        upcoming={upcoming}
        profileId={brand.profileId}
        assetsReady={assetsReady || false}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/(dashboard)/dashboard/social/
git commit -m "feat: add social posts dashboard page with plan gating and brand checks"
```

---

## Task 9: Dashboard Page — Client Component

**Files:**
- Create: `src/components/dashboard/social/social-posts-client.tsx`

**Step 1: Create the client component with tabs, filters, cards, copy actions**

`src/components/dashboard/social/social-posts-client.tsx`:

```tsx
"use client";

import { useState, useEffect, useTransition } from "react";
import { Calendar, Copy, Download, Check, ImageIcon, Loader2 } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardCard, DashboardTabsList } from "@/components/dashboard/ui";
import {
  type SocialTemplate,
  type SocialCategory,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
} from "@/lib/social/types";
import { generateSocialAssets, getSocialImageUrl } from "@/lib/actions/social";

interface UpcomingTemplate extends SocialTemplate {
  daysUntil: number;
  nextOccurrence: Date;
}

interface SocialPostsClientProps {
  templates: SocialTemplate[];
  upcoming: UpcomingTemplate[];
  profileId: string;
  assetsReady: boolean;
}

const FILTER_CATEGORIES: { value: SocialCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "aba_tip", label: "ABA Tips" },
  { value: "quote", label: "Quotes" },
  { value: "aba_observance", label: "ABA Observances" },
  { value: "autism_observance", label: "Autism" },
  { value: "national_holiday", label: "Holidays" },
  { value: "seasonal", label: "Seasonal" },
  { value: "announcement", label: "Announcements" },
];

export function SocialPostsClient({
  templates,
  upcoming,
  profileId,
  assetsReady: initialAssetsReady,
}: SocialPostsClientProps) {
  const [filter, setFilter] = useState<SocialCategory | "all">("all");
  const [assetsReady, setAssetsReady] = useState(initialAssetsReady);
  const [generating, startGeneration] = useTransition();

  // Trigger generation if not ready
  useEffect(() => {
    if (!assetsReady && !generating) {
      startGeneration(async () => {
        const result = await generateSocialAssets();
        if (result.success) {
          setAssetsReady(true);
        }
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredTemplates =
    filter === "all"
      ? templates
      : templates.filter((t) => t.category === filter);

  return (
    <Tabs defaultValue="upcoming">
      <DashboardTabsList>
        <Tabs.Trigger value="upcoming" className="gap-1.5">
          <Calendar className="h-3.5 w-3.5" />
          Upcoming
        </Tabs.Trigger>
        <Tabs.Trigger value="library" className="gap-1.5">
          <ImageIcon className="h-3.5 w-3.5" />
          Library
        </Tabs.Trigger>
      </DashboardTabsList>

      {generating && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating your branded posts... This may take a minute.
        </div>
      )}

      <TabsContent value="upcoming" className="mt-3">
        {upcoming.length === 0 ? (
          <DashboardCard className="p-5 sm:p-6">
            <p className="text-sm text-muted-foreground">
              No upcoming events in the next 3 weeks. Check the Library tab for all templates.
            </p>
          </DashboardCard>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((template) => (
              <SocialPostCard
                key={template.id}
                template={template}
                profileId={profileId}
                assetsReady={assetsReady}
                daysUntil={template.daysUntil}
              />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="library" className="mt-3 space-y-4">
        {/* Category filters */}
        <div className="flex flex-wrap gap-2">
          {FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === cat.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <SocialPostCard
              key={template.id}
              template={template}
              profileId={profileId}
              assetsReady={assetsReady}
            />
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}

// -----------------------------------------------------------------------
// Individual post card
// -----------------------------------------------------------------------

function SocialPostCard({
  template,
  profileId,
  assetsReady,
  daysUntil,
}: {
  template: SocialTemplate;
  profileId: string;
  assetsReady: boolean;
  daysUntil?: number;
}) {
  const [captionCopied, setCaptionCopied] = useState(false);
  const [imageCopied, setImageCopied] = useState(false);

  const imageUrl = getSocialImageUrl(profileId, template.id);

  async function copyCaption() {
    await navigator.clipboard.writeText(
      `${template.caption}\n\n${template.hashtags}`
    );
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2000);
  }

  async function copyImage() {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setImageCopied(true);
      setTimeout(() => setImageCopied(false), 2000);
    } catch {
      // Fallback: download
      downloadImage();
    }
  }

  function downloadImage() {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `${template.id}.png`;
    a.click();
  }

  const categoryColor = CATEGORY_COLORS[template.category];

  return (
    <DashboardCard className="overflow-hidden">
      {/* Image preview */}
      <div className="relative aspect-square bg-muted">
        {assetsReady ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={template.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">{template.title}</h3>
            {daysUntil !== undefined && (
              <p className="text-xs text-muted-foreground">
                {daysUntil <= 0
                  ? "Today!"
                  : daysUntil === 1
                    ? "Tomorrow"
                    : `In ${daysUntil} days`}
              </p>
            )}
          </div>
          <Badge variant="outline" className={`shrink-0 text-[10px] ${categoryColor}`}>
            {CATEGORY_LABELS[template.category]}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5 text-xs"
            onClick={copyImage}
            disabled={!assetsReady}
          >
            {imageCopied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {imageCopied ? "Copied!" : "Copy Image"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5 text-xs"
            onClick={copyCaption}
          >
            {captionCopied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {captionCopied ? "Copied!" : "Copy Caption"}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={downloadImage}
            disabled={!assetsReady}
            title="Download image"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </DashboardCard>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/dashboard/social/
git commit -m "feat: add social posts client component with tabs, filters, and copy actions"
```

---

## Task 10: Fix Imports and Wire Everything Together

**Step 1: Verify all imports resolve correctly**

- Check `ActionResult` type import in `social.ts` — may need to use inline type or find existing import path
- Check `createServiceClient` exists — search for it in `src/lib/supabase/`
- Fix the `DashboardTabsList` usage in the client component — verify it matches existing Tabs API from `@/components/ui/tabs`
- Fix the `Tabs.Trigger` syntax — should use `TabsTrigger` import from tabs component

**Step 2: Run type check**

```bash
npx tsc --noEmit
```

Fix any type errors.

**Step 3: Run lint**

```bash
npm run lint
```

Fix any lint errors.

**Step 4: Run build**

```bash
npm run build 2>&1 | tail -100
```

Fix any build errors.

**Step 5: Commit**

```bash
git add -A
git commit -m "fix: resolve imports and type errors for social posts feature"
```

---

## Task 11: Full Build Verification

**Step 1: Run the complete pre-push checklist**

```bash
npx tsc --noEmit
npm run lint
npm run build 2>&1 | tail -100
```

**Step 2: Manual verification (dev server)**

Start the dev server and verify:
1. `/dashboard/social` loads for Pro user
2. Free user sees upgrade prompt
3. Navigation shows "Social Posts" with Pro badge
4. Upcoming tab shows dated templates
5. Library tab shows all templates with category filters
6. Copy Caption works
7. Copy Image works (after generation completes)

**Step 3: Final commit if needed**

```bash
git add -A
git commit -m "chore: final fixes for social posts feature"
```

---

## Summary of Files Created/Modified

**New files:**
- `src/lib/social/types.ts` — Types and constants
- `src/lib/social/templates.ts` — 50 template catalog
- `src/lib/social/calendar.ts` — Upcoming date calculations
- `src/lib/social/layouts.tsx` — 6 Satori layout components
- `src/lib/social/render.tsx` — Render utility
- `src/lib/actions/social.ts` — Server actions (brand data, generation, status)
- `src/app/api/social/render/[templateId]/route.tsx` — Render API route
- `src/app/(dashboard)/dashboard/social/page.tsx` — Dashboard page
- `src/components/dashboard/social/social-posts-client.tsx` — Client component
- `supabase/migrations/XXX_create_social_posts_bucket.sql` — Storage bucket

**Modified files:**
- `src/lib/plans/features.ts` — Add `hasSocialPosts`
- `src/lib/plans/guards.ts` — Add `guardSocialPosts()`
- `src/components/dashboard/nav-config.ts` — Add nav item
- `src/lib/storage/config.ts` — Add bucket constant
