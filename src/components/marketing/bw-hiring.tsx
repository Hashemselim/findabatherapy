"use client";

import { Briefcase, Check } from "lucide-react";

import { BwFadeUp } from "@/components/marketing/bw-fade-up";
import { BwSectionWrapper } from "@/components/marketing/bw-section-wrapper";

const features = [
  "Unlimited job postings (Pro+)",
  "Applicant tracking dashboard",
  "Listed on FindABAJobs.org",
] as const;

export function BwHiring() {
  return (
    <BwSectionWrapper background="white">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <BwFadeUp>
          <div className="max-w-lg">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Briefcase className="h-5 w-5 text-emerald-600" />
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#0F2B5B] sm:text-4xl">
              Need BCBAs and RBTs? We&apos;ve got that too.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              Post unlimited jobs on FindABAJobs.org. Your listings reach
              thousands of ABA professionals actively looking for their next
              role.
            </p>
            <ul className="mt-6 space-y-3">
              {features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-sm text-slate-600"
                >
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </BwFadeUp>

        <BwFadeUp delay={0.1}>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <div className="flex items-center gap-1.5 border-b border-slate-200 bg-white px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              <span className="ml-3 text-[11px] font-medium text-slate-400">
                findabajobs.org/jobs
              </span>
            </div>
            <div className="p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Your Job Listings
              </p>
              <div className="space-y-2">
                {[
                  { title: "Board Certified Behavior Analyst (BCBA)", location: "Austin, TX", applicants: 12 },
                  { title: "Registered Behavior Technician (RBT)", location: "San Antonio, TX", applicants: 8 },
                  { title: "Clinical Director", location: "Remote", applicants: 5 },
                ].map((job) => (
                  <div key={job.title} className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-sm font-semibold text-slate-700">{job.title}</p>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="text-xs text-slate-400">{job.location}</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                        {job.applicants} applicants
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </BwFadeUp>
      </div>
    </BwSectionWrapper>
  );
}
