"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const STORAGE_KEY = "dashboard-nav-collapse-state-v3";

type SectionId = "company" | "brandedPages";

interface CollapseState {
  [key: string]: boolean;
}

interface UseNavCollapseStateReturn {
  /** Current open/closed state for each section */
  openSections: CollapseState;
  /** Toggle a specific section open/closed */
  toggleSection: (sectionId: string) => void;
  /** Check if a section is open */
  isSectionOpen: (sectionId: string) => boolean;
  /** Current section based on pathname */
  currentSection: SectionId | null;
}

// Map pathname patterns to dropdown sections
function getSectionFromPath(pathname: string): SectionId | null {
  if (
    pathname.startsWith("/dashboard/company") ||
    pathname.startsWith("/dashboard/locations")
  ) {
    return "company";
  }
  if (
    pathname.startsWith("/dashboard/intake") ||
    pathname.startsWith("/dashboard/careers") ||
    pathname.startsWith("/dashboard/resources")
  ) {
    return "brandedPages";
  }
  return null;
}

// Default state - all collapsed
const DEFAULT_STATE: CollapseState = {
  company: false,
  brandedPages: false,
};

/**
 * Hook for managing dashboard navigation collapse state.
 *
 * Features:
 * - Persists collapse state to localStorage
 * - Auto-expands the section containing the current page
 * - Auto-collapses ALL other sections when entering a section (accordion behavior)
 */
export function useNavCollapseState(): UseNavCollapseStateReturn {
  const pathname = usePathname();

  // Get current section from pathname
  const currentSection = getSectionFromPath(pathname);

  // IMPORTANT: Initialize with a state that matches the server render
  // We compute the initial state based on pathname to avoid hydration mismatch
  const [openSections, setOpenSections] = useState<CollapseState>(() => {
    // Start with all collapsed, then open the current section
    const initial = { ...DEFAULT_STATE };
    if (currentSection) {
      initial[currentSection] = true;
    }
    return initial;
  });

  // Track if we've hydrated (to avoid running effects during SSR)
  const [isHydrated, setIsHydrated] = useState(false);

  // Mark as hydrated after first render
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Load from localStorage only after hydration
  useEffect(() => {
    if (!isHydrated) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CollapseState;
        // Only use stored state if current section matches
        // Otherwise, auto-expand current section
        if (currentSection && !parsed[currentSection]) {
          // Current section should be open, update stored state
          const updated = { ...DEFAULT_STATE };
          updated[currentSection] = true;
          setOpenSections(updated);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [isHydrated, currentSection]);

  // Auto-expand current section when pathname changes (after hydration)
  useEffect(() => {
    if (!isHydrated || !currentSection) return;

    setOpenSections((prev) => {
      // If already open, no change needed
      if (prev[currentSection]) return prev;

      // Close all, open current
      const newState = { ...DEFAULT_STATE };
      newState[currentSection] = true;
      return newState;
    });
  }, [isHydrated, currentSection]);

  // Persist state to localStorage
  useEffect(() => {
    if (!isHydrated) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(openSections));
    } catch {
      // Ignore localStorage errors
    }
  }, [isHydrated, openSections]);

  const toggleSection = useCallback((sectionId: string) => {
    setOpenSections((prev) => {
      const isOpening = !prev[sectionId];

      if (isOpening) {
        // When opening a section, close all others (accordion behavior)
        const newState: CollapseState = { ...DEFAULT_STATE };
        newState[sectionId] = true;
        return newState;
      } else {
        // When closing, just close this section
        return { ...prev, [sectionId]: false };
      }
    });
  }, []);

  const isSectionOpen = useCallback(
    (sectionId: string) => {
      return openSections[sectionId] ?? false;
    },
    [openSections]
  );

  return {
    openSections,
    toggleSection,
    isSectionOpen,
    currentSection,
  };
}
