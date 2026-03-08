"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { BehaviorWorkLogo } from "@/components/brand/behaviorwork-logo";

const companyLinks = [
  { href: "https://www.findabatherapy.org", label: "FindABATherapy" },
  { href: "mailto:support@goodaba.com", label: "Contact" },
] as const;

const legalLinks = [
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/terms", label: "Terms" },
] as const;

export function BehaviorWorkFooter() {
  const [hostname, setHostname] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  const isGoodabaAliasPath =
    pathname === "/goodaba" ||
    pathname === "/goodaba/pricing" ||
    pathname === "/goodaba-internal" ||
    pathname === "/goodaba-internal/pricing" ||
    pathname === "/_goodaba" ||
    pathname === "/_goodaba/pricing";
  const isLocalGoodabaPricing =
    (hostname.includes("localhost") || hostname.includes("127.0.0.1")) &&
    pathname === "/pricing";
  const isLocalGoodaba = isGoodabaAliasPath || isLocalGoodabaPricing;

  const homeHref = isLocalGoodaba ? "/goodaba" : "/";
  const pricingHref = isLocalGoodaba ? "/goodaba/pricing" : "/pricing";
  const productLinks = [
    { href: `${homeHref}#lifecycle`, label: "Platform" },
    { href: pricingHref, label: "Pricing" },
    { href: "/jobs", label: "Jobs" },
  ] as const;

  return (
    <footer className="bg-[#1A2744]">
      <div className="mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
        <div className="grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4 lg:py-16">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center">
              <BehaviorWorkLogo size="md" />
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-400">
              The growth platform for ABA agencies. From first inquiry to active
              services and hiring.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Product
            </p>
            <ul className="mt-3 space-y-2">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 transition-colors hover:text-[#FFDC33]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Company
            </p>
            <ul className="mt-3 space-y-2">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 transition-colors hover:text-[#FFDC33]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Legal
            </p>
            <ul className="mt-3 space-y-2">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 transition-colors hover:text-[#FFDC33]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 py-6">
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} GoodABA. All rights
              reserved.
            </p>
            <p className="text-xs text-slate-600">
              FindABATherapy by GoodABA
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
