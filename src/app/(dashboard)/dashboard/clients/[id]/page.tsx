import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PreviewBanner } from "@/components/ui/preview-banner";
import { ClientDetailPanel } from "@/components/dashboard/clients";
import { getCurrentUser } from "@/lib/platform/auth/server";
import { getClientById } from "@/lib/actions/clients";
import { getAgreementPacketOptions } from "@/lib/actions/agreements";
import { getClientPortalData } from "@/lib/actions/client-portal";
import { getClientNotes } from "@/lib/actions/client-notes";
import { getCurrentPlanTier } from "@/lib/plans/guards";
import { getDemoClientDetailById, isDemoClientId } from "@/lib/demo/client-previews";

import { ClientFullDetail } from "./client-full-detail";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ClientDetailPageProps) {
  const resolvedParams = await params;
  const demoClient = getDemoClientDetailById(resolvedParams.id);

  if (demoClient) {
    const name = [demoClient.child_first_name, demoClient.child_last_name]
      .filter(Boolean)
      .join(" ") || "Client";

    return {
      title: `${name} | Clients`,
      description: `Preview client details for ${name}`,
    };
  }

  const result = await getClientById(resolvedParams.id);

  if (!result.success || !result.data) {
    return {
      title: "Client Not Found | Dashboard",
    };
  }

  const name = [result.data.child_first_name, result.data.child_last_name]
    .filter(Boolean)
    .join(" ") || "Client";

  return {
    title: `${name} | Clients`,
    description: `View and manage client details for ${name}`,
  };
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const resolvedParams = await params;
  const planTier = await getCurrentPlanTier();
  const isPreview = planTier === "free";

  if (isPreview) {
    const demoClient = getDemoClientDetailById(resolvedParams.id);

    if (!demoClient || !isDemoClientId(resolvedParams.id)) {
      redirect("/dashboard/clients");
    }

    return (
      <div className="space-y-3 p-4 md:p-6">
        <PreviewBanner
          message="This is an example client record. Go Live to manage real client details, tasks, and documents."
          variant="inline"
          triggerFeature="clients"
        />
        <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5">
          <Link href="/dashboard/clients">
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" className="w-fit gap-1.5">
          <Link href={`/dashboard/clients/${resolvedParams.id}/portal/preview`}>
            <Eye className="h-4 w-4" />
            Preview Family Portal
          </Link>
        </Button>
        <div className="max-w-5xl">
          <ClientDetailPanel client={demoClient} previewMode />
        </div>
      </div>
    );
  }

  const [result, packetOptionsResult, portalResult, notesResult] = await Promise.all([
    getClientById(resolvedParams.id),
    getAgreementPacketOptions(),
    getClientPortalData(resolvedParams.id),
    getClientNotes(resolvedParams.id),
  ]);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="flex h-full flex-col p-4 md:p-6">
      <ClientFullDetail
        client={result.data}
        agreementPackets={packetOptionsResult.success && packetOptionsResult.data ? packetOptionsResult.data : []}
        portalData={portalResult.success && portalResult.data ? portalResult.data : null}
        notes={notesResult.success && notesResult.data ? notesResult.data : []}
      />
    </div>
  );
}
