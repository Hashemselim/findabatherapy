"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackToTopProps {
  /** Scroll threshold in pixels before showing the button */
  threshold?: number;
  className?: string;
}

export function BackToTop({ threshold = 400, className }: BackToTopProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > threshold);
    };

    // Check initial scroll position
    toggleVisibility();

    window.addEventListener("scroll", toggleVisibility, { passive: true });
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="Back to top"
      className={cn(
        "fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-[#5788FF]/30 bg-white shadow-[0_4px_20px_rgba(87,136,255,0.15)] transition-all duration-300 ease-premium",
        "hover:-translate-y-[2px] hover:border-[#5788FF]/50 hover:bg-[#5788FF] hover:text-white hover:shadow-[0_8px_30px_rgba(87,136,255,0.25)]",
        "active:translate-y-0 active:shadow-[0_2px_10px_rgba(87,136,255,0.15)]",
        "focus:outline-none focus:ring-2 focus:ring-[#5788FF]/50 focus:ring-offset-2",
        isVisible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0",
        className
      )}
    >
      <ArrowUp className="h-5 w-5 text-[#5788FF] transition-colors duration-300 group-hover:text-white" />
    </button>
  );
}
