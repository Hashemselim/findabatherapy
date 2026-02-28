"use client";

import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Globe,
  Heart,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useWebsite } from "./website-provider";

function getLighterShade(hexColor: string, opacity: number) {
  return `${hexColor}${Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")}`;
}

export function WebsiteFooter() {
  const { provider, brandColor } = useWebsite();
  const basePath = `/site/${provider.slug}`;

  const primaryLocation =
    provider.locations.find((l) => l.isPrimary) || provider.locations[0];

  const initials = provider.profile.agencyName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const quickLinks = [
    { label: "Home", href: basePath },
    { label: "Get Started", href: `${basePath}/contact` },
    ...(provider.websiteSettings.show_careers && provider.jobCount > 0
      ? [{ label: "Careers", href: `${basePath}/careers` }]
      : []),
    ...(provider.websiteSettings.show_resources
      ? [{ label: "Resources", href: `${basePath}/resources` }]
      : []),
  ];

  return (
    <footer className="relative overflow-hidden border-t border-gray-100 bg-gray-50">
      {/* Subtle brand accent line at top */}
      <div
        className="h-1"
        style={{
          background: `linear-gradient(90deg, ${brandColor}, ${getLighterShade(brandColor, 0.4)}, transparent)`,
        }}
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-[1fr_auto_1fr] sm:gap-12">
          {/* Brand Column */}
          <div>
            <div className="flex items-center gap-3">
              <Avatar
                className="h-11 w-11 border-2"
                style={{ borderColor: getLighterShade(brandColor, 0.2) }}
              >
                {provider.logoUrl ? (
                  <AvatarImage
                    src={provider.logoUrl}
                    alt={provider.profile.agencyName}
                  />
                ) : null}
                <AvatarFallback
                  className="text-sm font-bold"
                  style={{
                    backgroundColor: getLighterShade(brandColor, 0.1),
                    color: brandColor,
                  }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {provider.profile.agencyName}
                </h3>
                {primaryLocation && (
                  <p className="text-sm text-gray-500">
                    {primaryLocation.city}, {primaryLocation.state}
                  </p>
                )}
              </div>
            </div>
            {provider.summary && (
              <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-500">
                {provider.summary}
              </p>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold tracking-wide text-gray-900 uppercase">
              Quick Links
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-500 transition-colors hover:text-gray-900"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4 text-sm font-semibold tracking-wide text-gray-900 uppercase">
              Contact
            </h4>
            <ul className="space-y-3">
              {provider.profile.contactPhone && (
                <li>
                  <a
                    href={`tel:${provider.profile.contactPhone}`}
                    className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900"
                  >
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    {provider.profile.contactPhone}
                  </a>
                </li>
              )}
              <li>
                <a
                  href={`mailto:${provider.profile.contactEmail}`}
                  className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900"
                >
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  {provider.profile.contactEmail}
                </a>
              </li>
              {primaryLocation && (
                <li className="flex items-start gap-2 text-sm text-gray-500">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>
                    {primaryLocation.street && `${primaryLocation.street}, `}
                    {primaryLocation.city}, {primaryLocation.state}
                    {primaryLocation.postalCode &&
                      ` ${primaryLocation.postalCode}`}
                  </span>
                </li>
              )}
              {provider.profile.website && (
                <li>
                  <a
                    href={provider.profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900"
                  >
                    <Globe className="h-4 w-4 flex-shrink-0" />
                    Website
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center gap-4 border-t border-gray-200/60 pt-8 sm:flex-row sm:justify-between">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} {provider.profile.agencyName}. All
            rights reserved.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span>Made with</span>
            <Heart className="h-3 w-3 fill-red-400 text-red-400" />
            <span>for families</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
