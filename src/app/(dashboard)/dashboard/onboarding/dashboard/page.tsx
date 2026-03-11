"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  Mail,
  SquareCheckBig,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const dashboardCards = [
  {
    title: "Lead tracking",
    description: "See new inquiries, manage follow-up, and keep every opportunity visible.",
    icon: Users,
    color: { bg: "bg-blue-50", text: "text-blue-600" },
  },
  {
    title: "Client tracking",
    description: "View client records, notes, and the structure of your care workflow.",
    icon: Users,
    color: { bg: "bg-violet-50", text: "text-violet-600" },
  },
  {
    title: "Branded email",
    description: "Send polished outreach from one place with your agency identity.",
    icon: Mail,
    color: { bg: "bg-rose-50", text: "text-rose-600" },
  },
  {
    title: "Task management",
    description: "Stay on top of intake, follow-up, and operational work in one queue.",
    icon: SquareCheckBig,
    color: { bg: "bg-amber-50", text: "text-amber-600" },
  },
  {
    title: "Notifications",
    description: "Keep family follow-up and team activity visible from the dashboard.",
    icon: Bell,
    color: { bg: "bg-emerald-50", text: "text-emerald-600" },
  },
  {
    title: "Analytics & hiring",
    description: "Growth reporting and hiring tools from your GoodABA membership.",
    icon: BarChart3,
    color: { bg: "bg-indigo-50", text: "text-indigo-600" },
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

export default function OnboardingDashboardPreviewPage() {
  const router = useRouter();

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* Page header */}
      <motion.div variants={fadeUp} className="mb-8">
        <p className="mb-2 text-sm font-medium text-slate-400">Step 6 of 7</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#1A2744] sm:text-4xl">
          Your command center
        </h1>
        <p className="mt-2 max-w-2xl text-base leading-relaxed text-slate-500">
          Leads, clients, communication, tasks, notifications, and branded pages — all in one
          dashboard.
        </p>
      </motion.div>

      {/* Dashboard feature grid */}
      <motion.div
        variants={stagger}
        className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      >
        {dashboardCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              variants={fadeUp}
              whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.06)" }}
              transition={{ duration: 0.2 }}
              className="group rounded-2xl border border-amber-200/40 bg-white p-5 transition-colors hover:border-amber-200/70"
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
            </motion.div>
          );
        })}
      </motion.div>

      {/* GoodABA Jobs callout */}
      <motion.div
        variants={fadeUp}
        className="mb-8 flex items-center gap-4 rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-5"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
          <Briefcase className="h-5 w-5 text-emerald-700" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-emerald-900">GoodABA Jobs is included</h3>
          <p className="mt-0.5 text-sm text-emerald-700/80">
            Careers pages, job postings, applicants, and employer-brand tools live alongside your
            client growth tools.
          </p>
        </div>
      </motion.div>

      {/* Navigation footer */}
      <motion.div
        variants={fadeUp}
        className="flex flex-col gap-3 rounded-2xl border border-amber-200/40 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4"
      >
        <p className="text-xs text-slate-500 sm:text-sm sm:text-slate-600">
          Almost there — one more step.
        </p>

        <Button
          type="button"
          size="lg"
          className="h-11 w-full shrink-0 rounded-full bg-[#0866FF] px-7 font-semibold text-white shadow-md shadow-[#0866FF]/25 hover:bg-[#0866FF]/92 sm:ml-auto sm:w-auto"
          onClick={() => router.push("/dashboard/onboarding/plan")}
        >
          Choose your plan
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}
