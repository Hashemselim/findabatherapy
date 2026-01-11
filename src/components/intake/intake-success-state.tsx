"use client";

import { motion } from "framer-motion";
import { CheckCircle, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

interface IntakeSuccessStateProps {
  agencyName: string;
  websiteUrl?: string | null;
}

export function IntakeSuccessState({ agencyName, websiteUrl }: IntakeSuccessStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center py-8 text-center"
    >
      {/* Success checkmark with animation */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          delay: 0.1,
          duration: 0.5,
          ease: [0.34, 1.56, 0.64, 1],
        }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100"
      >
        <CheckCircle className="h-10 w-10 text-emerald-600" />
      </motion.div>

      <h2 className="mb-2 font-poppins text-2xl font-semibold text-foreground sm:text-3xl">
        Thank You!
      </h2>
      <p className="mb-6 max-w-sm text-muted-foreground">
        Your inquiry has been sent to {agencyName}. We&apos;ll be in touch within 1-2 business days.
      </p>

      {websiteUrl && (
        <Button
          asChild
          variant="outline"
          className="group rounded-full px-6 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] active:translate-y-0"
        >
          <a href={websiteUrl} target="_blank" rel="noopener noreferrer">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
            Back to {agencyName} Website
          </a>
        </Button>
      )}
    </motion.div>
  );
}
