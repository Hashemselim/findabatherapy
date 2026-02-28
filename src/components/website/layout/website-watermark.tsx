"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useWebsite } from "./website-provider";

export function WebsiteWatermark() {
  const { showWatermark, brandColor } = useWebsite();

  if (!showWatermark) return null;

  return (
    <div className="fixed right-0 bottom-0 left-0 z-40 border-t border-gray-200/60 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Sparkles className="h-4 w-4" style={{ color: brandColor }} />
          <span className="hidden sm:inline">
            Website powered by{" "}
            <Link
              href="https://www.findabatherapy.org"
              className="font-medium text-gray-700 hover:underline"
            >
              Find ABA Therapy
            </Link>
          </span>
          <span className="sm:hidden">
            Powered by{" "}
            <Link
              href="https://www.findabatherapy.org"
              className="font-medium text-gray-700 hover:underline"
            >
              FindABATherapy
            </Link>
          </span>
        </div>
        <Link
          href="https://www.findabatherapy.org/pricing"
          className="rounded-full px-3 py-1 text-xs font-medium text-white shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
          style={{ backgroundColor: brandColor }}
        >
          Get your own website
        </Link>
      </div>
    </div>
  );
}
