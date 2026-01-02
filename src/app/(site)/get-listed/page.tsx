import Link from "next/link";
import {
  ArrowRight,
  Check,
  Crown,
  Globe,
  ImagePlus,
  MapPin,
  MessageSquare,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BubbleBackground } from "@/components/ui/bubble-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const stats = [
  { value: "50K+", label: "Monthly searches" },
  { value: "500+", label: "Listed providers" },
  { value: "89%", label: "Find a match" },
];

const features = [
  {
    icon: Search,
    title: "Get discovered",
    description: "Appear in search results when families look for ABA providers in your area.",
  },
  {
    icon: TrendingUp,
    title: "Boost your SEO",
    description: "High-authority backlinks improve your Google rankings and online visibility.",
  },
  {
    icon: Globe,
    title: "AI-ready listings",
    description: "Show up in ChatGPT, Google AI, and other AI search tools families use.",
  },
  {
    icon: MessageSquare,
    title: "Direct contact form",
    description: "Receive inquiry requests directly from families ready to start services.",
  },
  {
    icon: ImagePlus,
    title: "Rich media profiles",
    description: "Showcase your practice with photo galleries and YouTube video embeds.",
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
    description: "Get started with a basic listing",
    subtext: "No credit card required.",
    features: [
      { text: "Standard search placement", highlightWord: "Standard", highlightType: "blue" as const },
      { text: "1 location", highlightWord: "1", highlightType: "blue" as const },
      { text: "Basic profile", highlightWord: "Basic", highlightType: "blue" as const },
      "Insurance list display",
      "SEO-boosting backlink",
    ],
    notIncluded: [
      "Services & specialties filters",
      "Direct contact form & inbox",
      "Photo gallery",
      "Video embed",
      "Verified badge",
    ],
    cta: "Get Found Free",
    ctaVariant: "outline" as const,
  },
  {
    name: "Pro",
    tier: "pro" as const,
    pricing: {
      monthly: { price: 49 },
      annual: { price: 29, totalPrice: 348, savings: 240, savingsPercent: 40 },
    },
    description: "Everything you need to stand out",
    subtext: "Cancel anytime. No long-term contract.",
    popular: true,
    features: [
      { text: "Priority search placement", highlightWord: "Priority", highlightType: "yellow" as const },
      { text: "Up to 5 locations", highlightWord: "5", highlightType: "yellow" as const },
      { text: "Services & specialties filters", highlightWord: "Services & specialties", highlightType: "yellow" as const },
      { text: "Direct contact form & inbox", highlightWord: "Direct contact form", highlightType: "yellow" as const },
      { text: "Photo gallery (up to 10)", highlightWord: "Photo gallery", highlightType: "yellow" as const },
      { text: "Video embed", highlightWord: "Video", highlightType: "yellow" as const },
      { text: "Google star rating", highlightWord: "Google", highlightType: "google" as const },
      "Verified badge",
      "Insurance list display",
      "SEO-boosting backlink",
    ],
    notIncluded: [],
    cta: "Get Started",
    ctaVariant: "default" as const,
  },
  {
    name: "Enterprise",
    tier: "enterprise" as const,
    pricing: {
      monthly: { price: 149 },
      annual: { price: 89, totalPrice: 1068, savings: 720, savingsPercent: 40 },
    },
    description: "For multi-location agencies",
    subtext: "Cancel anytime. No long-term contract.",
    features: [
      { text: "Priority search placement", highlightWord: "Priority", highlightType: "yellow" as const },
      { text: "Unlimited locations", highlightWord: "Unlimited", highlightType: "yellow" as const },
      { text: "Services & specialties filters", highlightWord: "Services & specialties", highlightType: "yellow" as const },
      { text: "Direct contact form & inbox", highlightWord: "Direct contact form", highlightType: "yellow" as const },
      { text: "Photo gallery (up to 10)", highlightWord: "Photo gallery", highlightType: "yellow" as const },
      { text: "Video embed", highlightWord: "Video", highlightType: "yellow" as const },
      { text: "Google star rating", highlightWord: "Google", highlightType: "google" as const },
      "Verified badge",
      "Insurance list display",
      "SEO-boosting backlink",
      { text: "Featured homepage placement", highlightWord: "Featured homepage", highlightType: "yellow" as const },
    ],
    notIncluded: [],
    cta: "Get Started",
    ctaVariant: "outline" as const,
    showEmailLink: true,
  },
];

const testimonials = [
  {
    quote: "We've seen a 40% increase in family inquiries since upgrading to Pro. The ROI is incredible.",
    name: "Sarah Mitchell",
    role: "Clinical Director",
    company: "Bright Path ABA",
    initials: "SM",
  },
  {
    quote: "Finally, a directory that actually sends us qualified leads. Worth every penny.",
    name: "Michael Chen",
    role: "Owner",
    company: "Spectrum Steps",
    initials: "MC",
  },
  {
    quote: "The direct contact form is a game-changer. Families reach out ready to start services.",
    name: "Jessica Rodriguez",
    role: "Operations Manager",
    company: "Harbor ABA Group",
    initials: "JR",
  },
];

const faqs = [
  {
    question: "Can I start on Free and upgrade later?",
    answer:
      "Absolutely! You can start with a free listing and upgrade to Pro or Enterprise at any time. Your listing data transfers seamlessly when you upgrade.",
  },
  {
    question: "Is there a contract?",
    answer:
      "No contracts, no commitments. Choose monthly or annual billing - both can be canceled anytime. Annual plans save up to 40% and your premium features remain active until the end of your billing period.",
  },
  {
    question: "How quickly does my listing go live?",
    answer:
      "Your listing goes live within minutes of completing your profile. Pro and Enterprise listings appear higher in search results immediately.",
  },
  {
    question: "How do families contact me?",
    answer:
      "With Pro or Enterprise, families can submit inquiries directly through your profile's contact form. You'll receive email notifications for each inquiry so you can respond quickly.",
  },
  {
    question: "What's included in the free plan?",
    answer:
      "The free plan includes a basic profile with your contact info (phone, email, website), insurance list, service modes, and 1 location. Upgrade to Pro for priority placement, direct contact forms, photo galleries, and more.",
  },
];

export default function GetListedPage() {
  return (
    <div className="space-y-0 pb-16">
      {/* Hero Section */}
      <section className="px-0 pt-0">
        <BubbleBackground
          interactive
          transition={{ stiffness: 100, damping: 50, mass: 0.5 }}
          className="w-full bg-gradient-to-br from-white via-yellow-50/50 to-blue-50/50 py-16 sm:py-24"
          colors={{
            first: "255,255,255",
            second: "255,236,170",
            third: "135,176,255",
            fourth: "255,248,210",
            fifth: "190,210,255",
            sixth: "240,248,255",
          }}
        >
          <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 sm:px-6">
            <div className="space-y-6 text-center">
              <Badge className="mx-auto rounded-full border border-[#5788FF]/40 bg-gradient-to-r from-[#5788FF]/15 to-[#5788FF]/5 px-4 py-1.5 text-sm font-semibold text-[#5788FF] shadow-sm">
                For ABA Providers
              </Badge>
              <h1 className="text-[32px] font-semibold leading-tight text-foreground sm:text-[48px] sm:leading-tight">
                Get found by families{" "}
                <span className="text-[#5788FF]">searching for ABA care</span>
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
                Join 500+ ABA providers reaching thousands of families every month. List your
                practice, boost your SEO, and grow your caseload.
              </p>
              <div className="flex flex-col items-center gap-3">
                <div className="flex flex-wrap justify-center gap-4">
                  <Button
                    asChild
                    size="lg"
                    className="rounded-full border border-[#FEE720] bg-[#FEE720] px-8 text-base font-semibold text-[#333333] hover:bg-[#FFF5C2]"
                  >
                    <Link href="/auth/sign-up?plan=free">
                      Get listed free
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="rounded-full px-8 text-base">
                    <Link href="#pricing">View pricing</Link>
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Free plan available. No credit card required.</span>
                  <span className="text-border">|</span>
                  <Link href="/demo" className="font-medium text-[#5788FF] hover:underline">
                    Try the demo
                  </Link>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="mx-auto mt-4 grid w-full max-w-2xl grid-cols-3 gap-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-border/60 bg-white/80 px-4 py-4 text-center backdrop-blur-sm"
                >
                  <p className="text-2xl font-bold text-foreground sm:text-3xl">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </BubbleBackground>
      </section>

      {/* Social Proof Bar */}
      <section className="border-y border-border/60 bg-white py-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-4 px-4 text-sm text-muted-foreground sm:px-6">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" aria-hidden />
            Trusted by 500+ providers
          </span>
          <span className="flex items-center gap-2">
            <Star className="h-4 w-4 text-primary" aria-hidden />
            4.9/5 provider satisfaction
          </span>
          <span className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" aria-hidden />
            Set up in under 5 minutes
          </span>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="scroll-mt-8 bg-[#FDFAEE] py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <header className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#5788FF]">Pricing</p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Start free and upgrade when you&apos;re ready. No hidden fees, cancel anytime.
            </p>
          </header>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={cn(
                  "relative flex flex-col border-2 bg-white shadow-sm transition hover:shadow-lg",
                  plan.popular ? "border-primary shadow-md" : "border-border/60"
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="rounded-full border border-[#FEE720] bg-[#FEE720] px-4 py-1 text-sm font-semibold text-[#333333]">
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    {plan.name === "Enterprise" && <Crown className="h-5 w-5 text-primary" />}
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                  </div>
                  {plan.tier === "free" ? (
                    <div className="mt-4">
                      <div className="flex items-baseline">
                        <span className="text-4xl font-bold text-foreground">$0</span>
                        <span className="ml-1 text-muted-foreground">/mo</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">Free forever</p>
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
                          <Badge className="border-green-200 bg-green-50 text-green-700">
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
                  <ul className="flex-1 space-y-3">
                    {plan.features.map((feature) => {
                      const isObject = typeof feature === "object";
                      const text = isObject ? feature.text : feature;
                      const highlightWord = isObject && "highlightWord" in feature ? feature.highlightWord : null;
                      const highlightType = isObject && "highlightType" in feature ? feature.highlightType : null;

                      // Render feature with highlighted word
                      const renderFeatureText = () => {
                        if (!highlightWord) return <span>{text}</span>;

                        const parts = text.split(highlightWord);

                        // Special rendering for Google star rating
                        if (highlightType === "google") {
                          return (
                            <span className="flex items-center gap-1.5">
                              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                              </svg>
                              <span className="font-semibold">⭐ star rating</span>
                            </span>
                          );
                        }

                        const highlightClass =
                          highlightType === "blue"
                            ? "font-semibold text-[#5788FF]"
                            : "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 bg-clip-text font-semibold text-transparent";

                        return (
                          <span>
                            {parts[0]}
                            <span className={highlightClass}>{highlightWord}</span>
                            {parts.slice(1).join(highlightWord)}
                          </span>
                        );
                      };

                      return (
                        <li key={text} className="flex items-start gap-3 text-sm">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#5788FF]" aria-hidden />
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
                  <div className="mt-8 space-y-3">
                    {"showEmailLink" in plan && plan.showEmailLink && (
                      <p className="text-center text-xs text-muted-foreground">
                        Questions?{" "}
                        <a
                          href="mailto:hello@findabatherapy.com"
                          className="text-primary hover:underline"
                        >
                          Email us
                        </a>
                      </p>
                    )}
                    {plan.tier === "free" ? (
                      <Button
                        asChild
                        variant="outline"
                        className="w-full rounded-full text-base font-semibold"
                      >
                        <Link href="/auth/sign-up?plan=free">{plan.cta}</Link>
                      </Button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <Button
                          asChild
                          className={cn(
                            "w-full rounded-full text-base font-semibold",
                            plan.popular
                              ? "border border-[#FEE720] bg-[#FEE720] text-[#333333] hover:bg-[#FFF5C2]"
                              : "bg-primary text-primary-foreground hover:bg-primary/90"
                          )}
                        >
                          <Link href={`/auth/sign-up?plan=${plan.tier}&interval=annual`}>
                            {plan.cta} (Annual)
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          className="w-full rounded-full text-base font-semibold"
                        >
                          <Link href={`/auth/sign-up?plan=${plan.tier}&interval=monthly`}>
                            Start Monthly
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Testimonial Strip */}
          <div className="mt-10 rounded-xl border border-border/60 bg-white p-5">
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <div className="flex -space-x-2">
                {testimonials.slice(0, 3).map((t) => (
                  <Avatar key={t.name} className="h-10 w-10 border-2 border-white bg-[#FFF5C2] text-[#333333]">
                    <AvatarFallback className="text-xs">{t.initials}</AvatarFallback>
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
            All plans include SSL security, HIPAA-compliant messaging, and 24/7 uptime monitoring.
          </p>

          {/* Try the Demo Section */}
          <div className="mt-12 rounded-2xl border-2 border-[#5788FF]/20 bg-gradient-to-br from-[#5788FF]/5 via-white to-[#5788FF]/5 p-6 sm:p-8">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
              <div className="text-center sm:text-left">
                <div className="flex items-center justify-center gap-2 sm:justify-start">
                  <Sparkles className="h-5 w-5 text-[#5788FF]" />
                  <h3 className="text-xl font-semibold text-foreground">
                    See the dashboard in action
                  </h3>
                </div>
                <p className="mt-2 max-w-md text-muted-foreground">
                  Explore an interactive demo of the Pro dashboard with sample data.
                  See how easy it is to manage your listing, track analytics, and respond to inquiries.
                </p>
              </div>
              <Button
                asChild
                size="lg"
                className="shrink-0 rounded-full bg-[#5788FF] px-8 text-base font-semibold text-white hover:bg-[#4a77e8]"
              >
                <Link href="/demo">
                  Try the Demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Optional Add-ons */}
          <div className="mt-16">
            <header className="text-center">
              <p className="text-sm font-semibold uppercase tracking-wide text-[#5788FF]">
                Boost Your Visibility
              </p>
              <h3 className="mt-2 text-xl font-semibold sm:text-2xl">
                Optional add-ons for Pro & Enterprise
              </h3>
            </header>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-4 rounded-xl border border-border/60 bg-white p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF5C2]">
                  <Sparkles className="h-5 w-5 text-[#333333]" aria-hidden />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Featured Listing</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Stand out with a highlighted badge and premium placement in search results.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 rounded-xl border border-border/60 bg-white p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF5C2]">
                  <TrendingUp className="h-5 w-5 text-[#333333]" aria-hidden />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Homepage Advertising</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Get featured on our homepage and reach families browsing for providers.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Contact us for add-on pricing and availability.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <header className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#5788FF]">
              Why list with us
            </p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">
              Everything you need to grow your practice
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              More than just a directory. Get the tools and visibility you need to connect with
              families actively searching for ABA services.
            </p>
          </header>
          <div className="mt-12 flex flex-wrap justify-center gap-6">
            {features.map((feature) => (
              <Card
                key={feature.title}
                className="w-full border border-border/60 bg-white shadow-sm transition hover:shadow-md sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF5C2]">
                    <feature.icon className="h-6 w-6 text-[#333333]" aria-hidden />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
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
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <header className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#5788FF]">
              Testimonials
            </p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">
              Loved by ABA providers nationwide
            </h2>
          </header>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Card
                key={testimonial.name}
                className="border border-border/60 bg-white shadow-sm"
              >
                <CardContent className="flex flex-col gap-4 p-6">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-[#FEE720] text-[#FEE720]"
                        aria-hidden
                      />
                    ))}
                  </div>
                  <p className="flex-1 text-sm text-muted-foreground">&quot;{testimonial.quote}&quot;</p>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 bg-[#FFF5C2] text-[#333333]">
                      <AvatarFallback>{testimonial.initials}</AvatarFallback>
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
      <section className="bg-[#FDFAEE] py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <header className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#5788FF]">
              How it works
            </p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">
              Get listed in 3 simple steps
            </h2>
          </header>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                icon: Users,
                title: "Create your account",
                description: "Sign up with your email and set up your provider profile.",
              },
              {
                step: "2",
                icon: ImagePlus,
                title: "Build your profile",
                description:
                  "Add your services, insurance, locations, and photos to showcase your practice.",
              },
              {
                step: "3",
                icon: MapPin,
                title: "Start getting found",
                description:
                  "Your listing goes live and families can discover and contact you directly.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-md">
                  <span className="text-2xl font-bold text-primary">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <header className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#5788FF]">FAQ</p>
            <h2 className="mt-2 text-3xl font-semibold sm:text-4xl">Common questions</h2>
          </header>
          <div className="mt-12 space-y-6">
            {faqs.map((faq) => (
              <Card key={faq.question} className="border border-border/60 bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">{faq.question}</CardTitle>
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
      <section className="bg-[#FDFAEE] py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="rounded-3xl border border-border bg-white p-8 text-center shadow-lg sm:p-12">
            <h2 className="text-3xl font-semibold sm:text-4xl">
              Ready to grow your ABA practice?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              Join hundreds of providers already connecting with families. Start with a free listing
              and upgrade anytime.
            </p>
            <div className="mt-8">
              <Button
                asChild
                size="lg"
                className="rounded-full border border-[#FEE720] bg-[#FEE720] px-8 text-base font-semibold text-[#333333] hover:bg-[#FFF5C2]"
              >
                <Link href="/auth/sign-up?plan=free">
                  Get started free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Free plan available. No credit card required to start.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
