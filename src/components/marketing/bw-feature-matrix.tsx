"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { BwFadeUp } from "@/components/marketing/bw-fade-up";
import { BwSectionWrapper } from "@/components/marketing/bw-section-wrapper";
import { behaviorWorkFeatureMatrix } from "@/content/behaviorwork";
import { cn } from "@/lib/utils";

export function BwFeatureMatrix() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <BwSectionWrapper background="golden" className="py-16 lg:py-20">
      <BwFadeUp>
        <div className="mx-auto max-w-4xl">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex w-full items-center justify-between rounded-xl border border-amber-200/60 bg-white px-6 py-4 text-left transition-colors hover:bg-amber-50/30"
          >
            <span className="text-base font-semibold text-[#1A2744]">
              Compare all features
            </span>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-slate-400 transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </button>

          {isOpen && (
            <div className="mt-4 overflow-hidden rounded-xl border border-amber-200/40 bg-white">
              {/* Header row - desktop only */}
              <div className="hidden grid-cols-4 border-b border-amber-100/60 bg-[#FFF7E1]/60 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 md:grid">
                <p>Feature</p>
                <p className="text-center">Free</p>
                <p className="text-center">Pro</p>
                <p className="text-center">Enterprise</p>
              </div>

              {behaviorWorkFeatureMatrix.map((group, groupIndex) => (
                <div
                  key={group.group}
                  className={cn(groupIndex > 0 && "border-t border-amber-100/60")}
                >
                  <div className="bg-[#FFF7E1]/40 px-5 py-3">
                    <p className="text-sm font-semibold text-[#1A2744]">
                      {group.group}
                    </p>
                  </div>
                  <div className="divide-y divide-amber-50">
                    {group.rows.map((row) => (
                      <div key={row.label}>
                        {/* Mobile layout */}
                        <div className="space-y-2 px-5 py-3 md:hidden">
                          <p className="text-sm font-medium text-slate-700">
                            {row.label}
                          </p>
                          <div className="grid grid-cols-3 gap-2">
                            {(
                              ["free", "pro", "enterprise"] as const
                            ).map((tier) => (
                              <div
                                key={tier}
                                className={cn(
                                  "rounded-md p-2 text-center",
                                  tier === "pro"
                                    ? "border border-amber-200/60 bg-[#FFDC33]/10"
                                    : "bg-amber-50/30"
                                )}
                              >
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                  {tier}
                                </p>
                                <p
                                  className={cn(
                                    "mt-0.5 text-xs",
                                    tier === "pro"
                                      ? "font-medium text-slate-700"
                                      : "text-slate-500"
                                  )}
                                >
                                  {row.values[tier]}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Desktop layout */}
                        <div className="hidden grid-cols-4 items-center px-5 py-3 text-sm md:grid">
                          <p className="font-medium text-slate-700">
                            {row.label}
                          </p>
                          <p className="text-center text-slate-500">
                            {row.values.free}
                          </p>
                          <p className="text-center font-medium text-slate-700">
                            {row.values.pro}
                          </p>
                          <p className="text-center text-slate-500">
                            {row.values.enterprise}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </BwFadeUp>
    </BwSectionWrapper>
  );
}
