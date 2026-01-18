import Link from "next/link";
import {
  ArrowRight,
  FileText,
  FolderOpen,
  Link2,
  Share2,
  Sparkles,
} from "lucide-react";

import { BubbleBackground } from "@/components/ui/bubble-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brandColors } from "@/config/brands";

export default function ClientResourcesPage() {
  const features = [
    {
      icon: FileText,
      title: "Document Uploads",
      description: "Upload and organize documents to share with families",
    },
    {
      icon: Link2,
      title: "Shareable Links",
      description: "Generate secure links for clients to access resources",
    },
    {
      icon: FolderOpen,
      title: "Resource Library",
      description: "Build a library of educational materials and forms",
    },
    {
      icon: Share2,
      title: "Easy Sharing",
      description: "Share resources directly from client profiles",
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Client Resources
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:mt-2">
          Documents and materials for families.
        </p>
      </div>

      <Card className="overflow-hidden border-blue-200/60">
        <BubbleBackground
          interactive={false}
          size="default"
          className="bg-gradient-to-br from-white via-blue-50/50 to-slate-50"
          colors={{
            first: "255,255,255",
            second: "213,233,255",
            third: "87,136,255",
            fourth: "238,245,255",
            fifth: "181,196,253",
            sixth: "245,250,255",
          }}
        >
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <div
              className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
              style={{
                backgroundColor: brandColors.therapy,
                boxShadow: `0 10px 25px -5px ${brandColors.therapy}40`,
              }}
            >
              <FolderOpen className="h-8 w-8 text-white" />
            </div>

            <h3 className="text-xl font-semibold text-slate-900">
              Client Resources Coming Soon
            </h3>

            <p className="mt-3 max-w-md text-sm text-slate-600">
              Share documents, intake forms, and educational materials with
              families. Build a resource library that clients can access
              anytime from their portal.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {features.map((feature) => (
                <span
                  key={feature.title}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
                >
                  <Sparkles
                    className="h-3.5 w-3.5"
                    style={{ color: brandColors.therapy }}
                  />
                  {feature.title}
                </span>
              ))}
            </div>

            <Button
              asChild
              size="lg"
              className="mt-8"
              style={{ backgroundColor: brandColors.therapy }}
            >
              <Link href="/dashboard/feedback" className="gap-2">
                Request Early Access
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </BubbleBackground>
      </Card>

      {/* Feature Preview Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title} className="border-border/60">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${brandColors.therapy}15` }}
                >
                  <Icon className="h-5 w-5" style={{ color: brandColors.therapy }} />
                </div>
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
