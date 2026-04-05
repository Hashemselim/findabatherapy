import Link from "next/link";
import Image from "next/image";
import { ChevronRight, LayoutDashboard, Menu, UserRound } from "lucide-react";

import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getCurrentUser } from "@/lib/platform/auth/server";

const primaryNav = [
  { href: "/search", label: "Search" },
  { href: "/learn", label: "Learn" },
];

function SiteLogo() {
  /* eslint-disable-next-line @next/next/no-img-element */
  return <img src="/logo-full.png" alt={siteConfig.name} className="h-7 w-auto" />;
}

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/80">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/logo-full.png"
              alt={siteConfig.name}
              width={540}
              height={55}
              className="h-7 w-auto sm:h-8"
              priority
            />
          </Link>
          <nav className="hidden items-center gap-6 text-base font-medium text-muted-foreground lg:flex">
            {primaryNav.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="h-5 w-px bg-border" />
          <span className="text-sm text-muted-foreground">Providers:</span>
          <Button
            asChild
            size="sm"
            className="rounded-full border border-[#0866FF] bg-[#0866FF] px-4 text-sm font-medium text-white hover:bg-[#0866FF]"
          >
            <Link href="/get-listed">Get Listed</Link>
          </Button>
          {user ? (
            <Button asChild variant="outline" size="sm" className="rounded-full px-4 text-sm font-medium">
              <Link href="/dashboard/clients/pipeline" className="gap-2">
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

        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full lg:hidden"
              aria-label="Toggle navigation"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="w-[min(21.5rem,calc(100vw-1rem))] border-border/60 bg-background p-0 sm:w-80"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>{siteConfig.name}</SheetTitle>
            </SheetHeader>
            <div className="border-b border-border/60 px-6 pb-5 pt-6">
              <SiteLogo />
              <p className="mt-3 text-[15px] leading-6 text-muted-foreground">
                {siteConfig.tagline}
              </p>
            </div>

            <div className="flex flex-1 flex-col px-6 pb-6 pt-5">
              {/* Nav items */}
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-accent/30">
                {primaryNav.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className="flex min-h-14 items-center justify-between border-b border-border/60 px-5 py-4 text-[17px] font-semibold text-foreground transition-colors last:border-b-0 hover:bg-accent"
                    >
                      <span>{item.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                    </Link>
                  </SheetClose>
                ))}
              </div>

              {/* Provider CTAs */}
              <div className="mt-6 space-y-2.5 border-t border-border/60 pt-5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  For Providers
                </p>
                <SheetClose asChild>
                  <Link
                    href="/get-listed"
                    className="flex h-12 items-center justify-center rounded-full bg-[#0866FF] px-5 text-base font-bold text-white shadow-xs shadow-[#0866FF]/25 transition-all hover:bg-[#0866FF]/92"
                  >
                    Get Listed
                  </Link>
                </SheetClose>
                {user ? (
                  <SheetClose asChild>
                    <Link
                      href="/dashboard/clients/pipeline"
                      className="flex min-h-12 items-center gap-2 rounded-2xl border border-border/60 bg-accent/30 px-4 py-3.5 text-base font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <LayoutDashboard className="h-4 w-4" aria-hidden />
                      Dashboard
                    </Link>
                  </SheetClose>
                ) : (
                  <SheetClose asChild>
                    <Link
                      href="/auth/sign-in"
                      className="flex min-h-12 items-center gap-2 rounded-2xl border border-border/60 bg-accent/30 px-4 py-3.5 text-base font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <UserRound className="h-4 w-4" aria-hidden />
                      Sign In
                    </Link>
                  </SheetClose>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
