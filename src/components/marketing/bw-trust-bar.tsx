"use client";

import { Shield, Puzzle, Clock, CheckCircle } from "lucide-react";

import { BwMotion } from "@/components/marketing/bw-motion";

const trustItems = [
  { icon: Shield, label: "HIPAA Compliant" },
  { icon: Puzzle, label: "Built for ABA" },
  { icon: Clock, label: "5-Minute Setup" },
  { icon: CheckCircle, label: "Cancel Anytime" },
] as const;

export function BwTrustBar() {
  return (
    <section className="border-y border-amber-200/40 bg-[#FFF7E1]/50 py-5">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 sm:flex sm:items-center sm:justify-center sm:gap-0 sm:divide-x sm:divide-amber-200/50">
          {trustItems.map(({ icon: Icon, label }, i) => (
            <BwMotion
              key={label}
              variant="fade-up"
              delay={0.1 + i * 0.08}
              duration={0.5}
            >
              <div className="flex items-center justify-center gap-2 sm:px-8">
                <Icon className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold tracking-wide text-slate-600 sm:text-sm">
                  {label}
                </span>
              </div>
            </BwMotion>
          ))}
        </div>
      </div>
    </section>
  );
}
