"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  Mail,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getOnboardingData } from "@/lib/actions/onboarding";
import {
  getProviderBrochurePath,
  getProviderContactPath,
  getProviderIntakePath,
  getProviderResourcesPath,
  getProviderWebsitePath,
} from "@/lib/utils/public-paths";

const previewCards = [
  {
    title: "Branded Website",
    description: "Your full agency website with custom branding, sections, and content.",
    href: (slug: string) => getProviderWebsitePath(slug),
    icon: Globe,
    color: { bg: "bg-violet-50", text: "text-violet-600" },
    status: "Pro feature",
    statusColor: "text-slate-600",
  },
  {
    title: "Agency Digital Brochure",
    description: "A branded page with your story, services, and identity.",
    href: (slug: string) => getProviderBrochurePath(slug),
    icon: BookOpen,
    color: { bg: "bg-sky-50", text: "text-sky-600" },
    status: "Pro feature",
    statusColor: "text-slate-600",
  },
  {
    title: "FindABATherapy Listing",
    description: "Your public profile for families searching for ABA care.",
    href: (slug: string) => `/provider/${slug}`,
    icon: Sparkles,
    color: { bg: "bg-blue-50", text: "text-blue-600" },
    status: "Live on Free & Pro",
    statusColor: "text-emerald-600",
  },
  {
    title: "Contact Page",
    description: "A branded contact experience for families to reach out.",
    href: (slug: string) => getProviderContactPath(slug),
    icon: Mail,
    color: { bg: "bg-rose-50", text: "text-rose-600" },
    status: "Pro feature",
    statusColor: "text-slate-600",
  },
  {
    title: "Intake Form",
    description: "Branded intake flow that keeps inquiries organized.",
    href: (slug: string) => getProviderIntakePath(slug),
    icon: FileText,
    color: { bg: "bg-amber-50", text: "text-amber-600" },
    status: "Pro feature",
    statusColor: "text-slate-600",
  },
  {
    title: "Resources Page",
    description: "Share parent resources and educational content.",
    href: (slug: string) => getProviderResourcesPath(slug),
    icon: Sparkles,
    color: { bg: "bg-emerald-50", text: "text-emerald-600" },
    status: "Pro feature",
    statusColor: "text-slate-600",
  },
  {
    title: "Careers Page",
    description: "A hiring destination that ties into GoodABA Jobs.",
    href: (slug: string) => getProviderWebsitePath(slug, "/careers"),
    icon: Briefcase,
    color: { bg: "bg-indigo-50", text: "text-indigo-600" },
    status: "Pro feature",
    statusColor: "text-slate-600",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] as const } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

export default function OnboardingBrandedPreviewPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [agencyName, setAgencyName] = useState("Your agency");
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const result = await getOnboardingData();
      if (result.success && result.data) {
        setAgencyName(result.data.profile?.agencyName || "Your agency");
        setSlug(result.data.listing?.slug || null);
      }
      setIsLoading(false);
    }

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#1A2744]" />
          <p className="text-sm text-slate-400">Preparing your preview...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* Page header */}
      <motion.div variants={fadeUp} className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-emerald-700">Everything is coming together</span>
        </div>
        <p className="mb-2 text-sm font-medium text-slate-400">Step 5 of 7</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#1A2744] sm:text-4xl">
          Your branded pages are taking shape
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-500">
          {agencyName} now has a branded presence across the platform. Preview each experience below.
        </p>
      </motion.div>

      {/* Preview cards grid */}
      <motion.div
        variants={stagger}
        className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {previewCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              variants={fadeUp}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
              className="group flex flex-col rounded-2xl border border-amber-200/40 bg-white p-5 transition-colors hover:border-amber-200/70"
            >
              <div className="flex items-start gap-3.5">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.color.bg}`}>
                  <Icon className={`h-5 w-5 ${card.color.text}`} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-[#1A2744]">{card.title}</h3>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                    {card.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className={`text-xs font-medium ${card.statusColor}`}>
                  {card.status}
                </span>
                {slug && (
                  <a
                    href={card.href(slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#1A2744] opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
                  >
                    Preview
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Navigation footer */}
      <motion.div
        variants={fadeUp}
        className="flex flex-col gap-3 rounded-2xl border border-amber-200/40 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4"
      >
        <p className="text-xs text-slate-500 sm:text-sm sm:text-slate-600">
          You can preview live links from your dashboard anytime.
        </p>

        <Button
          type="button"
          size="lg"
          className="h-11 w-full shrink-0 rounded-full bg-[#0866FF] px-7 font-semibold text-white shadow-md shadow-[#0866FF]/25 hover:bg-[#0866FF]/92 sm:ml-auto sm:w-auto"
          onClick={() => router.push("/dashboard/onboarding/dashboard")}
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
