"use client";

import { BwFadeUp } from "@/components/marketing/bw-fade-up";
import { BwSectionWrapper } from "@/components/marketing/bw-section-wrapper";
import { behaviorWorkTestimonials } from "@/content/behaviorwork";

export function BwTestimonials() {
  return (
    <BwSectionWrapper background="slate">
      <BwFadeUp>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#0F2B5B] sm:text-4xl">
            What agencies say after switching
          </h2>
        </div>
      </BwFadeUp>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {behaviorWorkTestimonials.map((testimonial, i) => (
          <BwFadeUp key={testimonial.name} delay={i * 0.1}>
            <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-6">
              {/* Quote mark */}
              <span className="text-4xl font-serif leading-none text-teal-200">
                &ldquo;
              </span>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                {testimonial.quote}
              </p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0F2B5B] text-xs font-bold text-white">
                  {testimonial.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#0F2B5B]">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </div>
            </div>
          </BwFadeUp>
        ))}
      </div>
    </BwSectionWrapper>
  );
}
