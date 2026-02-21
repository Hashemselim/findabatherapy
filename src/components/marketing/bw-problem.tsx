import { BwFadeUp } from "@/components/marketing/bw-fade-up";
import { BwSectionWrapper } from "@/components/marketing/bw-section-wrapper";

export function BwProblem() {
  return (
    <BwSectionWrapper background="white" narrow>
      <BwFadeUp>
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#0F2B5B] sm:text-4xl lg:text-5xl">
            Every new client is worth{" "}
            <span className="text-teal-600">$60,000+</span> a year.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
            But most ABA agencies lose leads to slow follow-ups, paper intake
            forms, and scattered spreadsheets. Families move on. Revenue walks
            out the door.
          </p>

          <p className="mt-6 text-lg font-semibold text-[#0F2B5B]">
            BehaviorWork makes sure that doesn&apos;t happen.
          </p>
        </div>
      </BwFadeUp>
    </BwSectionWrapper>
  );
}
