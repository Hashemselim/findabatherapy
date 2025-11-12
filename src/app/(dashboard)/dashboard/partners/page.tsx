import { featuredPartnerCategories } from "@/content/partners";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPartnersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-white">Featured partners</h1>
        <p className="mt-2 text-sm text-slate-300">
          Curated vendors for credentialing, billing, staffing, and operations. Offers rotate inside the dashboard
          based on your plan.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {featuredPartnerCategories.map((category) => (
          <Card key={category.title} className="border-white/10 bg-white/5">
            <CardHeader>
              <CardTitle className="text-white">{category.title}</CardTitle>
              <CardDescription className="text-slate-300">{category.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-300">
              {category.partners.map((partner) => (
                <div key={partner} className="rounded-xl bg-white/[0.04] p-3">
                  <p className="font-medium text-white">{partner}</p>
                  <p className="text-xs text-slate-300">
                    Sponsored partner — click to learn more about exclusive dashboard offers.
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
