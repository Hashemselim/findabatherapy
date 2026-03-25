"use client";

import { useMemo, useState } from "react";

import { ReferralSendDialog } from "@/components/dashboard/referrals/referral-send-dialog";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import type { ReferralTemplate } from "@/lib/actions/referrals";

const PREVIEW_TEMPLATES: ReferralTemplate[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Referral Intro",
    template_type: "intro",
    subject: "Referral partnership with {{agency_name}}",
    body: [
      "Hi {{contact_name}},",
      "",
      "I wanted to introduce {{agency_name}}. We provide ABA services for children and families in {{agency_city_state}}.",
      "",
      "We would love to be a referral resource for your office when families need ABA support.",
      "",
      "Best,",
      "{{agency_name}}",
      "{{agency_email}}",
    ].join("\n"),
    is_default: true,
    is_active: true,
    updated_at: new Date("2026-03-25T00:00:00.000Z").toISOString(),
  },
];

const PREVIEW_SOURCES = [
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    name: "Bright Steps Pediatrics",
    recipientEmail: "referrals@brightsteps.test",
    recipientName: "Dr. Lopez",
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
    name: "Sunrise Child Neurology",
    recipientEmail: "intake@sunrise.test",
    recipientName: "Sonia Patel",
  },
  {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3",
    name: "Northside Developmental Clinic",
    recipientEmail: "coordinator@northside.test",
    recipientName: "Jamie Reed",
  },
];

type PreviewMode = "single" | "bulk";

export default function ReferralSendPreviewPage() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PreviewMode>("bulk");

  const sourceIds = useMemo(
    () => (mode === "single" ? [PREVIEW_SOURCES[0].id] : PREVIEW_SOURCES.map((source) => source.id)),
    [mode]
  );
  const sourceName = mode === "single" ? PREVIEW_SOURCES[0].name : undefined;

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto max-w-3xl space-y-6 rounded-3xl border bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Internal Preview</p>
          <h1 className="text-3xl font-semibold text-slate-900">Referral Send Dialog</h1>
          <p className="max-w-2xl text-sm text-slate-600">
            This route is for QA only. It renders the real referral send dialog with mocked data so draft behavior can be recorded safely.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant={mode === "bulk" ? "default" : "outline"}
            onClick={() => setMode("bulk")}
          >
            Bulk Preview
          </Button>
          <Button
            variant={mode === "single" ? "default" : "outline"}
            onClick={() => setMode("single")}
          >
            Single Preview
          </Button>
          <Button variant="outline" onClick={() => setOpen(true)}>
            Open Dialog
          </Button>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          {mode === "bulk"
            ? "Bulk mode uses three mocked referral recipients and lets you override drafts to personal test emails."
            : "Single mode uses one mocked recipient and also enables the local mail app button."}
        </div>
      </div>

      <ReferralSendDialog
        open={open}
        onOpenChange={setOpen}
        templates={PREVIEW_TEMPLATES}
        sourceIds={sourceIds}
        sourceName={sourceName}
        actionOverrides={{
          prepareDrafts: async (input) => {
            const overrideRecipients = input.testRecipientEmails?.join(",") || "";
            const drafts = input.sourceIds
              .map((sourceId) => PREVIEW_SOURCES.find((source) => source.id === sourceId))
              .filter(Boolean)
              .map((source) => ({
                sourceId: source!.id,
                sourceName: source!.name,
                recipientEmail: overrideRecipients || source!.recipientEmail,
                recipientName: overrideRecipients ? "Test recipient" : source!.recipientName,
                subject: input.subject.replace("{{agency_name}}", "Lighthouse ABA"),
                body: input.body
                  .replaceAll("{{agency_name}}", "Lighthouse ABA")
                  .replaceAll("{{agency_city_state}}", "Austin, TX")
                  .replaceAll("{{agency_email}}", "hello@lighthouseaba.com")
                  .replace("{{contact_name}}", source!.recipientName),
              }));

            return {
              success: true as const,
              data: {
                drafts,
                skipped: [],
              },
            };
          },
        }}
      />
      <Toaster richColors position="bottom-right" />
    </main>
  );
}
