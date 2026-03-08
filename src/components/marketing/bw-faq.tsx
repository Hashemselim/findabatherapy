"use client";

import { BwFadeUp } from "@/components/marketing/bw-fade-up";
import { BwSectionWrapper } from "@/components/marketing/bw-section-wrapper";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { trackFaqExpanded } from "@/lib/posthog/events";

const faqs = [
  {
    question: "Does GoodABA replace CentralReach or my practice management system?",
    answer:
      "No — GoodABA complements your practice management tool. CentralReach, Catalyst, and similar systems handle session notes, data collection, and clinical billing. GoodABA handles everything before that: how families find you, how inquiries are captured, how your intake pipeline is managed, and how your team stays on top of follow-ups. Think of it as the business operations layer that feeds clients into your clinical system.",
  },
  {
    question: "What happens when I hit the free plan limits?",
    answer:
      "You'll get a notification before reaching limits. You can upgrade to Pro at any time to unlock branded pages, more client records, and the full growth toolkit — no data is lost.",
  },
  {
    question: "Can my front desk person or intake coordinator use this?",
    answer:
      "Absolutely. GoodABA is designed for the people who actually run agency operations — not just the owner. Intake coordinators, office managers, and BCBAs can all access client records, send communications, and manage tasks. With Pro, you can add team members to your account.",
  },
  {
    question: "I already have a website. Do I still need GoodABA?",
    answer:
      "Yes — your website tells families about your agency, but GoodABA captures and manages what happens next. Branded intake forms, a client CRM, automated follow-up emails, insurance tracking, and task management aren't something a website can do. You can link your GoodABA forms directly from your existing site.",
  },
  {
    question: "Do I need technical skills to set this up?",
    answer:
      "Not at all. Most agencies complete setup the same day. Our guided onboarding walks you through every step — from creating your listing to publishing branded intake forms. No coding, no IT department needed.",
  },
  {
    question: "What's included in the GoodABA listing?",
    answer:
      "Every account gets a professional provider profile on GoodABA.com — the ABA therapy directory families use to find providers. Your listing includes your services, locations, photos, specialties, and a direct contact link. Pro accounts get priority placement and a verified badge.",
  },
  {
    question: "Is GoodABA HIPAA compliant? Can I store client documents safely?",
    answer:
      "Yes. GoodABA is fully HIPAA compliant with encrypted data transmission, secure document storage, and enterprise-grade infrastructure. You can safely store insurance cards, assessments, consents, and other client documents — all organized per client.",
  },
  {
    question: "Can I switch plans or cancel at any time?",
    answer:
      "Yes. There are no long-term contracts. Upgrade, downgrade, or cancel at any time from your dashboard. When you upgrade, you get immediate access. When you downgrade or cancel, you keep access through the end of your billing period. Save 40% with annual billing.",
  },
] as const;

export function BwFaq({ pageLocation = "goodaba-lander" }: { pageLocation?: string }) {
  return (
    <BwSectionWrapper id="faq" background="cream" narrow>
      <BwFadeUp>
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1A2744] sm:text-4xl">
            Frequently asked questions
          </h2>
        </div>
      </BwFadeUp>

      <BwFadeUp delay={0.1}>
        <Accordion type="single" collapsible className="mt-10">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={faq.question}
              value={`faq-${i}`}
              className="border-amber-200/40"
            >
              <AccordionTrigger
                onClick={() =>
                  trackFaqExpanded({
                    question: faq.question,
                    pageLocation,
                  })
                }
                className="text-left text-base font-semibold text-[#1A2744] hover:no-underline data-[state=open]:text-amber-700"
              >
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-slate-600">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </BwFadeUp>
    </BwSectionWrapper>
  );
}
