import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileEdit } from "lucide-react";

import { getUser } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { convertInquiryToClient } from "@/lib/actions/clients";

import { ClientForm } from "./client-form";

export const metadata = {
  title: "New Client | Dashboard",
  description: "Add a new client to your practice",
};

interface NewClientPageProps {
  searchParams: Promise<{ inquiry?: string }>;
}

export default async function NewClientPage({ searchParams }: NewClientPageProps) {
  const user = await getUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const params = await searchParams;
  const inquiryId = params.inquiry;

  // If converting from inquiry, fetch prefill data
  let defaultValues = undefined;
  let fromInquiry = false;

  if (inquiryId) {
    const result = await convertInquiryToClient(inquiryId);
    if (result.success && result.data) {
      defaultValues = result.data.prefillData;
      fromInquiry = true;
    }
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">New Client</h1>
            {fromInquiry && (
              <Badge variant="outline" className="gap-1">
                <FileEdit className="h-3 w-3" />
                From Inquiry
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {fromInquiry
              ? "Review and complete the client information from the inquiry"
              : "Add a new client to your practice"}
          </p>
        </div>
      </div>

      {/* Form */}
      <ClientForm defaultValues={defaultValues} inquiryId={inquiryId} />
    </div>
  );
}
