"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useWebsite } from "./website-provider";

function getLighterShade(hexColor: string, opacity: number) {
  return `${hexColor}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

export function WebsiteNav() {
  const { provider, brandColor } = useWebsite();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const basePath = `/site/${provider.slug}`;
  const { websiteSettings } = provider;

  // On inner pages (not home), always use the "scrolled" (solid) nav style
  // to avoid white text on white background
  const isHomePage = pathname === basePath || pathname === `${basePath}/`;
  const showSolidNav = isScrolled || !isHomePage;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const initials = provider.profile.agencyName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const navLinks = [
    { label: "Home", href: basePath },
    { label: "Services", href: `${basePath}#services` },
    ...(websiteSettings.show_careers && provider.jobCount > 0
      ? [{ label: "Careers", href: `${basePath}/careers` }]
      : []),
    ...(websiteSettings.show_resources
      ? [{ label: "Resources", href: `${basePath}/resources` }]
      : []),
  ];

  return (
    <>
      <header
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-500 ${
          showSolidNav
            ? "bg-white/95 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] backdrop-blur-xl"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-18 sm:px-6 lg:px-8">
          {/* Logo + Name */}
          <Link href={basePath} className="flex items-center gap-3">
            <Avatar
              className="h-9 w-9 border-2 shadow-sm sm:h-10 sm:w-10"
              style={{ borderColor: getLighterShade(brandColor, 0.3) }}
            >
              {provider.logoUrl ? (
                <AvatarImage
                  src={provider.logoUrl}
                  alt={provider.profile.agencyName}
                />
              ) : null}
              <AvatarFallback
                className="text-xs font-bold sm:text-sm"
                style={{
                  backgroundColor: getLighterShade(brandColor, 0.12),
                  color: brandColor,
                }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <span
              className={`text-base font-semibold tracking-tight transition-colors duration-300 sm:text-lg ${
                showSolidNav ? "text-gray-900" : "text-white"
              }`}
            >
              {provider.profile.agencyName}
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 hover:bg-black/5 ${
                  showSolidNav
                    ? "text-gray-600 hover:text-gray-900"
                    : "text-white/80 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Button
              asChild
              size="sm"
              className="ml-3 gap-1.5 rounded-full px-5 shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
              style={{
                backgroundColor: showSolidNav ? brandColor : "white",
                color: showSolidNav ? "white" : brandColor,
              }}
            >
              <Link href={`${basePath}/contact`}>
                {websiteSettings.hero_cta_text || "Get Started"}
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className={`rounded-xl p-2 transition-colors md:hidden ${
              showSolidNav
                ? "text-gray-700 hover:bg-gray-100"
                : "text-white hover:bg-white/10"
            }`}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="border-t border-gray-100 bg-white px-4 pb-6 pt-2 shadow-lg md:hidden">
            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-3 border-t border-gray-100 pt-3">
                <Button
                  asChild
                  className="w-full gap-1.5 rounded-xl shadow-md"
                  style={{ backgroundColor: brandColor, color: "white" }}
                >
                  <Link
                    href={`${basePath}/contact`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {websiteSettings.hero_cta_text || "Get Started"}
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Spacer to push content below fixed nav */}
      <div className="h-16 sm:h-18" />
    </>
  );
}
