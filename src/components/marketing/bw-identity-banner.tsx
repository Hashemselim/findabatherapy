"use client";

import { BwFadeUp } from "@/components/marketing/bw-fade-up";

export function BwIdentityBanner() {
  return (
    <section className="border-y border-teal-100 bg-gradient-to-r from-teal-50/80 via-white to-teal-50/80 py-10 sm:py-12 lg:py-14">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <BwFadeUp>
          <div className="text-center">
            <p className="text-lg font-bold text-teal-700 sm:text-xl lg:text-2xl">
              The Growth Engine for ABA Agencies
            </p>
            <p className="mt-2 text-sm text-slate-500 sm:text-base">
              Marketing. Intake. Operations. Hiring. One platform.
            </p>
          </div>
        </BwFadeUp>
      </div>
    </section>
  );
}
