"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

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

const navItems = [
  { href: "/behaviorwork#lifecycle", label: "Platform" },
  { href: "/behaviorwork/get-started", label: "Pricing" },
  { href: "/behaviorwork#faq", label: "FAQ" },
] as const;

export function BehaviorWorkHeader() {
  const trackHeaderCta = () => {
    trackBehaviorWorkCtaClick({
      section: "header",
      ctaLabel: "Start Growing",
      destination: "/behaviorwork/get-started",
    });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/behaviorwork"
          className="flex items-center gap-2.5"
          aria-label="BehaviorWork home"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F2B5B] text-[11px] font-bold text-white">
            BW
          </span>
          <span className="text-base font-semibold text-[#0F2B5B]">
            BehaviorWork
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/auth/sign-in"
            className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            Log In
          </Link>
          <Link
            href="/behaviorwork/get-started"
            onClick={trackHeaderCta}
            className="inline-flex h-9 items-center justify-center rounded-full bg-teal-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            Start Growing
          </Link>
        </div>

        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 lg:hidden"
              aria-label="Toggle navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 sm:w-80">
            <SheetHeader>
              <SheetTitle className="text-[#0F2B5B]">BehaviorWork</SheetTitle>
              <SheetDescription>
                The growth engine for ABA agencies.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-1">
              {navItems.map((item) => (
                <SheetClose asChild key={item.label}>
                  <Link
                    href={item.href}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    {item.label}
                  </Link>
                </SheetClose>
              ))}
              <div className="mt-3 border-t border-slate-100 pt-3">
                <SheetClose asChild>
                  <Link
                    href="/auth/sign-in"
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    Log In
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/behaviorwork/get-started"
                    onClick={trackHeaderCta}
                    className="mt-1 flex h-10 items-center justify-center rounded-full bg-teal-600 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
                  >
                    Start Growing
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
