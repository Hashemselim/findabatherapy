"use client";

import { Star } from "lucide-react";

import { BwMotion } from "@/components/marketing/bw-motion";
import { BwFadeUp } from "@/components/marketing/bw-fade-up";
import { BwSectionWrapper } from "@/components/marketing/bw-section-wrapper";
import { behaviorWorkTestimonials } from "@/content/behaviorwork";

export function BwTestimonials() {
  return (
    <BwSectionWrapper background="cream">
      <BwFadeUp>
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-amber-200/60 bg-[#FFDC33]/10 px-4 py-1.5 text-xs font-bold tracking-wide text-amber-700">
            Trusted by ABA Agencies
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-[#1A2744] sm:text-4xl">
            What agencies say after switching
          </h2>
        </div>
      </BwFadeUp>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {behaviorWorkTestimonials.map((testimonial, i) => (
          <BwMotion
            key={testimonial.name}
            variant="spring-in"
            delay={i * 0.1}
            bounce
          >
            <div className="flex h-full flex-col rounded-2xl border border-amber-200/40 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-amber-100/50">
              {/* Stars */}
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star
                    key={j}
                    className="h-3.5 w-3.5 fill-[#FFDC33] text-[#FFDC33]"
                  />
                ))}
              </div>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-amber-100/50 pt-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFDC33]/20 text-xs font-bold text-amber-700">
                  {testimonial.initials}
                </div>
                <div>
                  <p className="text-sm font-bold text-[#1A2744]">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          </BwMotion>
        ))}
      </div>
    </BwSectionWrapper>
  );
}
