import { Shield, Puzzle, Clock, CheckCircle } from "lucide-react";

import { BwFadeUp } from "@/components/marketing/bw-fade-up";

const trustItems = [
  { icon: Shield, label: "HIPAA Compliant" },
  { icon: Puzzle, label: "Built for ABA" },
  { icon: Clock, label: "Setup in Minutes" },
  { icon: CheckCircle, label: "Cancel Anytime" },
] as const;

export function BwTrustBar() {
  return (
    <section className="border-y border-slate-100 bg-slate-50 py-5">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <BwFadeUp>
          <div className="grid grid-cols-2 gap-4 sm:flex sm:items-center sm:justify-center sm:gap-0 sm:divide-x sm:divide-slate-200">
            {trustItems.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center justify-center gap-2 sm:px-8"
              >
                <Icon className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-medium tracking-wide text-slate-500 sm:text-sm">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </BwFadeUp>
      </div>
    </section>
  );
}
