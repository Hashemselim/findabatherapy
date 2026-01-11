"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { ContactFormFields } from "@/components/contact/contact-form-fields";
import { IntakeSuccessState } from "@/components/intake/intake-success-state";

interface ContactFormIntakeProps {
  listingId: string;
  providerName: string;
  websiteUrl?: string | null;
}

export function ContactFormIntake({
  listingId,
  providerName,
  websiteUrl,
}: ContactFormIntakeProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);

  return (
    <AnimatePresence mode="wait">
      {isSubmitted ? (
        <IntakeSuccessState
          key="success"
          agencyName={providerName}
          websiteUrl={websiteUrl}
        />
      ) : (
        <motion.div
          key="form"
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <ContactFormFields
            listingId={listingId}
            providerName={providerName}
            source="intake_standalone"
            onSuccess={() => setIsSubmitted(true)}
            submitButtonText="Submit Inquiry"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
