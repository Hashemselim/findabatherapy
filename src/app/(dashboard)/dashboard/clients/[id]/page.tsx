import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";

import { getUser } from "@/lib/supabase/server";
import { getClientById } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";

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
    <div className="flex flex-col h-full p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/dashboard/clients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">
              {[result.data.child_first_name, result.data.child_last_name]
                .filter(Boolean)
                .join(" ") || "Unnamed Client"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Client Details
            </p>
          </div>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href={`/dashboard/clients/${resolvedParams.id}/edit`}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit Client
          </Link>
        </Button>
      </div>

      {/* Content */}
      <ClientFullDetail client={result.data} />
    </div>
  );
}
