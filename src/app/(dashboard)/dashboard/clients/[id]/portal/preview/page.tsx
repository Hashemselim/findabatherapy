import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ClientPortalPreview } from "@/components/client-portal/client-portal-preview";
import { PublicClientPortal } from "@/components/client-portal/public-client-portal";
import { getCurrentUser } from "@/lib/platform/auth/server";
import { getClientById } from "@/lib/actions/clients";
import {
  getClientPortalData,
  type ClientPortalData,
  type PublicClientPortalData,
} from "@/lib/actions/client-portal";
import { getCurrentPlanTier } from "@/lib/plans/guards";
import { getDemoClientDetailById, isDemoClientId } from "@/lib/demo/client-previews";

interface ClientPortalPreviewPageProps {
  params: Promise<{ id: string }>;
}

function buildPreviewPortalData(data: ClientPortalData): PublicClientPortalData {
  const previewGuardian =
    data.guardians.find((guardian) => guardian.isPrimary) ??
    data.guardians[0] ?? {
      id: "preview-guardian",
      name: "Preview Guardian",
      firstName: "Preview",
      lastName: "Guardian",
      relationship: "guardian",
      email: null,
      phone: null,
      isPrimary: true,
      accessStatus: "active",
      notificationsEnabled: true,
      invitedAt: null,
      acceptedAt: null,
      revokedAt: null,
      lastViewedAt: null,
    };

  return {
    ...data,
    guardian: previewGuardian,
    portal: {
      ...data.portal,
      inviteAccepted: true,
    },
  };
}

export async function generateMetadata({ params }: ClientPortalPreviewPageProps) {
  const { id } = await params;
  const demoClient = getDemoClientDetailById(id);

  if (demoClient) {
    const name =
      [demoClient.child_first_name, demoClient.child_last_name].filter(Boolean).join(" ") ||
      "Client";

    return {
      title: `${name} Portal Preview | Clients`,
      description: `Preview the family-facing client portal for ${name}.`,
    };
  }

  const result = await getClientById(id);
  if (!result.success || !result.data) {
    return {
      title: "Portal Preview | Clients",
    };
  }

  const name =
    [result.data.child_first_name, result.data.child_last_name].filter(Boolean).join(" ") ||
    "Client";

  return {
    title: `${name} Portal Preview | Clients`,
    description: `Preview the family-facing client portal for ${name}.`,
  };
}

export default async function ClientPortalPreviewPage({
  params,
}: ClientPortalPreviewPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const { id } = await params;
  const planTier = await getCurrentPlanTier();
  const previewMode = planTier === "free";

  if (previewMode) {
    const demoClient = getDemoClientDetailById(id);

    if (!demoClient || !isDemoClientId(id)) {
      redirect("/dashboard/clients");
    }

    return <ClientPortalPreview client={demoClient} previewMode />;
  }

  const result = await getClientById(id);
  if (!result.success || !result.data) {
    notFound();
  }

  const portalResult = await getClientPortalData(id);
  if (!portalResult.success || !portalResult.data) {
    notFound();
  }

  return (
    <div>
      <div className="border-b bg-background px-4 py-3">
        <Button variant="ghost" size="sm" asChild className="gap-1.5">
          <Link href={`/dashboard/clients/${id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Client
          </Link>
        </Button>
      </div>
      <PublicClientPortal
        slug={portalResult.data.branding.slug ?? "preview"}
        data={buildPreviewPortalData(portalResult.data)}
        previewMode
      />
    </div>
  );
}
