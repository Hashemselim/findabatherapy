import Link from "next/link";
import { Menu, Sparkles, UserRound } from "lucide-react";

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

const primaryNav = [
  { href: "/search", label: "Search" },
  { href: "/learn", label: "Learn" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2 text-lg font-medium md:text-xl">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden />
            <span>{siteConfig.name}</span>
          </Link>
          <nav className="hidden items-center gap-6 text-base font-medium text-muted-foreground md:flex">
            {primaryNav.map((item) => (
              <Link key={item.href} href={item.href} className="transition hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" className="text-base font-medium text-muted-foreground hover:text-foreground">
            <Link href="/auth/sign-in" className="gap-2">
              <UserRound className="h-4 w-4" aria-hidden />
              Sign in
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="rounded-full border border-[#FEE720] bg-[#FEE720] px-4 text-base font-medium text-[#333333] hover:bg-[#f5d900]"
          >
            <Link href="/get-listed">List your practice</Link>
          </Button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Toggle navigation">
              <Menu className="h-5 w-5" aria-hidden />
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
            <div className="mt-8 flex flex-col gap-3 text-base">
              <Button
                asChild
                className="rounded-full border border-[#FEE720] bg-[#FEE720] text-base font-medium text-[#333333] hover:bg-[#f5d900]"
              >
                <Link href="/get-listed">List your practice</Link>
              </Button>
              <Button asChild variant="ghost" className="text-base font-medium">
                <Link href="/auth/sign-in" className="gap-2">
                  <UserRound className="h-4 w-4" aria-hidden />
                  Sign in
                </Link>
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
