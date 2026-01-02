"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useDemoContext } from "@/contexts/demo-context";

interface TourStep {
  target: string;
  title: string;
  content: string;
  page?: string; // If the step is on a different page
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "[data-tour='demo-banner']",
    title: "Welcome to the Demo!",
    content:
      "This is a preview of the Pro dashboard with sample data. Explore all features - nothing you do here affects real data.",
  },
  {
    target: "[data-tour='sidebar']",
    title: "Dashboard Navigation",
    content:
      "Navigate between different sections. Pro accounts have access to Analytics, Inbox, and all premium features.",
  },
  {
    target: "[data-tour='quick-stats']",
    title: "Quick Overview",
    content:
      "See your listing status, plan tier, locations, and new inquiries at a glance.",
  },
  {
    target: "[data-tour='analytics']",
    title: "Performance Analytics",
    content:
      "Track page views, search impressions, click-through rates, and inquiry trends over time.",
  },
  {
    target: "[data-tour='featured-badge']",
    title: "Featured Locations",
    content:
      "Boost any location to the top of search results. Featured listings get up to 3x more visibility!",
  },
  {
    target: "[data-tour='cta-banner']",
    title: "Ready to Get Started?",
    content:
      "Sign up for free and upgrade to Pro anytime to unlock all these features for your practice!",
  },
];

export function DemoTour() {
  const pathname = usePathname();
  const router = useRouter();
  const { tourCompleted, setTourCompleted } = useDemoContext();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    // Only show tour on demo overview page and if not completed
    if (pathname !== "/demo") {
      setIsVisible(false);
      return;
    }

    const completed = localStorage.getItem("demo-tour-completed");
    if (completed || tourCompleted) {
      return;
    }

    // Start tour after a delay
    const timer = setTimeout(() => {
      setIsVisible(true);
      positionTooltip();
    }, 1000);

    return () => clearTimeout(timer);
  }, [pathname, tourCompleted]);

  useEffect(() => {
    if (isVisible) {
      positionTooltip();

      // Reposition on scroll/resize
      const handleReposition = () => positionTooltip();
      window.addEventListener("scroll", handleReposition);
      window.addEventListener("resize", handleReposition);
      return () => {
        window.removeEventListener("scroll", handleReposition);
        window.removeEventListener("resize", handleReposition);
      };
    }
  }, [currentStep, isVisible]);

  const positionTooltip = () => {
    const step = TOUR_STEPS[currentStep];
    const target = document.querySelector(step.target);

    if (!target) {
      // Target not found, skip to next step
      if (currentStep < TOUR_STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      }
      return;
    }

    const rect = target.getBoundingClientRect();

    // Check if element is visible (not hidden by CSS or off-screen)
    const isElementVisible = rect.width > 0 && rect.height > 0;
    if (!isElementVisible) {
      // Element hidden (e.g., sidebar on mobile), skip to next step
      if (currentStep < TOUR_STEPS.length - 1) {
        setCurrentStep(currentStep + 1);
      }
      return;
    }

    const isMobile = window.innerWidth < 640;
    const padding = 16;
    const tooltipHeight = 200;
    const tooltipWidth = isMobile ? window.innerWidth - 32 : 320;

    // Simple positioning: always place tooltip at bottom of viewport on mobile
    // On desktop, position relative to target
    let top: number;
    let left: number;

    if (isMobile) {
      // Fixed position at bottom of screen on mobile
      top = window.innerHeight - tooltipHeight - padding;
      left = padding;
    } else {
      // Position below or above target on desktop
      const spaceBelow = window.innerHeight - rect.bottom;

      if (spaceBelow >= tooltipHeight + 20) {
        top = rect.bottom + 12;
      } else {
        top = Math.max(16, rect.top - tooltipHeight - 12);
      }

      left = Math.max(
        padding,
        Math.min(
          rect.left + rect.width / 2 - tooltipWidth / 2,
          window.innerWidth - tooltipWidth - padding
        )
      );
    }

    setPosition({ top, left });

    // Scroll target into view if needed (instant, no animation to avoid jank)
    if (rect.top < 80 || rect.bottom > window.innerHeight - 100) {
      target.scrollIntoView({ block: "center", behavior: "instant" });
    }
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTourCompleted(true);
    localStorage.setItem("demo-tour-completed", "true");
  };

  if (!isVisible) return null;

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/50"
        onClick={handleSkip}
      />

      {/* Highlight the target element */}
      <style jsx global>{`
        [data-tour="${step.target.replace("[data-tour='", "").replace("']", "")}"] {
          position: relative;
          z-index: 9999 !important;
          box-shadow: 0 0 0 4px rgba(87, 136, 255, 0.5), 0 0 0 9999px rgba(0, 0, 0, 0.5);
          border-radius: 8px;
        }
      `}</style>

      {/* Tooltip */}
      <div
        className="fixed z-[10000] w-[calc(100vw-32px)] rounded-xl border border-border bg-background p-4 shadow-2xl sm:w-80"
        style={{ top: position.top, left: position.left }}
      >
        {/* Close button */}
        <button
          onClick={handleSkip}
          className="absolute right-3 top-3 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="pr-6">
          <h3 className="font-semibold text-foreground">{step.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{step.content}</p>
        </div>

        {/* Progress and Navigation */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === currentStep ? "bg-[#5788FF]" : "bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip
            </Button>
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {isLastStep ? "Get Started!" : "Next"}
              {!isLastStep && <ChevronRight className="ml-1 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
