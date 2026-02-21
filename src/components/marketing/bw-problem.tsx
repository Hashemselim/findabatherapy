import { BwFadeUp } from "@/components/marketing/bw-fade-up";
import { BwSectionWrapper } from "@/components/marketing/bw-section-wrapper";

export function BwProblem() {
  return (
    <BwSectionWrapper background="cream" narrow>
      <BwFadeUp>
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#1A2744] sm:text-4xl lg:text-5xl">
            Every new client is worth{" "}
            <span className="relative inline-block">
              <span className="relative z-10 text-[#1A2744]">$60,000+</span>
              <span className="absolute -bottom-1 left-0 right-0 z-0 h-3 rounded-full bg-[#FFDC33]/40" />
            </span>
            {" "}a year.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-500">
            But most ABA agencies lose leads to slow follow-ups, paper intake
            forms, and scattered spreadsheets. Families move on. Revenue walks
            out the door.
          </p>

          <div className="mx-auto mt-8 flex max-w-md items-center gap-3 rounded-2xl border border-amber-200/60 bg-white/80 px-6 py-4 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFDC33]/20">
              <svg className="h-5 w-5 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-base font-bold text-[#1A2744]">
              BehaviorWork makes sure that doesn&apos;t happen.
            </p>
          </div>
        </div>
      </BwFadeUp>
    </BwSectionWrapper>
  );
}
