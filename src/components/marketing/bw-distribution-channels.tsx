"use client";

import Image from "next/image";
import { Briefcase, Check, ExternalLink } from "lucide-react";

import { BwFadeUp } from "@/components/marketing/bw-fade-up";
import { BwSectionWrapper } from "@/components/marketing/bw-section-wrapper";

const channels = [
  {
    name: "FindABATherapy.org",
    tagline: "Public provider directory",
    description:
      "Families search to find ABA providers near them. Your listing drives high-intent leads to your branded pages.",
    gradient: "from-[#5788FF] to-[#3D6BE5]",
    footerTag: "Drives client leads",
    footerColor: "text-[#5788FF]",
    footerBg: "bg-[#5788FF]/10",
    href: "https://www.findabatherapy.org",
    logoType: "image" as const,
    bullets: [
      "SEO-optimized listing",
      "Profile with locations, services, insurance & photos",
      "Direct link to your branded contact form",
      "Auto-included with every account",
    ],
  },
  {
    name: "FindABAJobs.org",
    tagline: "ABA-specific job board",
    description:
      "ABA professionals search for BCBA, RBT, and clinical roles. Your postings reach thousands of candidates.",
    gradient: "from-[#10B981] to-[#059669]",
    footerTag: "Drives hiring pipeline",
    footerColor: "text-[#10B981]",
    footerBg: "bg-[#10B981]/10",
    href: "https://www.findabajobs.org",
    logoType: "icon" as const,
    bullets: [
      "ABA-specific job board",
      "Branded careers page",
      "Applicant tracking",
      "Unlimited postings on Pro+",
    ],
  },
] as const;

export function BwDistributionChannels() {
  return (
    <BwSectionWrapper background="golden">
      <BwFadeUp>
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-amber-200/60 bg-white/80 px-4 py-1.5 text-xs font-bold tracking-wide text-amber-700">
            Built-In Distribution
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-[#1A2744] sm:text-4xl">
            How families and candidates{" "}
            <span className="relative inline-block">
              <span className="relative z-10">find you</span>
              <span className="absolute -bottom-0.5 left-0 right-0 z-0 h-2.5 rounded-full bg-[#FFDC33]/30" />
            </span>
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Every BehaviorWork account includes two public channels that bring
            families and ABA professionals to your door.
          </p>
        </div>
      </BwFadeUp>

      <div className="mt-14 grid gap-6 lg:grid-cols-2">
        {channels.map((channel, i) => (
          <BwFadeUp key={channel.name} delay={i * 0.1}>
            <a
              href={channel.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-amber-200/40 bg-white shadow-sm transition-all hover:shadow-lg hover:shadow-amber-100/50"
            >
              {/* Gradient header */}
              <div
                className={`bg-gradient-to-r ${channel.gradient} px-6 py-5 sm:px-8`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {channel.logoType === "image" ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                        <Image
                          src="/logo-icon.png"
                          alt="FindABATherapy"
                          width={28}
                          height={28}
                          className="rounded"
                        />
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                        <Briefcase className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-white/70">
                        {channel.tagline}
                      </p>
                      <h3 className="text-lg font-bold text-white sm:text-xl">
                        {channel.name}
                      </h3>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-white/50 transition-colors group-hover:text-white" />
                </div>
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col px-6 py-6 sm:px-8">
                <p className="text-sm leading-relaxed text-slate-600">
                  {channel.description}
                </p>

                <ul className="mt-5 flex-1 space-y-3">
                  {channel.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="flex items-start gap-2.5 text-sm text-slate-600"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                {/* Footer tag */}
                <div className="mt-6 border-t border-amber-100/60 pt-4">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${channel.footerBg} ${channel.footerColor}`}
                  >
                    {channel.footerTag} &rarr;
                  </span>
                </div>
              </div>
            </a>
          </BwFadeUp>
        ))}
      </div>
    </BwSectionWrapper>
  );
}
