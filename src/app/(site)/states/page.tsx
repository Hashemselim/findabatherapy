import Link from "next/link";

import { US_STATES } from "@/lib/data/us-states";

export default function StatesIndexPage() {
  return (
    <div className="container px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold">Browse ABA therapy by state</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Every state page is SEO-optimized with instant filters for service type, insurances, and agency attributes. Featured listings pin to the top automatically.
      </p>
      <div className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {US_STATES.map((state) => (
          <Link
            key={state.value}
            href={`/${state.value}`}
            className="rounded-2xl border border-border px-4 py-3 transition hover:border-primary hover:text-primary"
          >
            {state.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
