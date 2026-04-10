import { notFound, redirect } from "next/navigation";

import { ClientPortalManager } from "@/components/client-portal/client-portal-manager";
import { getClientPortalData } from "@/lib/actions/client-portal";
import { getCurrentUser } from "@/lib/platform/auth/server";

interface ClientPortalManagerPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ClientPortalManagerPageProps) {
  const { id } = await params;
  const result = await getClientPortalData(id);

  if (!result.success || !result.data) {
    return {
      title: "Client Portal | Clients",
    };
  }

  return {
    title: `${result.data.client.name} Portal | Clients`,
    description: `Manage the family-facing client portal for ${result.data.client.name}.`,
  };
}

export default async function ClientPortalManagerPage({
  params,
}: ClientPortalManagerPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const { id } = await params;
  const result = await getClientPortalData(id);
  if (!result.success || !result.data) {
    notFound();
  }

  return <ClientPortalManager data={result.data} />;
}
