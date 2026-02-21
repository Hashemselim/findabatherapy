"use client";

import Link from "next/link";

const productLinks = [
  { href: "/behaviorwork#lifecycle", label: "Platform" },
  { href: "/behaviorwork/get-started", label: "Pricing" },
  { href: "/behaviorwork#faq", label: "FAQ" },
] as const;

const companyLinks = [
  { href: "/about", label: "About" },
  { href: "mailto:support@behaviorwork.com", label: "Contact" },
] as const;

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
] as const;

export function BehaviorWorkFooter() {
  return (
    <footer className="bg-slate-900">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:py-16">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/10 text-[10px] font-bold text-white">
                BW
              </span>
              <span className="text-sm font-semibold text-white">
                BehaviorWork
              </span>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
              The growth engine for ABA agencies. From first inquiry to active
              services.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Product
            </p>
            <ul className="mt-3 space-y-2">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Company
            </p>
            <ul className="mt-3 space-y-2">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Legal
            </p>
            <ul className="mt-3 space-y-2">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 py-6">
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} BehaviorWork. All rights
              reserved.
            </p>
            <p className="text-xs text-slate-600">
              Part of the FindABA family
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
