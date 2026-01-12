"use client";

import Link from "next/link";
import { LayoutDashboard, Menu, UserRound } from "lucide-react";

import { jobsConfig } from "@/config/jobs";
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

interface JobsHeaderClientProps {
  isLoggedIn: boolean;
  primaryNav: { href: string; label: string }[];
}

export function JobsHeaderClient({ isLoggedIn, primaryNav }: JobsHeaderClientProps) {
  return (
    <>
      {/* Desktop buttons */}
      <div className="hidden items-center gap-3 md:flex">
        <div className="h-5 w-px bg-border" />
        <span className="text-sm text-muted-foreground">Employers:</span>
        <Button
          asChild
          size="sm"
          className="rounded-full border border-emerald-600 bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Link href="/employers/post">Post a Job</Link>
        </Button>
        {isLoggedIn ? (
          <Button asChild variant="outline" size="sm" className="rounded-full px-4 text-sm font-medium">
            <Link href="/dashboard/jobs" className="gap-2">
              <LayoutDashboard className="h-4 w-4" aria-hidden />
              Dashboard
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="rounded-full px-4 text-sm font-medium">
            <Link href="/auth/sign-in" className="gap-2">
              <UserRound className="h-4 w-4" aria-hidden />
              Sign In
            </Link>
          </Button>
        )}
      </div>

      {/* Mobile Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="h-10 w-10 rounded-lg border-border/60 p-0 md:hidden [&_svg]:size-6" aria-label="Toggle navigation">
            <Menu aria-hidden />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72 sm:w-80">
          <SheetHeader>
            <SheetTitle>{jobsConfig.name}</SheetTitle>
            <SheetDescription>{jobsConfig.tagline}</SheetDescription>
          </SheetHeader>
          <div className="mt-6 flex flex-col gap-4 text-base">
            {primaryNav.map((item) => (
              <SheetClose asChild key={item.href}>
                <Button
                  asChild
                  variant="ghost"
                  className="justify-start text-base font-medium"
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              </SheetClose>
            ))}
          </div>
          <div className="mt-8 border-t pt-6">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">For Employers</span>
            <div className="mt-3 flex flex-col gap-2">
              <SheetClose asChild>
                <Button
                  asChild
                  className="rounded-full border border-emerald-600 bg-emerald-600 text-base font-medium text-white hover:bg-emerald-700"
                >
                  <Link href="/employers/post">Post a Job</Link>
                </Button>
              </SheetClose>
              {isLoggedIn ? (
                <SheetClose asChild>
                  <Button asChild variant="outline" className="rounded-full text-base font-medium">
                    <Link href="/dashboard/jobs" className="gap-2">
                      <LayoutDashboard className="h-4 w-4" aria-hidden />
                      Dashboard
                    </Link>
                  </Button>
                </SheetClose>
              ) : (
                <SheetClose asChild>
                  <Button asChild variant="outline" className="rounded-full text-base font-medium">
                    <Link href="/auth/sign-in" className="gap-2">
                      <UserRound className="h-4 w-4" aria-hidden />
                      Sign In
                    </Link>
                  </Button>
                </SheetClose>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
