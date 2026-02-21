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
    question: "What happens when I hit the free plan limits?",
    answer:
      "You'll get a notification before reaching limits. You can upgrade to Pro at any time to unlock branded pages, more client records, and the full growth toolkit — no data is lost.",
  },
  {
    question: "Can I switch plans at any time?",
    answer:
      "Yes. Upgrade, downgrade, or cancel at any time. When you upgrade, you get immediate access to new features. When you downgrade, you keep access through the end of your billing period.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Absolutely. BehaviorWork is HIPAA compliant, uses encrypted data transmission, and stores data on enterprise-grade infrastructure. Your client information is protected with the same standards used by healthcare organizations.",
  },
  {
    question: "Do I need technical skills to set this up?",
    answer:
      "Not at all. Most agencies complete setup the same day. Our guided onboarding walks you through every step — from creating your listing to publishing branded intake forms.",
  },
  {
    question: "What's included in the FindABATherapy listing?",
    answer:
      "Every account gets a professional provider profile on FindABATherapy.org — the ABA therapy directory families use to find providers. Your listing includes your services, locations, photos, specialties, and a direct contact link.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. There are no long-term contracts. Cancel anytime from your dashboard, and you'll keep access through the end of your billing period.",
  },
  {
    question: "Do you offer discounts for annual billing?",
    answer:
      "Yes — save up to 40% with annual billing. Pro drops from $79/month to $47/month when billed annually.",
  },
] as const;

export function BwFaq() {
  return (
    <BwSectionWrapper id="faq" background="white" narrow>
      <BwFadeUp>
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#0F2B5B] sm:text-4xl">
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
              className="border-slate-200"
            >
              <AccordionTrigger
                onClick={() =>
                  trackFaqExpanded({
                    question: faq.question,
                    pageLocation: "behaviorwork-pricing",
                  })
                }
                className="text-left text-base font-semibold text-[#0F2B5B] hover:no-underline [&[data-state=open]]:text-teal-700"
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
