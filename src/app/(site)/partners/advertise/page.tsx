import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const placements = [
  {
    title: "Sponsored companies",
    description: "Homepage + search carousels with auto-generated creative.",
    reach: "35k monthly impressions",
  },
  {
    title: "Featured partners",
    description: "Dashboard placements targeting ABA owners with tailored offers.",
    reach: "1.2k agencies / month",
  },
  {
    title: "Newsletter + content",
    description: "Highlight product launches inside learn articles and newsletters.",
    reach: "8k subscribers",
  },
];

export default function AdvertisePage() {
  return (
    <div className="space-y-12 bg-white px-4 py-10 sm:px-6">
      <section className="mx-auto max-w-4xl space-y-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">For Partners</p>
        <h1 className="text-4xl font-semibold">Advertise to ABA agencies</h1>
        <p className="text-lg text-muted-foreground">
          Reach decision makers evaluating credentialing, billing, staffing, and software solutions. Zocdoc-style placements
          with ready-made creative.
        </p>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
        {placements.map((placement) => (
          <Card key={placement.title} className="border border-border/80">
            <CardHeader>
              <CardTitle>{placement.title}</CardTitle>
              <CardDescription>{placement.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{placement.reach}</CardContent>
          </Card>
        ))}
      </section>

      <section className="mx-auto max-w-4xl rounded-3xl border border-border p-6 shadow-sm">
        <h2 className="text-2xl font-semibold">Tell us about your campaign</h2>
        <p className="mt-2 text-muted-foreground">
          Submit your contact info and preferred placements. We’ll send availability within 1 business day.
        </p>
        <div className="mt-6 space-y-3">
          <Input placeholder="Name" />
          <Input placeholder="Company" />
          <Input type="email" placeholder="Work email" />
          <Input placeholder="What are you promoting?" />
          <Button className="rounded-full">Request media kit</Button>
        </div>
      </section>
    </div>
  );
}
