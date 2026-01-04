"use client";

import { Mail, Phone, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ContactInfoCardProps {
  providerName: string;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  showContactFormButton?: boolean;
  contactFormHref?: string;
}

export function ContactInfoCard({
  providerName,
  email,
  phone,
  website,
  showContactFormButton = false,
  contactFormHref = "#contact-form",
}: ContactInfoCardProps) {
  // Count how many contact methods are available for grid layout
  const contactMethods = [email, phone, website].filter(Boolean).length;
  const gridCols = contactMethods === 1 ? "sm:grid-cols-1" : contactMethods === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3";

  return (
    <Card className="border border-border/80 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5788FF]/10">
            <Phone className="h-4 w-4 text-[#5788FF]" />
          </div>
          Contact {providerName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contact info grid */}
        <div className={`grid gap-4 ${gridCols}`}>
          {email && (
            <a
              href={`mailto:${email}`}
              className="group flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[2px] hover:border-[#5788FF]/30 hover:bg-[#5788FF]/[0.03] hover:shadow-[0_4px_20px_rgba(87,136,255,0.12)] active:translate-y-0 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5788FF]/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5788FF]/10 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-[#5788FF]/15 group-hover:scale-[1.05]">
                <Mail className="h-5 w-5 text-[#5788FF] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-[1.1]" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</p>
                <p className="truncate text-sm font-medium text-foreground transition-colors duration-300 group-hover:text-[#5788FF]">{email}</p>
              </div>
            </a>
          )}
          {phone && (
            <a
              href={`tel:+1${phone.replace(/\D/g, "")}`}
              className="group flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[2px] hover:border-[#5788FF]/30 hover:bg-[#5788FF]/[0.03] hover:shadow-[0_4px_20px_rgba(87,136,255,0.12)] active:translate-y-0 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5788FF]/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5788FF]/10 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-[#5788FF]/15 group-hover:scale-[1.05]">
                <Phone className="h-5 w-5 text-[#5788FF] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-[1.1]" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone</p>
                <p className="text-sm font-medium text-foreground transition-colors duration-300 group-hover:text-[#5788FF]">{phone}</p>
              </div>
            </a>
          )}
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[2px] hover:border-[#5788FF]/30 hover:bg-[#5788FF]/[0.03] hover:shadow-[0_4px_20px_rgba(87,136,255,0.12)] active:translate-y-0 active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5788FF]/50"
              title={website}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#5788FF]/10 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-[#5788FF]/15 group-hover:scale-[1.05]">
                <Globe className="h-5 w-5 text-[#5788FF] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-[1.1]" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Website</p>
                <p className="truncate text-sm font-medium text-foreground transition-colors duration-300 group-hover:text-[#5788FF]">
                  {website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                </p>
              </div>
            </a>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          {website && (
            <Button asChild variant="outline" className="group flex-1 rounded-full text-base transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[2px] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] active:translate-y-0 active:shadow-none focus-visible:ring-2 focus-visible:ring-[#5788FF]/50">
              <a href={website} target="_blank" rel="noopener noreferrer">
                <Globe className="mr-2 h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:rotate-12" />
                Visit Website
              </a>
            </Button>
          )}
          {showContactFormButton && (
            <Button asChild className="group flex-1 rounded-full text-base transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[2px] hover:shadow-[0_4px_20px_rgba(254,231,32,0.35)] active:translate-y-0 active:shadow-[0_2px_8px_rgba(254,231,32,0.2)] focus-visible:ring-2 focus-visible:ring-primary/50">
              <a href={contactFormHref}>
                <Mail className="mr-2 h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110" />
                Send Message
              </a>
            </Button>
          )}
          {phone && !showContactFormButton && (
            <Button asChild className="group flex-1 rounded-full text-base transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[2px] hover:shadow-[0_4px_20px_rgba(254,231,32,0.35)] active:translate-y-0 active:shadow-[0_2px_8px_rgba(254,231,32,0.2)] focus-visible:ring-2 focus-visible:ring-primary/50">
              <a href={`tel:+1${phone.replace(/\D/g, "")}`}>
                <Phone className="mr-2 h-4 w-4 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110" />
                Call Now
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
