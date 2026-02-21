import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Crown,
  Briefcase,
  Building2,
  MapPin,
  MessageSquare,
  Star,
  TrendingUp,
  Users,
  Zap,
  FileText,
  BarChart3,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SupportContactDialog } from "@/components/support-contact-dialog";
import { CrossBrandBenefits } from "@/components/marketing/cross-brand-benefits";
import { AlsoIncludedBadge } from "@/components/marketing/also-included-badge";
import { cn } from "@/lib/utils";
import { STRIPE_PLANS } from "@/lib/stripe/config";

const BASE_URL = "https://www.findabajobs.org";

export const metadata: Metadata = {
  title: "Post ABA Jobs - Hire BCBAs, RBTs & Behavior Analysts | Find ABA Jobs",
  description:
    "Post job openings and connect with qualified BCBAs, RBTs, and behavior analysts. Reach thousands of ABA professionals actively seeking opportunities.",
  alternates: {
    canonical: "/employers/post",
  },
  openGraph: {
    title: "Post ABA Jobs - Hire BCBAs, RBTs & Behavior Analysts",
    description:
      "Post job openings and connect with qualified BCBAs, RBTs, and behavior analysts. Start hiring today.",
    url: `${BASE_URL}/employers/post`,
    type: "website",
    images: [
      {
        url: `${BASE_URL}/api/og?brand=jobs&title=${encodeURIComponent("Post ABA Jobs")}&subtitle=${encodeURIComponent("Hire BCBAs, RBTs & Behavior Analysts")}`,
        width: 1200,
        height: 630,
        alt: "Post ABA Jobs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Post ABA Jobs - Hire BCBAs, RBTs & Behavior Analysts",
    description:
      "Post job openings and connect with qualified BCBAs, RBTs, and behavior analysts.",
    images: [
      `${BASE_URL}/api/og?brand=jobs&title=${encodeURIComponent("Post ABA Jobs")}&subtitle=${encodeURIComponent("Hire BCBAs, RBTs & Behavior Analysts")}`,
    ],
  },
};

const stats = [
  { value: "1,000+", label: "ABA professionals", icon: Users },
  { value: "100+", label: "Active job listings", icon: Briefcase },
  { value: "50", label: "States covered", icon: MapPin },
];

const features = [
  {
    icon: Users,
    title: "Reach qualified candidates",
    description: "Connect with BCBAs, RBTs, and behavior technicians actively searching for opportunities.",
    color: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
  },
  {
    icon: TrendingUp,
    title: "Boost your employer brand",
    description: "Showcase your company culture, benefits, and career growth opportunities.",
    color: "bg-teal-500/10",
    iconColor: "text-teal-600",
  },
  {
    icon: FileText,
    title: "Easy job management",
    description: "Create, edit, and manage all your job postings from one intuitive dashboard.",
    color: "bg-cyan-500/10",
    iconColor: "text-cyan-600",
  },
  {
    icon: MessageSquare,
    title: "Direct applications",
    description: "Receive applications directly with resumes, cover letters, and contact info.",
    color: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
  },
  {
    icon: BarChart3,
    title: "Hiring analytics",
    description: "Track views, applications, and conversion rates for each job posting.",
    color: "bg-teal-500/10",
    iconColor: "text-teal-600",
  },
];

const plans = [
  {
    name: "Free",
    tier: "free" as const,
    pricing: {
      monthly: { price: 0 },
      annual: { price: 0, totalPrice: 0, savings: 0, savingsPercent: 0 },
    },
    description: "Get started with basic job posting",
    subtext: "No credit card required.",
    features: [
      { text: "1 active job posting", highlightWord: "1", highlightType: "emerald" as const },
      "View & manage applications",
      "Email notifications",
    ],
    notIncluded: [
      "Multiple job postings",
      "Priority search placement",
      "Hiring analytics",
      "Company profile page",
    ],
    cta: "Post Free Job",
    ctaVariant: "outline" as const,
  },
  {
    name: "Pro",
    tier: "pro" as const,
    pricing: {
      monthly: { price: STRIPE_PLANS.pro.monthly.price },
      annual: {
        price: STRIPE_PLANS.pro.annual.price,
        totalPrice: STRIPE_PLANS.pro.annual.totalPrice!,
        savings: STRIPE_PLANS.pro.annual.savings!,
        savingsPercent: 40
      },
    },
    description: "Everything you need to hire",
    subtext: "Cancel anytime. No long-term contract.",
    popular: true,
    features: [
      { text: "Up to 5 active jobs", highlightWord: "5", highlightType: "emerald" as const },
      { text: "Priority search placement", highlightWord: "Priority", highlightType: "emerald" as const },
      { text: "Hiring analytics", highlightWord: "analytics", highlightType: "emerald" as const },
      { text: "Company profile page", highlightWord: "Company profile", highlightType: "emerald" as const },
      "View & manage applications",
      "Email notifications",
    ],
    notIncluded: [],
    cta: "Start Hiring",
    ctaVariant: "default" as const,
  },
  {
    name: "Enterprise",
    tier: "enterprise" as const,
    pricing: {
      monthly: { price: STRIPE_PLANS.enterprise.monthly.price },
      annual: {
        price: STRIPE_PLANS.enterprise.annual.price,
        totalPrice: STRIPE_PLANS.enterprise.annual.totalPrice!,
        savings: STRIPE_PLANS.enterprise.annual.savings!,
        savingsPercent: 40
      },
    },
    description: "For high-volume hiring",
    subtext: "Cancel anytime. No long-term contract.",
    features: [
      { text: "Unlimited active jobs", highlightWord: "Unlimited", highlightType: "emerald" as const },
      { text: "Homepage featured employer", highlightWord: "Homepage featured", highlightType: "emerald" as const },
      { text: "Priority search placement", highlightWord: "Priority", highlightType: "emerald" as const },
      { text: "Hiring analytics", highlightWord: "analytics", highlightType: "emerald" as const },
      { text: "Company profile page", highlightWord: "Company profile", highlightType: "emerald" as const },
      "View & manage applications",
      "Email notifications",
    ],
    notIncluded: [],
    cta: "Start Hiring",
    ctaVariant: "outline" as const,
    showEmailLink: true,
  },
];

const testimonials = [
  {
    quote: "We filled our BCBA position in just 2 weeks. The quality of candidates was excellent.",
    name: "Jennifer Walsh",
    role: "HR Director",
    company: "Bright Horizons ABA",
    initials: "JW",
  },
  {
    quote: "The applicant dashboard makes managing candidates so easy. We've hired 5 RBTs through the platform.",
    name: "Marcus Thompson",
    role: "Recruiting Manager",
    company: "Spectrum Care Services",
    initials: "MT",
  },
  {
    quote: "Finally, a job board that actually reaches ABA professionals. Our applications increased 3x.",
    name: "Dr. Amanda Chen",
    role: "Clinical Director",
    company: "Pathways Behavioral",
    initials: "AC",
  },
];

const faqs = [
  {
    question: "How quickly can I post my first job?",
    answer:
      "Within minutes! Sign up, complete your employer profile, and post your first job immediately. Jobs go live as soon as you publish them.",
  },
  {
    question: "Can I start on Free and upgrade later?",
    answer:
      "Absolutely! You can start with a free job posting and upgrade to Pro or Enterprise at any time. Your existing applications and data transfer seamlessly.",
  },
  {
    question: "How long do job postings stay active?",
    answer:
      "Free jobs are active for 30 days. Pro jobs stay active for 60 days, and Enterprise jobs for 90 days. You can renew or extend listings at any time.",
  },
  {
    question: "How do I receive applications?",
    answer:
      "Applications come directly to your dashboard and email. With Pro and Enterprise, you get a full applicant management dashboard with resume downloads and candidate tracking.",
  },
  {
    question: "What types of positions can I post?",
    answer:
      "You can post any ABA-related position including BCBAs, BCaBAs, RBTs, Behavior Technicians, Clinical Directors, and administrative roles. We support full-time, part-time, contract, and remote positions.",
  },
];

export default function PostJobPage() {
  return (
    <div className="space-y-0 pb-16">
      {/* Hero Section */}
      <section className="px-0 pt-0">
        <BubbleBackground
          interactive
          transition={{ stiffness: 100, damping: 50, mass: 0.5 }}
          className="w-full bg-gradient-to-br from-white via-emerald-50/50 to-teal-50/50 py-16 sm:py-24"
          colors={{
            first: "255,255,255",
            second: "167,243,208",
            third: "94,234,212",
            fourth: "204,251,241",
            fifth: "153,246,228",
            sixth: "240,253,250",
          }}
        >
          <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 sm:px-6">
            <div className="space-y-6 text-center">
              <Badge className="mx-auto rounded-full border border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 px-4 py-1.5 text-sm font-semibold text-emerald-700 shadow-sm transition-all duration-300 ease-premium hover:shadow-md">
                For Employers
              </Badge>
              <h1 className="text-[32px] font-semibold leading-tight text-foreground sm:text-[48px] sm:leading-tight">
                Hire BCBAs, RBTs & Behavior Analysts{" "}
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">faster</span>
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
                Post job openings and connect with thousands of qualified ABA professionals actively
                searching for their next opportunity.
              </p>
              <div className="flex flex-col items-center gap-3">
                <div className="flex flex-wrap justify-center gap-4">
                  <Button
                    asChild
                    size="lg"
                    className="rounded-full bg-emerald-600 px-8 text-base font-semibold text-white shadow-[0_4px_14px_rgba(16,185,129,0.4)] transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:bg-emerald-700 hover:shadow-[0_8px_20px_rgba(16,185,129,0.5)] active:translate-y-0 active:shadow-[0_2px_8px_rgba(16,185,129,0.3)]"
                  >
                    <Link href="/auth/sign-up?plan=free&intent=jobs">
                      Post a job free
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="rounded-full px-8 text-base transition-all duration-300 ease-premium hover:-translate-y-[1px] hover:border-emerald-500/50 hover:shadow-[0_4px_12px_rgba(16,185,129,0.15)]"
                  >
                    <Link href="#pricing">View pricing</Link>
                  </Button>
                </div>
                <span className="text-sm text-muted-foreground">
                  Free plan available. No credit card required.
                </span>
              </div>
            </div>

            {/* Stats */}
            <div className="mx-auto mt-4 grid w-full max-w-2xl grid-cols-3 gap-4">
              {stats.map((stat, index) => (
                <div
                  key={stat.label}
                  className="group rounded-2xl border border-border/60 bg-white/80 px-4 py-4 text-center backdrop-blur-sm transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:border-emerald-500/30 hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)]"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 transition-all duration-300 group-hover:scale-[1.05]">
                    <stat.icon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-bold text-foreground sm:text-3xl">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </BubbleBackground>
      </section>

      {/* Social Proof Bar */}
      <section className="border-y border-border/60 bg-gradient-to-r from-white via-emerald-50/30 to-white py-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-4 px-4 text-sm text-muted-foreground sm:px-6">
          <span className="flex items-center gap-2 transition-all duration-300 hover:text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
              <Users className="h-4 w-4 text-emerald-600" aria-hidden />
            </div>
            ABA-focused job board
          </span>
          <span className="flex items-center gap-2 transition-all duration-300 hover:text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
              <Briefcase className="h-4 w-4 text-emerald-600" aria-hidden />
            </div>
            BCBAs, RBTs & Behavior Analysts
          </span>
          <span className="flex items-center gap-2 transition-all duration-300 hover:text-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
              <MapPin className="h-4 w-4 text-emerald-600" aria-hidden />
            </div>
            Nationwide coverage
          </span>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="scroll-mt-8 bg-gradient-to-b from-emerald-50/50 to-white py-16 sm:py-24">
        <div className="mx-auto max-w-[1080px] px-4 sm:px-6">
          <header className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">Pricing</p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Start free and upgrade when you&apos;re ready. No hidden fees, cancel anytime.
            </p>
          </header>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {plans.map((plan, index) => (
              <Card
                key={plan.name}
                className={cn(
                  "group relative flex flex-col border-2 bg-white shadow-sm transition-all duration-300 ease-premium hover:-translate-y-[2px]",
                  plan.popular
                    ? "border-emerald-500 shadow-[0_8px_30px_rgba(16,185,129,0.15)] hover:shadow-[0_12px_40px_rgba(16,185,129,0.2)]"
                    : "border-border/60 hover:border-emerald-500/30 hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)]"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="rounded-full border border-emerald-500 bg-emerald-500 px-4 py-1 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(16,185,129,0.3)]">
                      <Star className="mr-1.5 h-3.5 w-3.5 fill-white text-white" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    {plan.name === "Enterprise" && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/10">
                        <Crown className="h-4 w-4 text-teal-600" />
                      </div>
                    )}
                    {plan.name === "Pro" && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                        <Star className="h-4 w-4 fill-emerald-600 text-emerald-600" />
                      </div>
                    )}
                    {plan.name === "Free" && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                        <Briefcase className="h-4 w-4 text-emerald-600" />
                      </div>
                    )}
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                  </div>
                  {plan.tier === "free" ? (
                    <div className="mt-4 space-y-3">
                      <div>
                        <div className="flex items-baseline">
                          <span className="text-4xl font-bold text-foreground">$0</span>
                          <span className="ml-1 text-muted-foreground">/mo</span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">Free forever</p>
                      </div>
                      <p className="text-sm text-muted-foreground">Upgrade anytime.</p>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <div>
                        <div className="flex items-baseline">
                          <span className="text-4xl font-bold text-foreground">
                            ${plan.pricing.annual.price}
                          </span>
                          <span className="ml-1 text-muted-foreground">/mo</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <span>Billed annually</span>
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                            Save {plan.pricing.annual.savingsPercent}%
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        or ${plan.pricing.monthly.price}/mo billed monthly
                      </p>
                    </div>
                  )}
                  <div className="mt-4 border-t border-border/40 pt-4">
                    <p className="font-medium text-foreground">{plan.description}</p>
                    {"subtext" in plan && plan.subtext && (
                      <p className="mt-1 text-xs text-muted-foreground">{plan.subtext}</p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => {
                      const isObject = typeof feature === "object";
                      const text = isObject ? feature.text : feature;
                      const highlightWord = isObject && "highlightWord" in feature ? feature.highlightWord : null;

                      const renderFeatureText = () => {
                        if (!highlightWord) return <span>{text}</span>;

                        const parts = text.split(highlightWord);
                        return (
                          <span>
                            {parts[0]}
                            <span className="font-semibold text-emerald-600">{highlightWord}</span>
                            {parts.slice(1).join(highlightWord)}
                          </span>
                        );
                      };

                      return (
                        <li key={text} className="flex items-start gap-3 text-sm">
                          <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                            <Check className="h-3 w-3 text-emerald-600" aria-hidden />
                          </div>
                          {renderFeatureText()}
                        </li>
                      );
                    })}
                    {plan.notIncluded.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 text-sm text-muted-foreground/60"
                      >
                        <span className="mt-0.5 h-4 w-4 shrink-0 text-center">—</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Bottom section - pushed to bottom for alignment */}
                  <div className="mt-auto pt-4">
                    <div className="space-y-3">
                    {"showEmailLink" in plan && plan.showEmailLink && (
                      <p className="text-center text-xs text-muted-foreground">
                        Questions?{" "}
                        <SupportContactDialog>
                          <button
                            type="button"
                            className="text-emerald-600 transition-colors duration-300 hover:text-emerald-700 hover:underline"
                          >
                            Email us
                          </button>
                        </SupportContactDialog>
                      </p>
                    )}
                    {plan.tier === "free" ? (
                      <Button
                        asChild
                        variant="outline"
                        className="w-full rounded-full text-base font-semibold transition-all duration-300 ease-premium hover:-translate-y-[1px] hover:border-emerald-500/50 hover:shadow-[0_4px_12px_rgba(16,185,129,0.15)]"
                      >
                        <Link href="/auth/sign-up?plan=free&intent=jobs">{plan.cta}</Link>
                      </Button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Button
                          asChild
                          className={cn(
                            "w-full rounded-full text-base font-semibold transition-all duration-300 ease-premium hover:-translate-y-[1px]",
                            plan.popular
                              ? "bg-emerald-600 text-white shadow-[0_4px_14px_rgba(16,185,129,0.4)] hover:bg-emerald-700 hover:shadow-[0_8px_20px_rgba(16,185,129,0.5)]"
                              : "bg-emerald-600 text-white shadow-[0_4px_14px_rgba(16,185,129,0.3)] hover:bg-emerald-700 hover:shadow-[0_8px_20px_rgba(16,185,129,0.4)]"
                          )}
                        >
                          <Link href={`/auth/sign-up?plan=${plan.tier}&interval=annual&intent=jobs`}>
                            {plan.cta} (Annual)
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          className="w-full rounded-full text-base font-semibold transition-all duration-300 ease-premium hover:-translate-y-[1px] hover:border-emerald-500/50 hover:shadow-[0_4px_12px_rgba(16,185,129,0.15)]"
                        >
                          <Link href={`/auth/sign-up?plan=${plan.tier}&interval=monthly&intent=jobs`}>
                            Start Monthly
                          </Link>
                        </Button>
                      </div>
                    )}
                    </div>

                    {/* Also Included: Therapy - at the very bottom for alignment */}
                    <AlsoIncludedBadge otherBrand="therapy" planTier={plan.tier} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Testimonial Strip */}
          <div className="mt-10 rounded-xl border border-border/60 bg-white p-5 transition-all duration-300 ease-premium hover:border-emerald-500/30 hover:shadow-[0_8px_30px_rgba(16,185,129,0.08)]">
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <div className="flex -space-x-2">
                {testimonials.slice(0, 3).map((t) => (
                  <Avatar key={t.name} className="h-10 w-10 border-2 border-white bg-emerald-100 text-emerald-700 transition-transform duration-300 hover:z-10 hover:scale-110">
                    <AvatarFallback className="text-xs font-semibold">{t.initials}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <div className="text-center sm:text-left">
                <p className="text-sm text-foreground">
                  &quot;{testimonials[0].quote.substring(0, 60)}...&quot;
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {testimonials[0].name}, {testimonials[0].role} at {testimonials[0].company}
                </p>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            All plans include SSL security, EEOC-compliant job postings, and 24/7 uptime monitoring.
          </p>
        </div>
      </section>

      {/* Cross-Brand Benefits */}
      <CrossBrandBenefits currentBrand="jobs" />

      {/* Features Section */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <header className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <Zap className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              Why post with us
            </p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">
              Everything you need to hire ABA talent
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              More than just a job board. Get the tools and reach you need to find qualified
              BCBAs, RBTs, and behavior analysts.
            </p>
          </header>
          <div className="mt-12 flex flex-wrap justify-center gap-6">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                className="group w-full border border-border/60 bg-white shadow-sm transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:border-emerald-500/30 hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <div className={cn(
                    "mb-2 flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-[1.05]",
                    feature.color
                  )}>
                    <feature.icon className={cn("h-6 w-6", feature.iconColor)} aria-hidden />
                  </div>
                  <CardTitle className="text-lg transition-colors duration-300 group-hover:text-emerald-600">{feature.title}</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-gradient-to-b from-white to-emerald-50/30 py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <header className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <MessageSquare className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              Testimonials
            </p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">
              Trusted by ABA employers nationwide
            </h2>
          </header>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Card
                key={testimonial.name}
                className="group border border-border/60 bg-white shadow-sm transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:border-emerald-500/30 hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)]"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="flex flex-col gap-4 p-6">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-emerald-500 text-emerald-500 transition-transform duration-300 group-hover:scale-110"
                        style={{ transitionDelay: `${i * 50}ms` }}
                        aria-hidden
                      />
                    ))}
                  </div>
                  <p className="flex-1 text-sm text-muted-foreground">&quot;{testimonial.quote}&quot;</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 bg-emerald-100 text-emerald-700 transition-transform duration-300 group-hover:scale-105">
                      <AvatarFallback className="font-semibold">{testimonial.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {testimonial.role}, {testimonial.company}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <header className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
              <Briefcase className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">
              How it works
            </p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">
              Start hiring in 3 simple steps
            </h2>
          </header>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                icon: Building2,
                title: "Create your account",
                description: "Sign up and set up your employer profile with company info and branding.",
                color: "bg-emerald-500/10",
                iconColor: "text-emerald-600",
              },
              {
                step: "2",
                icon: FileText,
                title: "Post your jobs",
                description: "Create detailed job listings with requirements, salary, and benefits.",
                color: "bg-teal-500/10",
                iconColor: "text-teal-600",
              },
              {
                step: "3",
                icon: Users,
                title: "Review & hire",
                description: "Receive applications, review candidates, and make your next great hire.",
                color: "bg-cyan-500/10",
                iconColor: "text-cyan-600",
              },
            ].map((item) => (
              <div key={item.step} className="group text-center">
                <div className="relative mx-auto mb-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-md transition-all duration-300 ease-premium group-hover:-translate-y-[2px] group-hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)]">
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 group-hover:scale-[1.1]",
                      item.color
                    )}>
                      <item.icon className={cn("h-6 w-6", item.iconColor)} />
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-sm font-bold text-white shadow-md">
                    {item.step}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground transition-colors duration-300 group-hover:text-emerald-600">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-gradient-to-b from-emerald-50/30 to-white py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <header className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/10">
              <MessageSquare className="h-6 w-6 text-teal-600" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600">FAQ</p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Common questions</h2>
          </header>
          <div className="mt-12 space-y-4">
            {faqs.map((faq, index) => (
              <Card
                key={faq.question}
                className="group border border-border/60 bg-white transition-all duration-300 ease-premium hover:border-emerald-500/30 hover:shadow-[0_4px_20px_rgba(16,185,129,0.08)]"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold transition-colors duration-300 group-hover:text-emerald-600">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-emerald-50 to-teal-50/50 p-8 text-center shadow-lg transition-all duration-500 ease-premium hover:shadow-[0_20px_50px_rgba(16,185,129,0.15)] sm:p-12">
            {/* Decorative background elements */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.08),transparent_40%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.08),transparent_40%)]" />

            <div className="relative">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 shadow-[0_4px_14px_rgba(16,185,129,0.2)]">
                <Briefcase className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-3xl font-semibold sm:text-4xl">
                Ready to find your next great hire?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
                Connect with qualified BCBAs, RBTs, and behavior analysts actively searching for opportunities.
                Post your first job free and start hiring today.
              </p>
              <div className="mt-8">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-emerald-600 px-8 text-base font-semibold text-white shadow-[0_4px_14px_rgba(16,185,129,0.4)] transition-all duration-300 ease-premium hover:-translate-y-[2px] hover:bg-emerald-700 hover:shadow-[0_8px_20px_rgba(16,185,129,0.5)] active:translate-y-0"
                >
                  <Link href="/auth/sign-up?plan=free&intent=jobs">
                    Post a job free
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                Free plan available. No credit card required to start.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
