import { notFound, redirect } from "next/navigation";

import { getUser } from "@/lib/supabase/server";
import { getClientById } from "@/lib/actions/clients";

import { ClientFullDetail } from "./client-full-detail";

interface ClientDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ClientDetailPageProps) {
  const resolvedParams = await params;
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
  const user = await getUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const resolvedParams = await params;
  const result = await getClientById(resolvedParams.id);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <div className="flex h-full flex-col p-4 md:p-6">
      <ClientFullDetail client={result.data} />
    </div>
  );
}
