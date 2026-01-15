import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getUser } from "@/lib/supabase/server";
import { getClientById } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";

import { ClientForm } from "../../new/client-form";

export const metadata = {
  title: "Edit Client | Dashboard",
  description: "Edit client information",
};

interface EditClientPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditClientPage({ params }: EditClientPageProps) {
  const user = await getUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const resolvedParams = await params;
  const result = await getClientById(resolvedParams.id);

  if (!result.success || !result.data) {
    notFound();
  }

  const client = result.data;

  // Transform client data to form format
  const defaultValues = {
    status: client.status,
    referral_source: client.referral_source || undefined,
    funding_source: client.funding_source || undefined,
    preferred_language: client.preferred_language || undefined,
    child_first_name: client.child_first_name || undefined,
    child_last_name: client.child_last_name || undefined,
    child_date_of_birth: client.child_date_of_birth || undefined,
    child_diagnosis: client.child_diagnosis || [],
    child_primary_concerns: client.child_primary_concerns || undefined,
    child_aba_history: client.child_aba_history || undefined,
    child_school_name: client.child_school_name || undefined,
    child_school_district: client.child_school_district || undefined,
    child_grade_level: client.child_grade_level || undefined,
    child_other_therapies: client.child_other_therapies || undefined,
    child_pediatrician_name: client.child_pediatrician_name || undefined,
    child_pediatrician_phone: client.child_pediatrician_phone || undefined,
    notes: client.notes || undefined,
    parents: (client.parents || []).map((p) => ({
      id: p.id,
      first_name: p.first_name || undefined,
      last_name: p.last_name || undefined,
      relationship: p.relationship || undefined,
      phone: p.phone || undefined,
      email: p.email || undefined,
      notes: p.notes || undefined,
      is_primary: p.is_primary,
    })),
    locations: (client.locations || []).map((l) => ({
      id: l.id,
      label: l.label || undefined,
      street_address: l.street_address || undefined,
      city: l.city || undefined,
      state: l.state || undefined,
      postal_code: l.postal_code || undefined,
      latitude: l.latitude || undefined,
      longitude: l.longitude || undefined,
      place_id: l.place_id || undefined,
      notes: l.notes || undefined,
      is_primary: l.is_primary,
    })),
    insurances: (client.insurances || []).map((i) => ({
      id: i.id,
      insurance_name: i.insurance_name || undefined,
      insurance_type: i.insurance_type || undefined,
      member_id: i.member_id || undefined,
      group_number: i.group_number || undefined,
      is_primary: i.is_primary,
    })),
  };

  // Build display name
  const childName = [client.child_first_name, client.child_last_name]
    .filter(Boolean)
    .join(" ");
  const displayName = childName || "Client";

  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/clients/${resolvedParams.id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Edit {displayName}</h1>
          <p className="text-sm text-muted-foreground">
            Update client information
          </p>
        </div>
      </div>

      {/* Form */}
      <ClientForm
        defaultValues={defaultValues}
        clientId={resolvedParams.id}
        isEditMode={true}
      />
    </div>
  );
}
