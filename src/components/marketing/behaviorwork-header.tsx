"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { BehaviorWorkLogo } from "@/components/brand/behaviorwork-logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { trackBehaviorWorkCtaClick } from "@/lib/posthog/events";
import { cn } from "@/lib/utils";

export function BehaviorWorkHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [hostname, setHostname] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll(); // check on mount
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
  const navItems = [
    { href: `${homeHref}#lifecycle`, label: "Platform" },
    { href: pricingHref, label: "Pricing" },
    { href: "/jobs", label: "Jobs" },
  ] as const;

  const trackHeaderCta = () => {
    trackBehaviorWorkCtaClick({
      section: "header",
      ctaLabel: "Start Free",
      destination: pricingHref,
    });
  };

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-amber-200/60 bg-[#FFFBF0] shadow-xs shadow-amber-100/40 sm:bg-[#FFFBF0]/95 sm:backdrop-blur-xl sm:supports-backdrop-filter:bg-[#FFFBF0]/85"
          : "border-b border-transparent bg-[#FFFBF0]"
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href={homeHref}
          className="group flex min-w-0 items-center lg:flex-none"
          aria-label="GoodABA home"
        >
          <span className="sm:hidden">
            <BehaviorWorkLogo size="md" />
          </span>
          <span className="hidden sm:inline-flex">
            <BehaviorWorkLogo size="lg" />
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="relative text-sm font-medium text-slate-500 transition-colors hover:text-[#1A2744] after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-[#FFDC33] after:transition-all hover:after:w-full"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/auth/sign-in"
            className="text-sm font-medium text-slate-500 transition-colors hover:text-[#1A2744]"
          >
            Log In
          </Link>
          <Link
            href={pricingHref}
            onClick={trackHeaderCta}
            className="inline-flex h-9 items-center justify-center rounded-full bg-[#FFDC33] px-5 text-sm font-bold text-[#1A2744] shadow-xs shadow-amber-200/40 transition-all hover:bg-[#F5CF1B] hover:shadow-md hover:shadow-amber-200/50 active:scale-[0.97]"
          >
            Start Free
          </Link>
        </div>

        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full text-[#1A2744] hover:bg-amber-50 lg:hidden"
              aria-label="Toggle navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[min(20rem,calc(100vw-1rem))] border-amber-100 bg-[#FFFBF0] p-0 sm:w-80"
          >
            <SheetHeader className="gap-3 border-b border-amber-100 px-5 pb-4 pt-5 pr-14">
              <SheetTitle className="leading-none">
                <BehaviorWorkLogo size="md" />
              </SheetTitle>
              <SheetDescription className="max-w-[14rem] text-base leading-6 text-slate-500">
                The growth platform for ABA agencies.
              </SheetDescription>
            </SheetHeader>
            <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
              <div className="space-y-1.5">
                {navItems.map((item) => (
                  <SheetClose asChild key={item.label}>
                    <Link
                      href={item.href}
                      className="flex min-h-11 items-center rounded-2xl px-3.5 py-3 text-base font-medium text-slate-600 transition-colors hover:bg-amber-50 hover:text-[#1A2744]"
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
              </div>
              <div className="mt-auto border-t border-amber-100 pt-5">
                <SheetClose asChild>
                  <Link
                    href="/auth/sign-in"
                    className="flex min-h-11 items-center rounded-2xl px-3.5 py-3 text-base font-medium text-slate-500 transition-colors hover:bg-amber-50 hover:text-[#1A2744]"
                  >
                    Log In
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href={pricingHref}
                    onClick={trackHeaderCta}
                    className="mt-3 flex h-12 items-center justify-center rounded-full bg-[#FFDC33] px-5 text-base font-bold text-[#1A2744] shadow-xs shadow-amber-200/40 transition-all hover:bg-[#F5CF1B]"
                  >
                    Start Free
                  </Link>
                </SheetClose>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
