"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileText,
  ClipboardList,
  Building2,
  BookOpen,
  Briefcase,
  Mail,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { BwFadeUp } from "@/components/marketing/bw-fade-up";
import { BwSectionWrapper } from "@/components/marketing/bw-section-wrapper";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Slide data                                                         */
/* ------------------------------------------------------------------ */

interface Slide {
  icon: LucideIcon;
  title: string;
  path: string;
  description: string;
  color: string;
  urlBar: string;
}

const slides: Slide[] = [
  {
    icon: FileText,
    title: "Contact Form",
    path: "/contact/your-agency",
    description:
      "A branded inquiry form families fill out in under 60 seconds.",
    color: "#5788FF",
    urlBar: "findabatherapy.org/contact/your-agency",
  },
  {
    icon: ClipboardList,
    title: "Client Intake Form",
    path: "/intake/your-agency",
    description:
      "Collect child details, parent info, insurance, and availability before the first call.",
    color: "#FFDC33",
    urlBar: "findabatherapy.org/intake/your-agency",
  },
  {
    icon: Building2,
    title: "Agency Page",
    path: "/p/your-agency",
    description:
      "A public-facing page with your logo, locations, services, photos, and a direct CTA.",
    color: "#8B5CF6",
    urlBar: "findabatherapy.org/p/your-agency",
  },
  {
    icon: BookOpen,
    title: "Parent Resources",
    path: "/resources/your-agency",
    description:
      "FAQ, ABA glossary, and parent guides branded to your agency.",
    color: "#F59E0B",
    urlBar: "findabatherapy.org/resources/your-agency",
  },
  {
    icon: Briefcase,
    title: "Careers Page",
    path: "/careers/your-agency",
    description:
      "A branded job board for your agency. List BCBA and RBT positions.",
    color: "#10B981",
    urlBar: "findabajobs.org/careers/your-agency",
  },
  {
    icon: Mail,
    title: "Branded Emails",
    path: "auto-sent from pipeline",
    description:
      "22 email templates with your agency name, logo, and merge fields — sent automatically at every stage.",
    color: "#5788FF",
    urlBar: "sent via BehaviorWork",
  },
];

/* ------------------------------------------------------------------ */
/*  Browser chrome wrapper                                             */
/* ------------------------------------------------------------------ */

function BrowserChrome({
  urlBar,
  color,
  children,
}: {
  urlBar: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200/60 bg-white shadow-xl shadow-amber-100/50">
      {/* Title bar */}
      <div className="flex items-center gap-1.5 border-b border-amber-100/60 bg-[#FFFBF0] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-red-300/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-300/60" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-300/60" />
        <span
          className="ml-3 truncate text-[11px] font-medium"
          style={{ color: `${color}90` }}
        >
          {urlBar}
        </span>
      </div>
      {/* Content */}
      <div className="relative min-h-[340px] overflow-hidden bg-white p-5 sm:min-h-[380px] sm:p-6">
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Individual slide mockups                                           */
/* ------------------------------------------------------------------ */

function MockupContactForm() {
  return (
    <div className="mx-auto max-w-sm space-y-4">
      {/* Logo + heading */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-[#5788FF]/15" />
        <div>
          <div className="h-2.5 w-28 rounded-full bg-[#1A2744]/15" />
          <div className="mt-1 h-2 w-20 rounded-full bg-slate-200/80" />
        </div>
      </div>
      <h3 className="text-sm font-bold text-[#1A2744]">Contact Us</h3>
      {/* Form fields */}
      {[
        "Parent / Guardian Name",
        "Child\u2019s First Name",
        "Phone Number",
        "Email Address",
      ].map((label) => (
        <div key={label}>
          <p className="mb-1 text-[10px] font-semibold text-slate-400">
            {label}
          </p>
          <div className="h-8 rounded-lg border border-slate-200 bg-slate-50/80" />
        </div>
      ))}
      {/* Insurance dropdown */}
      <div>
        <p className="mb-1 text-[10px] font-semibold text-slate-400">
          Insurance Provider
        </p>
        <div className="flex h-8 items-center justify-between rounded-lg border border-slate-200 bg-slate-50/80 px-3">
          <span className="text-[10px] text-slate-300">Select insurance...</span>
          <ChevronRight className="h-3 w-3 rotate-90 text-slate-300" />
        </div>
      </div>
      {/* Textarea */}
      <div>
        <p className="mb-1 text-[10px] font-semibold text-slate-400">
          How can we help?
        </p>
        <div className="h-14 rounded-lg border border-slate-200 bg-slate-50/80" />
      </div>
      {/* Submit */}
      <div className="flex h-9 items-center justify-center rounded-full bg-[#5788FF] text-[11px] font-bold text-white">
        Submit Inquiry &rarr;
      </div>
    </div>
  );
}

function MockupIntakeForm() {
  return (
    <div className="mx-auto max-w-md space-y-4">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {["Parent Info", "Child Info", "Insurance", "Availability"].map(
          (step, i) => (
            <div key={step} className="flex-1">
              <div
                className={cn(
                  "h-1.5 rounded-full",
                  i === 0 ? "bg-[#FFDC33]" : "bg-slate-100"
                )}
              />
              <p
                className={cn(
                  "mt-1 text-center text-[8px] font-semibold",
                  i === 0 ? "text-amber-600" : "text-slate-300"
                )}
              >
                {step}
              </p>
            </div>
          )
        )}
      </div>
      {/* Section: Parent Info */}
      <div className="rounded-xl border border-amber-200/40 bg-[#FFFBF0] p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-amber-600">
          Parent / Guardian Information
        </p>
        <div className="grid grid-cols-2 gap-3">
          {["First Name", "Last Name", "Phone", "Email", "Address", "City"].map(
            (f) => (
              <div key={f}>
                <p className="mb-0.5 text-[8px] font-semibold text-slate-400">
                  {f}
                </p>
                <div className="h-6 rounded-md border border-slate-200 bg-white" />
              </div>
            )
          )}
        </div>
      </div>
      {/* Section: Child Info */}
      <div className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-4">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Child Information
        </p>
        <div className="grid grid-cols-2 gap-3">
          {["Child\u2019s Name", "Date of Birth", "Diagnosis", "Current Services"].map(
            (f) => (
              <div key={f}>
                <p className="mb-0.5 text-[8px] font-semibold text-slate-400">
                  {f}
                </p>
                <div className="h-6 rounded-md border border-slate-200 bg-white" />
              </div>
            )
          )}
        </div>
      </div>
      {/* Insurance section peek */}
      <div className="rounded-xl border border-dashed border-slate-200 p-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-slate-400">
            Insurance & Availability
          </p>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-bold text-amber-600">
            Next
          </span>
        </div>
      </div>
    </div>
  );
}

function MockupAgencyPage() {
  return (
    <div className="space-y-4">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#8B5CF6]/10 to-[#8B5CF6]/5 p-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-[#8B5CF6]/20" />
          <div>
            <div className="h-3 w-36 rounded-full bg-[#1A2744]/15" />
            <div className="mt-1.5 h-2 w-24 rounded-full bg-slate-200/80" />
          </div>
        </div>
      </div>
      {/* Service pills */}
      <div className="flex flex-wrap gap-1.5">
        {["In-Home ABA", "Clinic-Based", "Telehealth", "Social Skills"].map(
          (s) => (
            <span
              key={s}
              className="rounded-full bg-[#8B5CF6]/10 px-2.5 py-1 text-[9px] font-bold text-[#8B5CF6]"
            >
              {s}
            </span>
          )
        )}
      </div>
      {/* Location cards */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { city: "Austin, TX", address: "1234 Main St" },
          { city: "Houston, TX", address: "5678 Oak Ave" },
          { city: "Dallas, TX", address: "910 Elm Blvd" },
        ].map((loc) => (
          <div
            key={loc.city}
            className="rounded-lg border border-slate-200/60 bg-slate-50/50 p-2.5"
          >
            <p className="text-[9px] font-bold text-[#1A2744]">{loc.city}</p>
            <p className="text-[8px] text-slate-400">{loc.address}</p>
          </div>
        ))}
      </div>
      {/* Insurance badges */}
      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">
          Accepted Insurance
        </p>
        <div className="flex flex-wrap gap-1.5">
          {[
            "Blue Cross",
            "Aetna",
            "UnitedHealthcare",
            "Cigna",
            "Medicaid",
          ].map((ins) => (
            <span
              key={ins}
              className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[8px] font-semibold text-slate-500"
            >
              {ins}
            </span>
          ))}
        </div>
      </div>
      {/* CTA */}
      <div className="flex h-8 items-center justify-center rounded-full bg-[#8B5CF6] text-[10px] font-bold text-white">
        Contact This Agency &rarr;
      </div>
    </div>
  );
}

function MockupParentResources() {
  return (
    <div className="flex gap-4">
      {/* Sidebar */}
      <div className="hidden w-32 shrink-0 space-y-2 sm:block">
        <p className="text-[9px] font-bold uppercase tracking-wider text-[#F59E0B]">
          Resources
        </p>
        {["FAQ", "ABA Glossary", "Parent Guides", "What to Expect"].map(
          (item, i) => (
            <div
              key={item}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-[9px] font-semibold",
                i === 0
                  ? "bg-[#F59E0B]/10 text-[#F59E0B]"
                  : "text-slate-400 hover:bg-slate-50"
              )}
            >
              {item}
            </div>
          )
        )}
      </div>
      {/* Main content — FAQ */}
      <div className="flex-1 space-y-3">
        {/* Search */}
        <div className="flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3">
          <span className="text-[10px] text-slate-300">
            Search resources...
          </span>
        </div>
        <p className="text-[10px] font-bold text-[#1A2744]">
          Frequently Asked Questions
        </p>
        {[
          "What is ABA therapy?",
          "How many hours per week is typical?",
          "Does insurance cover ABA?",
          "How do I get started?",
          "What qualifications do your therapists have?",
        ].map((q, i) => (
          <div
            key={q}
            className="rounded-lg border border-slate-200/60 bg-white p-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-semibold text-[#1A2744]">{q}</p>
              <ChevronRight
                className={cn(
                  "h-3 w-3 text-slate-300",
                  i === 0 && "rotate-90 text-[#F59E0B]"
                )}
              />
            </div>
            {i === 0 && (
              <div className="mt-2 space-y-1">
                <div className="h-2 w-full rounded-full bg-slate-100" />
                <div className="h-2 w-[85%] rounded-full bg-slate-100" />
                <div className="h-2 w-[70%] rounded-full bg-slate-100" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MockupCareersPage() {
  return (
    <div className="space-y-4">
      {/* Company header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#10B981]/15" />
        <div>
          <div className="h-2.5 w-32 rounded-full bg-[#1A2744]/15" />
          <p className="mt-1 text-[9px] text-slate-400">
            Austin, TX &middot; 3 open positions
          </p>
        </div>
      </div>
      <div className="space-y-1">
        <div className="h-2 w-full rounded-full bg-slate-100" />
        <div className="h-2 w-[90%] rounded-full bg-slate-100" />
      </div>
      {/* Job listings */}
      {[
        {
          role: "Board Certified Behavior Analyst (BCBA)",
          type: "Full-Time",
          salary: "$75k - $95k",
          loc: "Austin, TX",
        },
        {
          role: "Registered Behavior Technician (RBT)",
          type: "Part-Time",
          salary: "$22 - $28/hr",
          loc: "Houston, TX",
        },
        {
          role: "Clinical Director",
          type: "Full-Time",
          salary: "$95k - $120k",
          loc: "Austin, TX",
        },
      ].map((job) => (
        <div
          key={job.role}
          className="rounded-xl border border-slate-200/60 bg-white p-4 transition-all hover:border-[#10B981]/30"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold text-[#1A2744]">
                {job.role}
              </p>
              <div className="mt-1.5 flex gap-1.5">
                <span className="rounded-full bg-[#10B981]/10 px-2 py-0.5 text-[8px] font-bold text-[#10B981]">
                  {job.type}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-semibold text-slate-500">
                  {job.loc}
                </span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[8px] font-semibold text-amber-600">
                  {job.salary}
                </span>
              </div>
            </div>
            <div className="flex h-7 items-center rounded-full bg-[#10B981] px-3 text-[9px] font-bold text-white">
              Apply
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MockupBrandedEmails() {
  return (
    <div className="mx-auto max-w-sm">
      {/* Email chrome */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Email header */}
        <div className="space-y-1 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold text-slate-400">
              From:
            </span>
            <span className="text-[9px] font-medium text-[#1A2744]">
              Your Agency Name &lt;hello@yourcompany.com&gt;
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold text-slate-400">
              To:
            </span>
            <span className="text-[9px] font-medium text-[#1A2744]">
              Sarah Martinez &lt;sarah@email.com&gt;
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-semibold text-slate-400">
              Subject:
            </span>
            <span className="text-[9px] font-bold text-[#1A2744]">
              Welcome to Your Agency Name!
            </span>
          </div>
        </div>
        {/* Email body */}
        <div className="space-y-3 p-4">
          {/* Logo header */}
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="h-8 w-8 rounded-lg bg-[#5788FF]/15" />
            <span className="text-[10px] font-bold text-[#1A2744]">
              Your Agency Name
            </span>
          </div>
          {/* Greeting */}
          <p className="text-[10px] font-semibold text-[#1A2744]">
            Hi Sarah,
          </p>
          <div className="space-y-1.5">
            <div className="h-2 w-full rounded-full bg-slate-100" />
            <div className="h-2 w-[95%] rounded-full bg-slate-100" />
            <div className="h-2 w-[80%] rounded-full bg-slate-100" />
          </div>
          {/* Status box */}
          <div className="rounded-lg bg-[#5788FF]/5 p-3">
            <p className="text-[9px] font-bold text-[#5788FF]">
              Your Inquiry Status
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                <span className="text-[8px] font-semibold text-[#10B981]">
                  Received
                </span>
              </div>
              <div className="h-px flex-1 bg-slate-200" />
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#FFDC33]" />
                <span className="text-[8px] font-semibold text-amber-600">
                  Under Review
                </span>
              </div>
              <div className="h-px flex-1 bg-slate-200" />
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-200" />
                <span className="text-[8px] text-slate-400">Scheduled</span>
              </div>
            </div>
          </div>
          {/* More body lines */}
          <div className="space-y-1.5">
            <div className="h-2 w-[90%] rounded-full bg-slate-100" />
            <div className="h-2 w-[75%] rounded-full bg-slate-100" />
          </div>
          {/* CTA button */}
          <div className="flex h-8 items-center justify-center rounded-full bg-[#5788FF] text-[9px] font-bold text-white">
            Complete Your Intake Form &rarr;
          </div>
          {/* Footer */}
          <div className="border-t border-slate-100 pt-2 text-center">
            <p className="text-[8px] text-slate-400">
              Your Agency Name &middot; Austin, TX &middot;
              yourcompany.com
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Map slide index → mockup component */
const mockupComponents = [
  MockupContactForm,
  MockupIntakeForm,
  MockupAgencyPage,
  MockupParentResources,
  MockupCareersPage,
  MockupBrandedEmails,
];

/* ------------------------------------------------------------------ */
/*  Carousel                                                           */
/* ------------------------------------------------------------------ */

const AUTOPLAY_MS = 5000;

export function BwBrandedPages() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(
    () => setActive((i) => (i + 1) % slides.length),
    []
  );
  const prev = useCallback(
    () => setActive((i) => (i - 1 + slides.length) % slides.length),
    []
  );

  /* Auto-rotate */
  useEffect(() => {
    if (paused) return;
    const id = setInterval(next, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, next]);

  const slide = slides[active];
  const Mockup = mockupComponents[active];

  return (
    <BwSectionWrapper background="golden">
      {/* Section header */}
      <BwFadeUp>
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-amber-200/60 bg-white/80 px-4 py-1.5 text-xs font-bold tracking-wide text-amber-700">
            Your Brand, Everywhere
          </span>
          <h2 className="mt-5 text-3xl font-extrabold tracking-tight text-[#1A2744] sm:text-4xl">
            Seven branded touchpoints.{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-[#5788FF]">Zero coding</span>
              <span className="absolute -bottom-0.5 left-0 right-0 z-0 h-2.5 rounded-full bg-[#FFDC33]/30" />
            </span>
            .
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Every page and email carries your agency name, logo, and colors.
            Families and candidates see{" "}
            <span className="font-semibold text-[#1A2744]">your brand</span>{" "}
            from first click to conversion.
          </p>
        </div>
      </BwFadeUp>

      {/* Tab pills */}
      <BwFadeUp delay={0.1}>
        <div className="mx-auto mt-10 flex flex-wrap items-center justify-center gap-2">
          {slides.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === active;
            return (
              <button
                key={s.title}
                onClick={() => setActive(i)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition-all",
                  isActive
                    ? "border-amber-300 bg-white shadow-sm shadow-amber-100/50 text-[#1A2744]"
                    : "border-transparent bg-white/50 text-slate-400 hover:bg-white/80 hover:text-slate-600"
                )}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5",
                    isActive ? `text-[${s.color}]` : "text-slate-400"
                  )}
                  style={isActive ? { color: s.color } : undefined}
                />
                <span className="hidden sm:inline">{s.title}</span>
              </button>
            );
          })}
        </div>
      </BwFadeUp>

      {/* Carousel */}
      <BwFadeUp delay={0.15}>
        <div
          className="relative mx-auto mt-8 max-w-3xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Slide info + dots — ABOVE the mockup */}
          <div className="mb-5 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={`info-${active}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-lg font-extrabold text-[#1A2744]">
                  {slide.title}
                </h3>
                <p className="mt-0.5 font-mono text-xs text-slate-400">
                  {slide.path}
                </p>
                <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
                  {slide.description}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Dots */}
            <div className="mt-4 flex items-center justify-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={cn(
                    "h-2 rounded-full transition-all",
                    i === active
                      ? "w-6 bg-[#FFDC33]"
                      : "w-2 bg-slate-300/50 hover:bg-slate-300"
                  )}
                />
              ))}
            </div>
          </div>

          {/* Browser mockup */}
          <BrowserChrome urlBar={slide.urlBar} color={slide.color}>
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
              >
                <Mockup />
              </motion.div>
            </AnimatePresence>
          </BrowserChrome>

          {/* Navigation arrows */}
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="absolute -left-4 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-amber-200/60 bg-white shadow-md shadow-amber-100/40 transition-all hover:scale-105 hover:shadow-lg sm:-left-5"
          >
            <ChevronLeft className="h-4 w-4 text-[#1A2744]" />
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="absolute -right-4 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-amber-200/60 bg-white shadow-md shadow-amber-100/40 transition-all hover:scale-105 hover:shadow-lg sm:-right-5"
          >
            <ChevronRight className="h-4 w-4 text-[#1A2744]" />
          </button>
        </div>
      </BwFadeUp>
    </BwSectionWrapper>
  );
}
