"use client";

import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InquiriesList } from "@/components/dashboard/inquiries-list";
import { IntakeSettingsCard } from "@/components/dashboard/intake-settings-card";
import { ContactFormToggle } from "@/components/dashboard/inbox/contact-form-toggle";
import type { Inquiry } from "@/lib/actions/inquiries";
import type { IntakeFormSettings } from "@/lib/actions/intake";

interface Location {
  id: string;
  label: string | null;
  city: string;
  state: string;
}

interface InboxTabsProps {
  inquiries: Inquiry[];
  unreadCount: number;
  locations: Location[];
  contactFormEnabled: boolean;
  listingSlug: string | null;
  intakeFormSettings: IntakeFormSettings;
}

export function InboxTabs({
  inquiries,
  unreadCount,
  locations,
  contactFormEnabled,
  listingSlug,
  intakeFormSettings,
}: InboxTabsProps) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const defaultTab = tabParam === "intake-form" ? "intake-form" : "messages";

  return (
    <Tabs defaultValue={defaultTab} className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList className="w-fit">
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="intake-form">Public Form</TabsTrigger>
        </TabsList>
        <ContactFormToggle contactFormEnabled={contactFormEnabled} />
      </div>

      <TabsContent value="messages" className="mt-4 flex min-h-0 flex-1 flex-col lg:overflow-hidden">
        <InquiriesList
          initialInquiries={inquiries}
          initialUnreadCount={unreadCount}
          locations={locations}
        />
      </TabsContent>

      <TabsContent value="intake-form" className="mt-4">
        {listingSlug ? (
          <IntakeSettingsCard
            listingSlug={listingSlug}
            settings={intakeFormSettings}
          />
        ) : (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-8 text-center">
            <p className="text-muted-foreground">
              Complete your listing setup to customize your intake form.
            </p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
