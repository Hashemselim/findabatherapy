import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const benefits = [
  "Get more client inquiries with premium placements",
  "Improve SEO with high-authority backlinks",
  "Show up in Google and ChatGPT results",
];

const pricing = [
  { name: "Basic Listing", price: "$20 / month", features: ["Logo + contact info", "Insurance badges", "Appears below premium listings"], checkout: "#" },
  { name: "Premium Listing", price: "$50 / month", features: ["Photo gallery + video", "Priority placement", "Featured callouts in search"], checkout: "#" },
];

const contactSections = [
  {
    title: "Featured listing upgrade",
    copy: "Pin your agency to the top of state searches and rotate through homepage banners.",
  },
  {
    title: "Sponsored companies",
    copy: "Large multi-state agencies can secure banner slots and newsletter mentions.",
  },
  {
    title: "ABA business partners",
    copy: "Software and service companies can advertise directly to ABA agencies.",
  },
];

export default function GetListedPage() {
  return (
    <div className="space-y-12 bg-white px-4 py-10 sm:px-6">
      <section className="mx-auto max-w-4xl space-y-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">For Providers</p>
        <h1 className="text-4xl font-semibold">List your ABA practice on Find ABA Therapy</h1>
        <p className="text-lg text-muted-foreground">
          Reach families searching for care, boost your SEO, and control your profile just like Zocdoc practices do.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild className="rounded-full px-8 text-base">
            <Link href="/auth/sign-up">Get started</Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-full px-8 text-base">
            <Link href="/partners/advertise">View sponsorships</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
        {benefits.map((benefit) => (
          <Card key={benefit} className="border border-border/70">
            <CardContent className="flex h-32 items-center justify-center text-center text-sm font-semibold text-foreground">
              {benefit}
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mx-auto max-w-5xl space-y-6">
        <header className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Pricing</p>
          <h2 className="text-3xl font-semibold">Choose your plan</h2>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          {pricing.map((tier) => (
            <Card key={tier.name} className="border border-border/80">
              <CardHeader>
                <CardTitle>{tier.name}</CardTitle>
                <CardDescription>{tier.price}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <ul className="space-y-2">
                  {tier.features.map((feature) => (
                    <li key={feature}>• {feature}</li>
                  ))}
                </ul>
                <Button asChild className="w-full rounded-full">
                  <a href={tier.checkout}>Purchase via Stripe</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl space-y-6">
        <header>
          <h2 className="text-3xl font-semibold">Upgrades & partnerships</h2>
          <p className="text-muted-foreground">
            Tell us what kind of exposure you are looking for and our team will reach out within 1 business day.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          {contactSections.map((section) => (
            <Card key={section.title} className="border border-border/80">
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.copy}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
        <Card className="border border-border/80">
          <CardHeader>
            <CardTitle>Contact us</CardTitle>
            <CardDescription>Share your email and we’ll send placement options.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Your name" />
            <Input placeholder="Business email" type="email" />
            <Input placeholder="Tell us about your goals" />
            <Button className="rounded-full">Submit</Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
