import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Menu, UserRound } from "lucide-react";

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
import { getUser } from "@/lib/supabase/server";

const primaryNav = [
  { href: "/search", label: "Search" },
  { href: "/learn", label: "Learn" },
];

export async function SiteHeader() {
  const user = await getUser();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-10">
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
          <nav className="hidden items-center gap-6 text-base font-medium text-muted-foreground md:flex">
            {primaryNav.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <div className="h-5 w-px bg-border" />
          <span className="text-sm text-muted-foreground">Providers:</span>
          <Button
            asChild
            size="sm"
            className="rounded-full border border-[#5788FF] bg-[#5788FF] px-4 text-sm font-medium text-white hover:bg-[#88B0FF]"
          >
            <Link href="/get-listed">Get Listed</Link>
          </Button>
          {user ? (
            <Button asChild variant="outline" size="sm" className="rounded-full px-4 text-sm font-medium">
              <Link href="/dashboard" className="gap-2">
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

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-10 w-10 rounded-lg border-border/60 p-0 md:hidden [&_svg]:size-6" aria-label="Toggle navigation">
              <Menu aria-hidden />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 sm:w-80">
            <SheetHeader>
              <SheetTitle>{siteConfig.name}</SheetTitle>
              <SheetDescription>{siteConfig.tagline}</SheetDescription>
            </SheetHeader>
            <div className="mt-6 flex flex-col gap-4 text-base">
              {primaryNav.map((item) => (
                <Button
                  key={item.href}
                  asChild
                  variant="ghost"
                  className="justify-start text-base font-medium"
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              ))}
            </div>
            <div className="mt-8 border-t pt-6">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">For Providers</span>
              <div className="mt-3 flex flex-col gap-2">
                <Button
                  asChild
                  className="rounded-full border border-[#5788FF] bg-[#5788FF] text-base font-medium text-white hover:bg-[#88B0FF]"
                >
                  <Link href="/get-listed">Get Listed</Link>
                </Button>
                {user ? (
                  <Button asChild variant="outline" className="rounded-full text-base font-medium">
                    <Link href="/dashboard" className="gap-2">
                      <LayoutDashboard className="h-4 w-4" aria-hidden />
                      Dashboard
                    </Link>
                  </Button>
                ) : (
                  <Button asChild variant="outline" className="rounded-full text-base font-medium">
                    <Link href="/auth/sign-in" className="gap-2">
                      <UserRound className="h-4 w-4" aria-hidden />
                      Sign In
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
