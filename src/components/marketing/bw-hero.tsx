"use client";

import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  BarChart3,
  Mail,
  Building2,
  Search,
  Briefcase,
} from "lucide-react";
import { motion } from "framer-motion";

import { trackBehaviorWorkCtaClick } from "@/lib/posthog/events";

const EASE: [number, number, number, number] = [0.21, 0.47, 0.32, 0.98];

const stagger = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.12, delayChildren: 0.15 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92, y: 16 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

/* Pipeline stage data */
const pipelineStages = [
  { label: "New Lead", count: 8, color: "#5788FF", barH: "h-12" },
  { label: "Intake Sent", count: 5, color: "#FFDC33", barH: "h-9" },
  { label: "Docs Review", count: 3, color: "#8B5CF6", barH: "h-7" },
  { label: "Insurance", count: 4, color: "#F59E0B", barH: "h-8" },
  { label: "Active", count: 12, color: "#10B981", barH: "h-16" },
] as const;

export function BwHero() {
  return (
    <section className="relative overflow-hidden bg-white pb-20 pt-14 sm:pb-28 sm:pt-24 lg:pb-36 lg:pt-32">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-24 top-16 h-80 w-80 rounded-full bg-[#FFDC33]/10 blur-3xl" />
        <div className="absolute -left-20 top-1/2 h-64 w-64 rounded-full bg-[#5788FF]/8 blur-3xl" />
        <div className="absolute bottom-8 right-1/3 h-48 w-48 rounded-full bg-[#10B981]/8 blur-3xl" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#1A2744 1px, transparent 1px), linear-gradient(90deg, #1A2744 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          {/* ---- Left: Copy ---- */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="max-w-xl"
          >
            <motion.div variants={fadeUp}>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/80 bg-[#FFDC33]/15 px-4 py-1.5 text-xs font-bold tracking-wide text-amber-700">
                For ABA Practice Owners
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mt-7 text-4xl font-extrabold leading-[1.08] tracking-tight text-[#1A2744] sm:text-5xl lg:text-[3.5rem]"
            >
              Attract, intake, and manage
              <br className="hidden sm:block" />
              ABA families &mdash;{" "}
              <span className="relative inline-block">
                <span className="relative z-10 text-[#5788FF]">one platform</span>
                <motion.span
                  className="absolute -bottom-1 left-0 right-0 z-0 h-3 rounded-full bg-[#FFDC33]/40 sm:h-4"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, delay: 0.8, ease: EASE }}
                  style={{ transformOrigin: "left" }}
                />
              </span>
              .
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 text-lg leading-relaxed text-slate-500 sm:text-xl"
            >
              The ABA client management platform with built-in tools to
              attract families, capture their information, and manage your
              caseload. Set up in 5 minutes.
            </motion.p>

            {/* Feature pills */}
            <motion.div
              variants={fadeUp}
              className="mt-5 flex flex-wrap gap-2"
            >
              {[
                { icon: ClipboardList, label: "Intake Forms" },
                { icon: BarChart3, label: "Client Pipeline" },
                { icon: Mail, label: "Email Templates" },
                { icon: Building2, label: "Agency Page" },
                { icon: Search, label: "Directory Listing" },
                { icon: Briefcase, label: "Hiring Tools" },
              ].map(({ icon: Icon, label }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-600 backdrop-blur-sm"
                >
                  <Icon className="h-3 w-3 text-slate-400" />
                  {label}
                </span>
              ))}
            </motion.div>

            <motion.div
              variants={fadeUp}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Link
                href="/behaviorwork/get-started"
                onClick={() =>
                  trackBehaviorWorkCtaClick({
                    section: "hero",
                    ctaLabel: "Start Growing Your Caseload",
                    destination: "/behaviorwork/get-started",
                  })
                }
                className="group inline-flex h-12 items-center justify-center rounded-full bg-[#FFDC33] px-7 text-sm font-bold text-[#1A2744] shadow-md shadow-amber-200/50 transition-all hover:bg-[#F5CF1B] hover:shadow-lg hover:shadow-amber-200/60 active:scale-[0.97]"
              >
                Start Growing Your Caseload
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="#lifecycle"
                onClick={() =>
                  trackBehaviorWorkCtaClick({
                    section: "hero",
                    ctaLabel: "See How It Works",
                    destination: "#lifecycle",
                  })
                }
                className="inline-flex h-12 items-center justify-center rounded-full border border-amber-200/80 bg-white/60 px-7 text-sm font-semibold text-[#1A2744] backdrop-blur-sm transition-all hover:border-amber-300 hover:bg-white"
              >
                See How It Works
              </Link>
            </motion.div>

            {/* Social proof strip */}
            <motion.div
              variants={fadeUp}
              className="mt-8 flex items-center gap-2 text-xs text-slate-400"
            >
              <div className="flex -space-x-1.5">
                {["#5788FF", "#10B981", "#F59E0B", "#8B5CF6"].map((c) => (
                  <div
                    key={c}
                    className="h-6 w-6 rounded-full border-2 border-white"
                    style={{ backgroundColor: c, opacity: 0.7 }}
                  />
                ))}
              </div>
              <span className="font-medium">
                Trusted by ABA agencies across 30+ states
              </span>
            </motion.div>
          </motion.div>

          {/* ---- Right: Pipeline Mockup ---- */}
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="show"
            className="relative"
          >
            <div className="overflow-hidden rounded-2xl border border-amber-200/60 bg-white shadow-xl shadow-amber-100/50">
              {/* Browser chrome */}
              <div className="flex items-center gap-1.5 border-b border-amber-100/60 bg-[#FFFBF0] px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-300/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-300/60" />
                <span className="ml-3 text-[11px] font-medium text-slate-400">
                  app.behaviorwork.com/pipeline
                </span>
              </div>

              <div className="p-5">
                {/* Header row */}
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Client Pipeline
                  </p>
                  <span className="rounded-full bg-[#10B981]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#10B981]">
                    32 families
                  </span>
                </div>

                {/* Pipeline columns */}
                <div className="grid grid-cols-5 gap-2">
                  {pipelineStages.map((stage, i) => (
                    <motion.div
                      key={stage.label}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.5,
                        delay: 1.0 + i * 0.1,
                        ease: EASE,
                      }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        <span className="text-xs font-bold text-[#1A2744]">
                          {stage.count}
                        </span>
                      </div>
                      <p className="text-[10px] font-semibold leading-tight text-slate-500">
                        {stage.label}
                      </p>
                      {/* Animated bar */}
                      <motion.div
                        className={`${stage.barH} w-full rounded-lg`}
                        style={{ backgroundColor: `${stage.color}15` }}
                        initial={{ scaleY: 0 }}
                        animate={{ scaleY: 1 }}
                        transition={{
                          duration: 0.6,
                          delay: 1.3 + i * 0.08,
                          ease: EASE,
                        }}
                      />
                      {/* Mini cards */}
                      {Array.from({
                        length: Math.min(stage.count, 2),
                      }).map((_, j) => (
                        <motion.div
                          key={j}
                          className="h-5 rounded-md border border-amber-100/80 bg-[#FFFBF0]"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{
                            duration: 0.3,
                            delay: 1.6 + i * 0.08 + j * 0.05,
                          }}
                        />
                      ))}
                    </motion.div>
                  ))}
                </div>

                {/* Bottom notification toast */}
                <motion.div
                  className="mt-4 flex items-center gap-2 rounded-xl border border-[#10B981]/20 bg-[#10B981]/5 px-3 py-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 2.0, ease: EASE }}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#10B981]/20">
                    <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                  </span>
                  <p className="text-[10px] font-semibold text-[#10B981]">
                    New inquiry: Martinez family &middot; 2m ago
                  </p>
                </motion.div>
              </div>
            </div>

            {/* Decorative glow */}
            <div className="pointer-events-none absolute -bottom-8 -right-8 -z-10 h-64 w-64 rounded-full bg-[#FFDC33]/15 blur-3xl" />
            <div className="pointer-events-none absolute -left-6 -top-6 -z-10 h-48 w-48 rounded-full bg-[#5788FF]/10 blur-3xl" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
