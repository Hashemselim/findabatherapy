"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Crown,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getPaymentStatus } from "@/lib/actions/billing";
import {
  finalizeOnboardingAfterPayment,
  finalizeOnboardingAsFree,
  getOnboardingData,
  updateProfilePlan,
} from "@/lib/actions/onboarding";
import { createCheckoutSession } from "@/lib/stripe/actions";

type BillingInterval = "month" | "year";

const proFeatures = [
  "Branded pages go fully live",
  "Lead, intake, client & task tools unlock",
  "Hiring & employer-brand on GoodABA Jobs",
  "Branded email sending & templates",
  "Full analytics & growth reporting",
  "Priority support & onboarding help",
];

const freeFeatures = [
  "FindABATherapy listing published",
  "Full dashboard in preview mode",
  "Branded page previews available",
  "Upgrade anytime from dashboard",
];

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] as const } },
};

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

export default function OnboardingPlanPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agencyName, setAgencyName] = useState("Your agency");
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro">("free");
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("month");
  const hasProcessedPayment = useRef(false);

  const paymentSuccess = searchParams.get("payment") === "success";
  const paymentCancelled = searchParams.get("payment") === "cancelled";

  useEffect(() => {
    async function loadData() {
      const [onboardingResult, paymentResult] = await Promise.all([
        getOnboardingData(),
        getPaymentStatus(),
      ]);

      if (onboardingResult.success && onboardingResult.data) {
        setAgencyName(onboardingResult.data.profile?.agencyName || "Your agency");
        setBillingInterval(
          onboardingResult.data.profile?.billingInterval === "year" ? "year" : "month"
        );
      }

      if (paymentResult.success && paymentResult.data) {
        setSelectedPlan(paymentResult.data.planTier);
      }

      setIsLoading(false);
    }

    loadData();
  }, []);

  useEffect(() => {
    if (!paymentSuccess || hasProcessedPayment.current) {
      return;
    }

    hasProcessedPayment.current = true;
    startTransition(async () => {
      const result = await finalizeOnboardingAfterPayment();
      if (!result.success) {
        setError(result.error);
        hasProcessedPayment.current = false;
        return;
      }

      router.replace("/dashboard/clients/pipeline?welcome=1");
    });
  }, [paymentSuccess, router]);

  function handleContinueFree() {
    setError(null);
    setSelectedPlan("free");
    startTransition(async () => {
      await updateProfilePlan("free");
      const result = await finalizeOnboardingAsFree();
      if (!result.success) {
        setError(result.error);
        return;
      }

      router.push("/dashboard/clients/pipeline?welcome=1");
    });
  }

  function handleUpgrade() {
    setError(null);
    setSelectedPlan("pro");
    startTransition(async () => {
      const planResult = await updateProfilePlan("pro");
      if (!planResult.success) {
        setError(planResult.error);
        return;
      }

      const checkoutResult = await createCheckoutSession("pro", billingInterval, "onboarding");
      if (!checkoutResult.success || !checkoutResult.data?.url) {
        setError(checkoutResult.success ? "Unable to start checkout." : checkoutResult.error);
        return;
      }

      window.location.href = checkoutResult.data.url;
    });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-[#1A2744]" />
          <p className="text-sm text-slate-400">Loading plan options...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* Page header */}
      <motion.div variants={fadeUp} className="mb-8 text-center">
        <p className="mb-2 text-sm font-medium text-slate-400">Step 7 of 7</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#1A2744] sm:text-4xl">
          Choose how {agencyName} goes live
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-base leading-relaxed text-slate-500">
          Free publishes your listing. Pro unlocks the full branded and operational experience.
        </p>
      </motion.div>

      {/* Alerts */}
      {paymentSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Payment received. Finalizing your Pro access now.
        </motion.div>
      )}
      {paymentCancelled && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700"
        >
          Checkout was canceled. Your setup is saved — continue on Free or try Pro again.
        </motion.div>
      )}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </motion.div>
      )}

      {/* Plan cards */}
      <div className="mx-auto grid max-w-4xl gap-4 lg:grid-cols-2">
        {/* Pro plan - featured */}
        <motion.div
          variants={fadeUp}
          className="relative overflow-hidden rounded-2xl border-2 border-[#1A2744] bg-white shadow-lg"
        >
          {/* Recommended badge */}
          <div className="absolute right-4 top-4">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#1A2744] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#FFCF40]">
              <Crown className="h-3 w-3" />
              Recommended
            </span>
          </div>

          <div className="p-6 pb-0">
            <h2 className="text-xl font-bold text-[#1A2744]">Pro</h2>
            <p className="mt-1 text-sm text-slate-600">
              The full branded and operational experience.
            </p>

            {/* Pricing */}
            <div className="mt-5">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-[#1A2744]">
                  ${billingInterval === "month" ? "79" : "47"}
                </span>
                <span className="text-base text-slate-600">/mo</span>
              </div>
              {billingInterval === "year" && (
                <p className="mt-1 text-sm text-emerald-600">
                  $564/yr — save $384
                </p>
              )}
            </div>

            {/* Billing toggle */}
            <div className="mt-4 inline-flex rounded-full border border-amber-200/60 bg-[#FFFBF0] p-0.5">
              <button
                type="button"
                onClick={() => setBillingInterval("month")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  billingInterval === "month"
                    ? "bg-[#1A2744] text-white shadow-xs"
                    : "text-slate-600 hover:text-[#1A2744]"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval("year")}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  billingInterval === "year"
                    ? "bg-[#1A2744] text-white shadow-xs"
                    : "text-slate-600 hover:text-[#1A2744]"
                }`}
              >
                Annual
              </button>
            </div>
          </div>

          <div className="p-6">
            <ul className="space-y-2.5">
              {proFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-[#1A2744]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2.5} />
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              className="mt-6 h-12 w-full rounded-full bg-[#0866FF] font-semibold text-white shadow-md shadow-[#0866FF]/25 hover:bg-[#0866FF]/92"
              disabled={isPending}
              onClick={handleUpgrade}
            >
              {isPending && selectedPlan === "pro" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting checkout
                </>
              ) : (
                <>
                  Activate Pro
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Free plan */}
        <motion.div
          variants={fadeUp}
          className="rounded-2xl border border-amber-200/60 bg-white"
        >
          <div className="p-6 pb-0">
            <h2 className="text-xl font-bold text-[#1A2744]">Free</h2>
            <p className="mt-1 text-sm text-slate-600">
              Your listing goes live. Explore the rest in preview.
            </p>

            <div className="mt-5">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-[#1A2744]">$0</span>
                <span className="text-base text-slate-600">/forever</span>
              </div>
              <p className="mt-1 text-sm text-slate-400">
                Upgrade anytime from your dashboard.
              </p>
            </div>
          </div>

          <div className="p-6">
            <ul className="space-y-2.5">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-500">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" strokeWidth={2.5} />
                  {feature}
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              className="mt-6 h-12 w-full rounded-full border-amber-200/60 font-semibold text-[#1A2744] hover:bg-[#FFFBF0]"
              disabled={isPending}
              onClick={handleContinueFree}
            >
              {isPending && selectedPlan === "free" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finalizing
                </>
              ) : (
                <>
                  Continue with Free
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
