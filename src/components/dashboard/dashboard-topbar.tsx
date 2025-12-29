"use client";

import Link from "next/link";
import Image from "next/image";
import { Bell, Menu } from "lucide-react";

import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { DashboardMobileNav } from "./dashboard-mobile-nav";

interface DashboardTopbarProps {
  isOnboardingComplete: boolean;
}

export function DashboardTopbar({ isOnboardingComplete }: DashboardTopbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Toggle navigation">
                <Menu className="h-5 w-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 sm:w-80">
              <SheetHeader>
                <SheetTitle>Dashboard</SheetTitle>
                <SheetDescription>Navigate your provider dashboard</SheetDescription>
              </SheetHeader>
              <DashboardMobileNav isOnboardingComplete={isOnboardingComplete} />
            </SheetContent>
          </Sheet>
          <Link href="/" className="flex items-center">
            <Image
              src="/logo-full.png"
              alt={siteConfig.name}
              width={540}
              height={55}
              className="h-7 w-auto sm:h-8"
              priority
            />
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" aria-label="Notifications">
            <Bell className="h-5 w-5" aria-hidden />
          </Button>
        </div>
      </div>
    </header>
  );
}
