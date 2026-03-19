import { type SocialTemplate } from "./types";

export const SOCIAL_TEMPLATES: SocialTemplate[] = [
  // === ABA Observances (8) ===
  {
    id: "bcba-appreciation-day",
    title: "BCBA Appreciation Day",
    caption:
      "Today we celebrate our incredible BCBAs who make a difference every single day. Thank you for your dedication, expertise, and heart. Happy BCBA Appreciation Day!",
    hashtags:
      "#BCBAAppreciationDay #BCBA #ABA #BehaviorAnalysis #ThankYouBCBAs",
    category: "aba_observance",
    layoutId: "card",
    layoutProps: {
      headline: "Happy BCBA\nAppreciation Day",
      subline: "Heroes of ABA",
      icon: "award",
    },
    eventDate: "03-15",
    eventDateLabel: "March 15",
  },
  {
    id: "rbt-appreciation-day",
    title: "RBT Appreciation Day",
    caption:
      "Shout out to the RBTs who show up every day with patience, compassion, and skill. You are the backbone of ABA therapy. Happy RBT Appreciation Day!",
    hashtags:
      "#RBTAppreciationDay #RBT #ABA #BehaviorAnalysis #ThankYouRBTs",
    category: "aba_observance",
    layoutId: "card",
    layoutProps: {
      headline: "Happy RBT\nAppreciation Day",
      subline: "Heart of Every Session",
      icon: "heart",
    },
    eventDate: "10-02",
    eventDateLabel: "October 2",
  },
  {
    id: "aba-day",
    title: "Applied Behavior Analysis Day",
    caption:
      "March 20th marks ABA Day \u2014 a day to recognize the science and the practitioners who use it to help individuals reach their full potential.",
    hashtags: "#ABADay #AppliedBehaviorAnalysis #ABA #BehaviorScience",
    category: "aba_observance",
    layoutId: "card",
    layoutProps: {
      headline: "ABA Day",
      subline: "Science That Changes Lives",
      icon: "chart",
    },
    eventDate: "03-20",
    eventDateLabel: "March 20",
  },
  {
    id: "behavior-analysis-week",
    title: "Behavior Analysis Week",
    caption:
      "It\u2019s Behavior Analysis Week! This week we celebrate the science that helps us understand behavior and create meaningful change. Thank you to every behavior analyst, technician, and support professional making an impact.",
    hashtags: "#BehaviorAnalysisWeek #ABA #BACB #BehaviorScience",
    category: "aba_observance",
    layoutId: "card",
    layoutProps: {
      headline: "Behavior Analysis\nWeek",
      subline: "Where Science Meets Heart",
      icon: "brain",
    },
    eventDate: "03-08",
    eventDateLabel: "March (2nd week)",
  },
  {
    id: "speech-language-hearing-day",
    title: "Better Hearing and Speech Month",
    caption:
      "May is Better Hearing and Speech Month. Many of our clients benefit from collaborative care between ABA and speech-language pathology. Here\u2019s to the power of multidisciplinary teamwork!",
    hashtags:
      "#BHSM #SpeechTherapy #ABA #Collaboration #MultidisciplinaryCare",
    category: "aba_observance",
    layoutId: "card",
    layoutProps: {
      headline: "Better Hearing &\nSpeech Month",
      subline: "Better Together",
      icon: "mic",
    },
    eventDate: "05-01",
    eventDateLabel: "May",
  },
  {
    id: "ot-month",
    title: "Occupational Therapy Month",
    caption:
      "April is Occupational Therapy Month! OTs play a vital role alongside ABA professionals in supporting daily living skills and independence. Teamwork at its best.",
    hashtags:
      "#OTMonth #OccupationalTherapy #ABA #Teamwork #Collaboration",
    category: "aba_observance",
    layoutId: "card",
    layoutProps: {
      headline: "Occupational\nTherapy Month",
      subline: "Building Independence Daily",
      icon: "hand",
    },
    eventDate: "04-01",
    eventDateLabel: "April",
  },
  {
    id: "special-education-day",
    title: "Special Education Day",
    caption:
      "December 2nd is Special Education Day, commemorating the signing of IDEA. Every child deserves access to the education and support they need to thrive.",
    hashtags:
      "#SpecialEducationDay #IDEA #SpecialEducation #ABA #Advocacy",
    category: "aba_observance",
    layoutId: "card",
    layoutProps: {
      headline: "Special\nEducation Day",
      subline: "Every Child Deserves More",
      icon: "graduation",
    },
    eventDate: "12-02",
    eventDateLabel: "December 2",
  },
  {
    id: "developmental-disabilities-awareness",
    title: "Developmental Disabilities Awareness Month",
    caption:
      "March is Developmental Disabilities Awareness Month. We\u2019re proud to support individuals with developmental disabilities and their families on their journey.",
    hashtags:
      "#DDAM #DevelopmentalDisabilities #Inclusion #ABA #Awareness",
    category: "aba_observance",
    layoutId: "card",
    layoutProps: {
      headline: "Developmental\nDisabilities\nAwareness Month",
      subline: "See the Ability",
      icon: "users",
    },
    eventDate: "03-01",
    eventDateLabel: "March",
  },

  // === Autism Observances (6) ===
  {
    id: "autism-acceptance-month",
    title: "Autism Acceptance Month",
    caption:
      "April is Autism Acceptance Month. We celebrate the unique strengths and perspectives of autistic individuals. Acceptance means understanding, support, and inclusion every day.",
    hashtags:
      "#AutismAcceptanceMonth #AutismAcceptance #Neurodiversity #ABA #Inclusion",
    category: "autism_observance",
    layoutId: "card",
    layoutProps: {
      headline: "Autism\nAcceptance\nMonth",
      subline: "Accept. Include. Celebrate",
      icon: "infinity",
    },
    eventDate: "04-01",
    eventDateLabel: "April",
  },
  {
    id: "world-autism-day",
    title: "World Autism Awareness Day",
    caption:
      "April 2nd is World Autism Awareness Day. Today and every day, we champion understanding, acceptance, and meaningful support for autistic individuals and their families.",
    hashtags:
      "#WorldAutismDay #WAAD #AutismAwareness #AutismAcceptance #ABA",
    category: "autism_observance",
    layoutId: "card",
    layoutProps: {
      headline: "World Autism\nAwareness Day",
      subline: "Understanding Starts Today",
      icon: "globe",
    },
    eventDate: "04-02",
    eventDateLabel: "April 2",
  },
  {
    id: "autistic-pride-day",
    title: "Autistic Pride Day",
    caption:
      "June 18th is Autistic Pride Day \u2014 a day to celebrate neurodiversity and the contributions of autistic people to our communities and world.",
    hashtags:
      "#AutisticPrideDay #Neurodiversity #AutismPride #Acceptance",
    category: "autism_observance",
    layoutId: "card",
    layoutProps: {
      headline: "Autistic\nPride Day",
      subline: "Proudly Neurodivergent",
      icon: "sparkles",
    },
    eventDate: "06-18",
    eventDateLabel: "June 18",
  },
  {
    id: "disability-employment-awareness",
    title: "Disability Employment Awareness Month",
    caption:
      "October is National Disability Employment Awareness Month. Inclusive workplaces are stronger workplaces. We support meaningful employment opportunities for all.",
    hashtags:
      "#NDEAM #DisabilityEmployment #Inclusion #WorkplaceEquity #ABA",
    category: "autism_observance",
    layoutId: "card",
    layoutProps: {
      headline: "Disability\nEmployment\nAwareness Month",
      subline: "Inclusion Is Strength",
      icon: "briefcase",
    },
    eventDate: "10-01",
    eventDateLabel: "October",
  },
  {
    id: "communication-disabilities-awareness",
    title: "AAC Awareness Month",
    caption:
      "October is AAC Awareness Month. Augmentative and Alternative Communication tools empower individuals to express themselves. Communication is a right, not a privilege.",
    hashtags:
      "#AACawareness #AAC #Communication #AssistiveTechnology #ABA",
    category: "autism_observance",
    layoutId: "card",
    layoutProps: {
      headline: "AAC Awareness\nMonth",
      subline: "Every Voice Matters",
      icon: "message",
    },
    eventDate: "10-01",
    eventDateLabel: "October",
  },
  {
    id: "kindness-day-neurodiversity",
    title: "World Kindness Day",
    caption:
      "World Kindness Day reminds us that small acts of understanding go a long way. Kindness towards neurodivergent individuals means patience, acceptance, and genuine inclusion.",
    hashtags:
      "#WorldKindnessDay #Kindness #Neurodiversity #Inclusion #ABA",
    category: "autism_observance",
    layoutId: "card",
    layoutProps: {
      headline: "World\nKindness Day",
      subline: "Be the Kindness",
      icon: "heart",
    },
    eventDate: "11-13",
    eventDateLabel: "November 13",
  },

  // === National Holidays (10) ===
  {
    id: "new-years-day",
    title: "Happy New Year",
    caption:
      "Happy New Year from our team! Wishing you a year filled with growth, progress, and new milestones. Here\u2019s to making a positive impact together in the year ahead.",
    hashtags: "#HappyNewYear #NewYear #ABA #NewBeginnings",
    category: "national_holiday",
    layoutId: "card",
    layoutProps: {
      headline: "Happy\nNew Year",
      subline: "New Beginnings Ahead",
      icon: "sparkles",
    },
    eventDate: "01-01",
    eventDateLabel: "January 1",
  },
  {
    id: "mlk-day",
    title: "Martin Luther King Jr. Day",
    caption:
      "Today we honor Dr. Martin Luther King Jr. and his vision of equality, justice, and compassion for all. Let\u2019s continue working toward a world where every individual is valued.",
    hashtags:
      "#MLKDay #MartinLutherKingJr #Equality #Justice #Community",
    category: "national_holiday",
    layoutId: "card",
    layoutProps: {
      headline: "Martin Luther\nKing Jr. Day",
      subline: "Dream. Lead. Change",
      icon: "scale",
    },
    eventDate: "01-20",
    eventDateLabel: "January (3rd Monday)",
  },
  {
    id: "valentines-day",
    title: "Valentine\u2019s Day",
    caption:
      "Happy Valentine\u2019s Day! Today we celebrate love in all its forms \u2014 the love between families, the love of learning, and the love we put into our work every day.",
    hashtags: "#ValentinesDay #Love #ABA #Community #Family",
    category: "national_holiday",
    layoutId: "card",
    layoutProps: {
      headline: "Happy\nValentine\u2019s Day",
      subline: "Love in Every Form",
      icon: "heart",
    },
    eventDate: "02-14",
    eventDateLabel: "February 14",
  },
  {
    id: "memorial-day",
    title: "Memorial Day",
    caption:
      "This Memorial Day, we honor and remember those who made the ultimate sacrifice for our freedom. We are grateful for their service.",
    hashtags: "#MemorialDay #NeverForget #ThankYou #Honor",
    category: "national_holiday",
    layoutId: "card",
    layoutProps: {
      headline: "Memorial Day",
      subline: "Honor. Remember. Serve",
      icon: "flag",
    },
    eventDate: "05-26",
    eventDateLabel: "May (last Monday)",
  },
  {
    id: "independence-day",
    title: "Happy 4th of July",
    caption:
      "Happy Independence Day! Wishing you a safe and joyful celebration with family and friends.",
    hashtags: "#4thOfJuly #IndependenceDay #HappyFourth #USA",
    category: "national_holiday",
    layoutId: "card",
    layoutProps: {
      headline: "Happy 4th\nof July",
      subline: "Land of the Free",
      icon: "star",
    },
    eventDate: "07-04",
    eventDateLabel: "July 4",
  },
  {
    id: "labor-day",
    title: "Happy Labor Day",
    caption:
      "Happy Labor Day! Thank you to our dedicated team and to ABA professionals everywhere who work tirelessly to make a difference. You deserve this rest.",
    hashtags:
      "#LaborDay #ThankYou #ABA #HardWork #TeamAppreciation",
    category: "national_holiday",
    layoutId: "card",
    layoutProps: {
      headline: "Happy\nLabor Day",
      subline: "You Deserve This Rest",
      icon: "wrench",
    },
    eventDate: "09-01",
    eventDateLabel: "September (1st Monday)",
  },
  {
    id: "thanksgiving",
    title: "Happy Thanksgiving",
    caption:
      "Happy Thanksgiving! We\u2019re grateful for the families we serve, the team members who give their best every day, and the community that supports us.",
    hashtags: "#Thanksgiving #Grateful #ABA #Community #Family",
    category: "national_holiday",
    layoutId: "card",
    layoutProps: {
      headline: "Happy\nThanksgiving",
      subline: "Grateful for You",
      icon: "home",
    },
    eventDate: "11-27",
    eventDateLabel: "November (4th Thursday)",
  },
  {
    id: "christmas",
    title: "Merry Christmas",
    caption:
      "Merry Christmas from our family to yours! Wishing you a season filled with warmth, joy, and cherished moments with loved ones.",
    hashtags: "#MerryChristmas #HappyHolidays #ABA #Family #Joy",
    category: "national_holiday",
    layoutId: "card",
    layoutProps: {
      headline: "Merry\nChristmas",
      subline: "Joy to the World",
      icon: "gift",
    },
    eventDate: "12-25",
    eventDateLabel: "December 25",
  },
  {
    id: "mothers-day",
    title: "Happy Mother\u2019s Day",
    caption:
      "Happy Mother\u2019s Day to all the incredible moms \u2014 especially the ABA moms who advocate, support, and love unconditionally. You are seen and appreciated.",
    hashtags: "#MothersDay #ABAMom #ThankYouMom #Family #Love",
    category: "national_holiday",
    layoutId: "card",
    layoutProps: {
      headline: "Happy\nMother\u2019s Day",
      subline: "For the Moms Who Give Everything",
      icon: "flower",
    },
    eventDate: "05-11",
    eventDateLabel: "May (2nd Sunday)",
  },
  {
    id: "fathers-day",
    title: "Happy Father\u2019s Day",
    caption:
      "Happy Father\u2019s Day to all the dads who show up, support, and champion their children every single day. Your dedication matters.",
    hashtags: "#FathersDay #ABADad #ThankYouDad #Family",
    category: "national_holiday",
    layoutId: "card",
    layoutProps: {
      headline: "Happy\nFather\u2019s Day",
      subline: "Dads Make a Difference",
      icon: "shield",
    },
    eventDate: "06-15",
    eventDateLabel: "June (3rd Sunday)",
  },

  // === Seasonal (6) ===
  {
    id: "back-to-school",
    title: "Back to School",
    caption:
      "Back-to-school season is here! Transitions can be challenging, especially for our ABA families. Here are some tips: keep routines consistent, practice the school schedule at home, and communicate with your child\u2019s team.",
    hashtags:
      "#BackToSchool #ABA #SchoolTransition #AutismSupport #ParentTips",
    category: "seasonal",
    layoutId: "card",
    layoutProps: {
      headline: "Back to School\nSeason",
      subline: "Ready. Set. Learn",
      icon: "book",
    },
    eventDate: "08-15",
    eventDateLabel: "Mid-August",
  },
  {
    id: "summer-break",
    title: "Summer Break Tips",
    caption:
      "Summer break can mean schedule changes for ABA families. Keep structure with visual schedules, plan sensory-friendly outings, and stay connected with your therapy team for summer goals.",
    hashtags:
      "#SummerBreak #ABA #SummerTips #VisualSchedules #FamilyFun",
    category: "seasonal",
    layoutId: "card",
    layoutProps: {
      headline: "Summer Break\nTips",
      subline: "Fun in the Sun",
      icon: "sun",
    },
    eventDate: "06-01",
    eventDateLabel: "June",
  },
  {
    id: "spring-renewal",
    title: "Spring Into Progress",
    caption:
      "Spring is a time for fresh starts and renewed energy. It\u2019s a great time to review goals, celebrate progress, and set new milestones with your ABA team.",
    hashtags: "#Spring #ABA #Progress #FreshStart #GoalSetting",
    category: "seasonal",
    layoutId: "card",
    layoutProps: {
      headline: "Spring Into\nProgress",
      subline: "Bloom Where You Grow",
      icon: "sprout",
    },
    eventDate: "03-20",
    eventDateLabel: "March 20",
  },
  {
    id: "fall-routine",
    title: "Fall Routine Reset",
    caption:
      "Fall is the perfect time to reset routines. Consistent schedules, clear expectations, and structured environments help everyone thrive \u2014 at home and in therapy.",
    hashtags: "#Fall #ABA #RoutineReset #Structure #Consistency",
    category: "seasonal",
    layoutId: "card",
    layoutProps: {
      headline: "Fall Routine\nReset",
      subline: "Reset. Refocus. Thrive",
      icon: "calendar",
    },
    eventDate: "09-22",
    eventDateLabel: "September 22",
  },
  {
    id: "holiday-season-tips",
    title: "Holiday Season Tips",
    caption:
      "The holiday season can be overstimulating. Prepare your child with social stories, plan quiet spaces at gatherings, and keep favorite comfort items handy. Small preparations make a big difference.",
    hashtags:
      "#HolidaySeason #ABA #SensoryTips #AutismSupport #FamilyTips",
    category: "seasonal",
    layoutId: "card",
    layoutProps: {
      headline: "Holiday Season\nTips",
      subline: "Navigate the Holidays",
      icon: "snowflake",
    },
    eventDate: "12-01",
    eventDateLabel: "December",
  },
  {
    id: "new-year-goals",
    title: "New Year, New Goals",
    caption:
      "New year, new goals! Whether it\u2019s communication milestones, social skills, or daily living tasks, we\u2019re here to support your family\u2019s journey every step of the way.",
    hashtags: "#NewYear #ABA #Goals #Progress #ABACommunity",
    category: "seasonal",
    layoutId: "card",
    layoutProps: {
      headline: "New Year\nNew Goals",
      subline: "Aim Higher This Year",
      icon: "target",
    },
    eventDate: "01-05",
    eventDateLabel: "Early January",
  },

  // === ABA Tips (10) ===
  {
    id: "tip-positive-reinforcement",
    title: "The Power of Positive Reinforcement",
    caption:
      "Positive reinforcement is one of the most powerful tools in ABA therapy. When we reward desired behaviors, they\u2019re more likely to happen again. Catch your child doing something great today and celebrate it!",
    hashtags:
      "#ABA #PositiveReinforcement #ABATip #BehaviorAnalysis #ParentTips",
    category: "aba_tip",
    layoutId: "card",
    layoutProps: {
      headline: "The Power of Positive\nReinforcement",
      subline: "Catch the Good",
      icon: "thumbsup",
    },
    eventDate: null,
  },
  {
    id: "tip-visual-schedules",
    title: "Visual Schedules Work",
    caption:
      "Visual schedules reduce anxiety and increase independence by showing what comes next. Use pictures, icons, or written words depending on your child\u2019s level. Consistency is key!",
    hashtags:
      "#VisualSchedules #ABA #ABATip #Independence #AutismSupport",
    category: "aba_tip",
    layoutId: "card",
    layoutProps: {
      headline: "Visual Schedules\nWork",
      subline: "See It. Do It",
      icon: "clipboard",
    },
    eventDate: null,
  },
  {
    id: "tip-consistency",
    title: "Consistency Is Everything",
    caption:
      "In ABA therapy, consistency across environments is crucial. When home, school, and therapy teams use the same strategies, children make faster progress. Team communication matters!",
    hashtags:
      "#ABA #Consistency #ABATip #Teamwork #BehaviorAnalysis",
    category: "aba_tip",
    layoutId: "card",
    layoutProps: {
      headline: "Consistency Is\nEverything",
      subline: "Stay the Course",
      icon: "refresh",
    },
    eventDate: null,
  },
  {
    id: "tip-pairing",
    title: "What Is Pairing?",
    caption:
      "Pairing is when a therapist builds rapport with a child by associating themselves with fun, preferred activities. Before any teaching happens, trust and connection come first. That\u2019s good ABA.",
    hashtags: "#Pairing #ABA #ABATip #BuildingRapport #Trust",
    category: "aba_tip",
    layoutId: "card",
    layoutProps: {
      headline: "What Is\nPairing?",
      subline: "Connection Before Correction",
      icon: "handshake",
    },
    eventDate: null,
  },
  {
    id: "tip-generalization",
    title: "Skills That Transfer",
    caption:
      "A skill learned in therapy should work everywhere \u2014 at home, school, the grocery store. That\u2019s called generalization, and it\u2019s a core goal of ABA. Practice skills in different settings!",
    hashtags:
      "#Generalization #ABA #ABATip #SkillBuilding #RealWorldSkills",
    category: "aba_tip",
    layoutId: "card",
    layoutProps: {
      headline: "Skills That\nTransfer",
      subline: "Skills for Every Setting",
      icon: "share",
    },
    eventDate: null,
  },
  {
    id: "tip-data-driven",
    title: "Data Drives Decisions",
    caption:
      "In ABA, we don\u2019t guess \u2014 we measure. Data collection helps us know what\u2019s working, what\u2019s not, and when to adjust. Every data point tells part of the story.",
    hashtags:
      "#DataDriven #ABA #ABATip #EvidenceBased #BehaviorAnalysis",
    category: "aba_tip",
    layoutId: "card",
    layoutProps: {
      headline: "Data Drives\nDecisions",
      subline: "Measure What Matters",
      icon: "chart",
    },
    eventDate: null,
  },
  {
    id: "tip-natural-environment",
    title: "Learning in Natural Environments",
    caption:
      "Some of the best learning happens in everyday moments \u2014 during play, mealtime, or a walk outside. Natural Environment Teaching (NET) makes learning feel like life.",
    hashtags:
      "#NET #NaturalEnvironmentTeaching #ABA #ABATip #PlayBasedLearning",
    category: "aba_tip",
    layoutId: "card",
    layoutProps: {
      headline: "Learning in\nNatural Environments",
      subline: "Learning Is Everywhere",
      icon: "leaf",
    },
    eventDate: null,
  },
  {
    id: "tip-self-care-families",
    title: "Self-Care for ABA Families",
    caption:
      "Caring for a child in ABA therapy is rewarding \u2014 and tiring. Remember to take care of yourself too. You can\u2019t pour from an empty cup. Your well-being matters.",
    hashtags:
      "#SelfCare #ABAFamilies #ABATip #ParentWellbeing #YouMatter",
    category: "aba_tip",
    layoutId: "card",
    layoutProps: {
      headline: "Self-Care for\nABA Families",
      subline: "Take Care of You",
      icon: "heartpulse",
    },
    eventDate: null,
  },
  {
    id: "tip-communication-first",
    title: "Communication Comes First",
    caption:
      "Every behavior is communication. Before we focus on changing behavior, we ask: what is this person trying to tell us? Understanding the function of behavior is the foundation of ABA.",
    hashtags:
      "#Communication #ABA #ABATip #FunctionOfBehavior #Understanding",
    category: "aba_tip",
    layoutId: "card",
    layoutProps: {
      headline: "Communication\nComes First",
      subline: "Listen With Your Eyes",
      icon: "message",
    },
    eventDate: null,
  },
  {
    id: "tip-celebrate-small-wins",
    title: "Celebrate Small Wins",
    caption:
      "Progress isn\u2019t always big leaps \u2014 it\u2019s often small, consistent steps. Celebrate every new word, every successful transition, every moment of eye contact. Every win matters.",
    hashtags:
      "#CelebrateProgress #ABA #ABATip #SmallWins #Progress",
    category: "aba_tip",
    layoutId: "card",
    layoutProps: {
      headline: "Celebrate\nSmall Wins",
      subline: "Every Win Counts",
      icon: "trophy",
    },
    eventDate: null,
  },

  // === Quotes (6) ===
  {
    id: "quote-different-not-less",
    title: "Different, Not Less",
    caption:
      '"Different, not less." Every individual brings unique strengths and perspectives. Our role is to support, not change who they are.',
    hashtags:
      "#DifferentNotLess #Neurodiversity #ABA #AutismAcceptance #Inclusion",
    category: "quote",
    layoutId: "card",
    layoutProps: {
      headline: "Different,\nNot Less",
      subline: "Uniquely Brilliant",
      icon: "puzzle",
    },
    eventDate: null,
  },
  {
    id: "quote-progress-not-perfection",
    title: "Progress, Not Perfection",
    caption:
      "We don\u2019t chase perfection \u2014 we chase progress. Every small step forward is a victory worth celebrating.",
    hashtags:
      "#ProgressNotPerfection #ABA #Growth #Motivation #ABACommunity",
    category: "quote",
    layoutId: "card",
    layoutProps: {
      headline: "Progress,\nNot Perfection",
      subline: "Keep Moving Forward",
      icon: "trending",
    },
    eventDate: null,
  },
  {
    id: "quote-it-takes-a-village",
    title: "It Takes a Village",
    caption:
      "Supporting a child\u2019s growth takes a team \u2014 therapists, teachers, families, and community. Together, we can accomplish more than any of us could alone.",
    hashtags:
      "#ItTakesAVillage #ABA #Teamwork #Community #Support",
    category: "quote",
    layoutId: "card",
    layoutProps: {
      headline: "It Takes\na Village",
      subline: "Stronger Together",
      icon: "users",
    },
    eventDate: null,
  },
  {
    id: "quote-believe-in-potential",
    title: "Believe in Their Potential",
    caption:
      "When we believe in someone\u2019s potential, we create space for growth. Every person has the capacity to learn, grow, and surprise us.",
    hashtags:
      "#BelieveInPotential #ABA #Growth #Motivation #Possibility",
    category: "quote",
    layoutId: "card",
    layoutProps: {
      headline: "Believe in\nTheir Potential",
      subline: "Unlimited Potential",
      icon: "rocket",
    },
    eventDate: null,
  },
  {
    id: "quote-compassion-in-action",
    title: "Compassion in Action",
    caption:
      "ABA therapy at its best is compassion in action \u2014 meeting people where they are and walking alongside them toward their goals.",
    hashtags:
      "#CompassionInAction #ABA #BehaviorAnalysis #Empathy #Support",
    category: "quote",
    layoutId: "card",
    layoutProps: {
      headline: "Compassion\nin Action",
      subline: "Lead With Compassion",
      icon: "handshake",
    },
    eventDate: null,
  },
  {
    id: "quote-every-child-can-learn",
    title: "Every Child Can Learn",
    caption:
      "Every child can learn. The question isn\u2019t if \u2014 it\u2019s how. That\u2019s what ABA helps us discover.",
    hashtags:
      "#EveryChildCanLearn #ABA #BehaviorAnalysis #Education #Potential",
    category: "quote",
    layoutId: "card",
    layoutProps: {
      headline: "Every Child\nCan Learn",
      subline: "The Question Is How",
      icon: "lightbulb",
    },
    eventDate: null,
  },

  // === Announcements (4) ===
  {
    id: "announcement-hiring",
    title: "We\u2019re Hiring!",
    caption:
      "We\u2019re growing! Join our team and make a difference in the lives of children and families. Check our careers page for open positions.",
    hashtags: "#NowHiring #ABAJobs #JoinOurTeam #ABA #Careers",
    category: "announcement",
    layoutId: "card",
    layoutProps: {
      headline: "We\u2019re Hiring!",
      subline: "Join Our Mission",
      icon: "userplus",
    },
    eventDate: null,
  },
  {
    id: "announcement-accepting-clients",
    title: "Now Accepting New Clients",
    caption:
      "We\u2019re currently accepting new clients! If your family is looking for quality ABA therapy services, reach out to us today. We\u2019d love to support your child\u2019s journey.",
    hashtags:
      "#AcceptingClients #ABA #ABATherapy #NewClients #FamilySupport",
    category: "announcement",
    layoutId: "card",
    layoutProps: {
      headline: "Now Accepting\nNew Clients",
      subline: "Start Your Journey",
      icon: "door",
    },
    eventDate: null,
  },
  {
    id: "announcement-new-location",
    title: "New Location Opening",
    caption:
      "Exciting news! We\u2019re opening a new location to better serve our community. Stay tuned for more details on how we\u2019re bringing ABA services closer to you.",
    hashtags:
      "#NewLocation #ABA #GrowingTeam #Community #ABATherapy",
    category: "announcement",
    layoutId: "card",
    layoutProps: {
      headline: "New Location\nOpening Soon",
      subline: "Now Even Closer",
      icon: "mappin",
    },
    eventDate: null,
  },
  {
    id: "announcement-thank-you-families",
    title: "Thank You to Our Families",
    caption:
      "To every family who trusts us with their child\u2019s care \u2014 thank you. Your partnership and dedication inspire us every day. We\u2019re honored to be part of your journey.",
    hashtags:
      "#ThankYou #ABAFamilies #Gratitude #ABA #Partnership",
    category: "announcement",
    layoutId: "card",
    layoutProps: {
      headline: "Thank You\nto Our Families",
      subline: "You Inspire Us",
      icon: "heart",
    },
    eventDate: null,
  },
];

/** Get templates by category */
export function getTemplatesByCategory(
  category: import("./types").SocialCategory
): SocialTemplate[] {
  return SOCIAL_TEMPLATES.filter((t) => t.category === category);
}

/** Get a single template by ID */
export function getTemplateById(id: string): SocialTemplate | undefined {
  return SOCIAL_TEMPLATES.find((t) => t.id === id);
}
