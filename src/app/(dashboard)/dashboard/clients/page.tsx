import Link from "next/link";
import {
  ArrowRight,
  Heart,
  Mail,
  MessageSquare,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";

import { BubbleBackground } from "@/components/ui/bubble-background";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { brandColors } from "@/config/brands";

export default function ClientsPage() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Clients
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground sm:mt-2">
          Manage your client relationships and service history.
        </p>
      </div>

      <Card className="overflow-hidden border-purple-200/60">
        <BubbleBackground
          interactive={false}
          size="default"
          className="bg-gradient-to-br from-white via-purple-50/50 to-slate-50"
          colors={{
            first: "255,255,255",
            second: "233,213,255",
            third: "139,92,246",
            fourth: "245,238,255",
            fifth: "196,181,253",
            sixth: "250,245,255",
          }}
        >
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <div
              className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg"
              style={{
                backgroundColor: brandColors.crm,
                boxShadow: `0 10px 25px -5px ${brandColors.crm}40`,
              }}
            >
              <Users className="h-8 w-8 text-white" />
            </div>

            <h3 className="text-xl font-semibold text-slate-900">
              Client Management Coming Soon
            </h3>

            <p className="mt-3 max-w-md text-sm text-slate-600">
              Track your clients from initial inquiry to active service.
              Convert families who reach out through Find ABA Therapy into
              managed client records.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {[
                "Client profiles",
                "Service history",
                "Communication log",
                "Intake tracking",
              ].map((feature) => (
                <span
                  key={feature}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm"
                >
                  <Sparkles
                    className="h-3.5 w-3.5"
                    style={{ color: brandColors.crm }}
                  />
                  {feature}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild variant="outline" className="gap-2 rounded-full">
                <Link href="/dashboard/inbox">
                  <MessageSquare className="h-4 w-4" />
                  View Inbox
                </Link>
              </Button>
              <Button
                asChild
                className="gap-2 rounded-full"
                style={{ backgroundColor: brandColors.therapy }}
              >
                <Link href="/dashboard/locations">
                  <Heart className="h-4 w-4" />
                  Manage Listing
                </Link>
              </Button>
            </div>
          </CardContent>
        </BubbleBackground>
      </Card>

      {/* Workflow Preview */}
      <Card className="border-border/60">
        <CardContent className="py-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            How It Will Work
          </h3>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: brandColors.therapy }}
              >
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Family Inquires</p>
                <p className="text-sm text-muted-foreground">
                  Via Find ABA Therapy
                </p>
              </div>
            </div>
            <ArrowRight className="hidden h-5 w-5 text-muted-foreground sm:block" />
            <div className="flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: brandColors.crm }}
              >
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Convert to Client</p>
                <p className="text-sm text-muted-foreground">
                  Track in Behavior Work CRM
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empty State Preview */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No clients yet</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            When client management launches, you&apos;ll be able to track
            families from inquiry to active service.
          </p>
          <Button
            asChild
            className="mt-6 rounded-full"
            style={{ backgroundColor: brandColors.crm }}
          >
            <Link href="/dashboard/feedback">
              Request Early Access
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
