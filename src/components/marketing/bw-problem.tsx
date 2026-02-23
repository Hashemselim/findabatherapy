"use client";

import { BwMotion } from "@/components/marketing/bw-motion";
import { useAnimatedCounter } from "@/hooks/use-animated-counter";

export function BwProblem() {
  const counter = useAnimatedCounter({
    end: 60000,
    prefix: "$",
    suffix: "+",
    duration: 2000,
  });

  return (
    <section className="relative overflow-hidden bg-[#1A2744] py-24 lg:py-32">
      {/* Subtle glow accents */}
      <div className="pointer-events-none absolute -left-20 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-[#FFDC33]/6 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 top-1/4 h-56 w-56 rounded-full bg-[#5788FF]/6 blur-3xl" />
      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
        <BwMotion variant="fade-up">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Every new client is worth{" "}
              <span className="relative inline-block">
                <span
                  ref={counter.ref as React.RefObject<HTMLSpanElement>}
                  className="relative z-10 text-[#FFDC33]"
                >
                  {counter.display}
                </span>
                <span className="absolute -bottom-1 left-0 right-0 z-0 h-3 rounded-full bg-[#FFDC33]/20" />
              </span>{" "}
              a year.
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
              But most ABA agencies lose leads to slow follow-ups, paper intake
              forms, and scattered spreadsheets. Families move on. Revenue walks
              out the door.
            </p>

            <BwMotion variant="scale-in" delay={0.2}>
              <div className="mx-auto mt-12 max-w-xl">
                <p className="text-center text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  <span className="relative inline-block">
                    <span className="relative z-10 text-[#FFDC33]">BehaviorWork</span>
                    <span className="absolute -bottom-0.5 left-0 right-0 z-0 h-2.5 rounded-full bg-[#FFDC33]/20" />
                  </span>{" "}
                  captures that revenue for you.
                </p>
                <p className="mx-auto mt-4 max-w-md text-center text-base leading-relaxed text-slate-400">
                  Branded intake forms. Automated follow-ups. A client
                  pipeline that shows every lead at a glance.
                </p>
              </div>
            </BwMotion>
          </div>
        </BwMotion>
      </div>
    </section>
  );
}
