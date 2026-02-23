"use client";

import { useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/behaviorwork#lifecycle", label: "Platform" },
  { href: "/behaviorwork/get-started", label: "Pricing" },
  { href: "/behaviorwork#faq", label: "FAQ" },
] as const;

export function BehaviorWorkHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll(); // check on mount
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const trackHeaderCta = () => {
    trackBehaviorWorkCtaClick({
      section: "header",
      ctaLabel: "Start Growing",
      destination: "/behaviorwork/get-started",
    });
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-amber-200/60 bg-[#FFFBF0]/95 shadow-sm shadow-amber-100/40 backdrop-blur-xl supports-[backdrop-filter]:bg-[#FFFBF0]/85"
          : "border-b border-transparent bg-[#FFFBF0]/80 backdrop-blur-md"
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/behaviorwork"
          className="group flex items-center"
          aria-label="BehaviorWork home"
        >
          <span className="relative inline-block text-3xl tracking-[-0.08em] text-[#5788FF]">
            <span className="relative z-10">
              <span className="font-light">Behavior</span>
              <span className="font-extrabold">Work</span>
            </span>
            <span className="absolute bottom-[3px] left-0 -right-3 z-0 h-[4px] rounded-full bg-[#FFDC33]/50" />
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
            href="/behaviorwork/get-started"
            onClick={trackHeaderCta}
            className="inline-flex h-9 items-center justify-center rounded-full bg-[#FFDC33] px-5 text-sm font-bold text-[#1A2744] shadow-sm shadow-amber-200/40 transition-all hover:bg-[#F5CF1B] hover:shadow-md hover:shadow-amber-200/50 active:scale-[0.97]"
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
              className="h-9 w-9 text-[#1A2744] hover:bg-amber-50 lg:hidden"
              aria-label="Toggle navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-72 border-amber-100 bg-[#FFFBF0] sm:w-80"
          >
            <SheetHeader>
              <SheetTitle className="tracking-[-0.08em] text-[#5788FF]">
                <span className="relative inline-block">
                  <span className="relative z-10">
                    <span className="font-light">Behavior</span>
                    <span className="font-extrabold">Work</span>
                  </span>
                  <span className="absolute bottom-[3px] left-0 -right-3 z-0 h-[4px] rounded-full bg-[#FFDC33]/50" />
                </span>
              </SheetTitle>
              <SheetDescription>
                The growth engine for ABA agencies.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-1">
              {navItems.map((item) => (
                <SheetClose asChild key={item.label}>
                  <Link
                    href={item.href}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-amber-50 hover:text-[#1A2744]"
                  >
                    {item.label}
                  </Link>
                </SheetClose>
              ))}
              <div className="mt-3 border-t border-amber-100 pt-3">
                <SheetClose asChild>
                  <Link
                    href="/auth/sign-in"
                    className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-amber-50 hover:text-[#1A2744]"
                  >
                    Log In
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href="/behaviorwork/get-started"
                    onClick={trackHeaderCta}
                    className="mt-1 flex h-10 items-center justify-center rounded-full bg-[#FFDC33] text-sm font-bold text-[#1A2744] shadow-sm shadow-amber-200/40 transition-all hover:bg-[#F5CF1B]"
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
