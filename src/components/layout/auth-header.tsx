import Link from "next/link";
import Image from "next/image";
import { Briefcase } from "lucide-react";

import { brandColors } from "@/config/brands";

export function AuthHeader() {
  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex items-center justify-center gap-2 px-4 py-3 sm:gap-4 sm:py-4">
        {/* Compact tagline - hidden on mobile */}
        <span className="hidden text-xs text-muted-foreground sm:block">
          Part of the BehaviorWork Network:
        </span>

        {/* Two brands side by side */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* FindABA Therapy */}
          <Link
            href="https://findabatherapy.org"
            className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
          >
            <Image
              src="/logo-icon.png"
              alt="FindABA Therapy"
              width={24}
              height={24}
              className="h-5 w-5 sm:h-6 sm:w-6"
            />
            <span className="text-xs font-medium sm:text-sm" style={{ color: brandColors.therapy }}>
              findabatherapy.org
            </span>
          </Link>

          <div className="h-4 w-px bg-border" />

          {/* FindABA Jobs */}
          <Link
            href="https://findabajobs.org"
            className="flex items-center gap-1.5 transition-opacity hover:opacity-80"
          >
            <div
              className="flex h-5 w-5 items-center justify-center rounded sm:h-6 sm:w-6"
              style={{ backgroundColor: brandColors.jobs }}
            >
              <Briefcase className="h-3 w-3 text-white sm:h-3.5 sm:w-3.5" />
            </div>
            <span className="text-xs font-medium sm:text-sm" style={{ color: brandColors.jobs }}>
              findabajobs.org
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
