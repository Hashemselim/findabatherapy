"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  HeartHandshake,
  Mail,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { updateProfileIntent } from "@/lib/actions/onboarding";

const toolGroups = [
  {
    title: "Client Growth",
    description: "Get found by families with a polished public presence.",
    icon: HeartHandshake,
    color: "#059669",
    bgColor: "#ECFDF5",
  },
  {
    title: "Operations",
    description: "Run intake, follow-up, and workflows from one dashboard.",
    icon: Users,
    color: "#2563EB",
    bgColor: "#EFF6FF",
  },
  {
    title: "Communications",
    description: "Keep your outreach and follow-up on brand.",
    icon: Mail,
    color: "#9333EA",
    bgColor: "#FAF5FF",
  },
  {
    title: "Hiring",
    description: "Promote open roles with your employer brand.",
    icon: Briefcase,
    color: "#EA580C",
    bgColor: "#FFF7ED",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.3 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] as const } },
};

export default function OnboardingWelcomePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleContinue() {
    startTransition(async () => {
      await updateProfileIntent("both");
      router.push("/dashboard/onboarding/details");
    });
  }

  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col items-center justify-center sm:min-h-[calc(100dvh-80px)]">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-3xl"
      >
        {/* Hero section */}
        <motion.div variants={item} className="mb-12 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-1.5 shadow-sm shadow-xs">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium tracking-wide text-muted-foreground">
              Ready to set up your agency
            </span>
          </div>

          <h1 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-[3.5rem] md:leading-[1.1]">
            Welcome — let&apos;s{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-primary">unlock</span>
              <span className="absolute -bottom-1 left-0 right-0 z-0 h-3 rounded-full bg-primary/30 sm:h-4" />
            </span>{" "}
            your agency&apos;s full potential.
          </h1>

          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
            Your membership brings together growth, operations, and hiring in one premium system.
          </p>
        </motion.div>

        {/* Tool group cards */}
        <motion.div
          variants={item}
          className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {toolGroups.map((group) => {
            const Icon = group.icon;
            return (
              <motion.div
                key={group.title}
                whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.06)" }}
                transition={{ duration: 0.2 }}
                className="group flex items-start gap-4 rounded-2xl border border-border/60 bg-muted/50 p-5 transition-colors hover:border-border"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: group.bgColor, color: group.color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">
                    {group.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {group.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Included platforms */}
        <motion.div
          variants={item}
          className="mb-10 flex flex-col gap-2 sm:flex-row"
        >
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3">
            <BarChart3 className="h-4 w-4 shrink-0 text-blue-600" />
            <div>
              <span className="text-sm font-medium text-blue-900">FindABATherapy</span>
              <span className="ml-1.5 text-sm text-blue-600/70">included</span>
            </div>
          </div>
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
            <Briefcase className="h-4 w-4 shrink-0 text-emerald-600" />
            <div>
              <span className="text-sm font-medium text-emerald-900">GoodABA Jobs</span>
              <span className="ml-1.5 text-sm text-emerald-600/70">included</span>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div variants={item} className="flex flex-col items-center gap-4 text-center">
          <Button
            size="lg"
            className="group relative h-12 overflow-hidden rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30"
            disabled={isPending}
            onClick={handleContinue}
          >
            {/* Shimmer effect */}
            <span className="absolute inset-0 -translate-x-full animate-[shimmer_3s_ease-in-out_infinite] bg-linear-to-r from-transparent via-primary/10 to-transparent" />
            <span className="relative flex items-center gap-2">
              {isPending ? "Starting..." : "Begin Setup"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Button>
          <p className="text-sm text-muted-foreground">
            Takes about 5 minutes. You&apos;ll preview everything before going live.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
