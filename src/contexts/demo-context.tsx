"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { toast } from "sonner";

interface DemoContextType {
  isDemo: true;
  showDemoToast: (customMessage?: string) => void;
  restartTour: () => void;
  tourCompleted: boolean;
  setTourCompleted: (completed: boolean) => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [tourCompleted, setTourCompleted] = useState(false);

  const showDemoToast = useCallback((customMessage?: string) => {
    toast.info(customMessage || "This is a demo dashboard", {
      description:
        "Sign up for a free account to start managing your own listing.",
      action: {
        label: "Sign Up Free",
        onClick: () => {
          window.location.href = "/auth/sign-up?plan=free&from=demo";
        },
      },
      duration: 5000,
    });
  }, []);

  const restartTour = useCallback(() => {
    setTourCompleted(false);
    localStorage.removeItem("demo-tour-completed");
    window.location.reload();
  }, []);

  return (
    <DemoContext.Provider
      value={{
        isDemo: true,
        showDemoToast,
        restartTour,
        tourCompleted,
        setTourCompleted,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoContext() {
  const context = useContext(DemoContext);

  if (context === undefined) {
    throw new Error("useDemoContext must be used within a DemoProvider");
  }

  return context;
}

// Safe hook that doesn't throw - useful for components that may be used in both demo and non-demo contexts
export function useIsDemo(): boolean {
  const context = useContext(DemoContext);
  return context?.isDemo === true;
}
