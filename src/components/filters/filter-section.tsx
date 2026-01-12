"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface FilterSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  /** Accent color for hover states */
  accentColor?: "blue" | "emerald";
}

export function FilterSection({
  title,
  defaultOpen = false,
  children,
  accentColor = "blue",
}: FilterSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const hoverColorClass = accentColor === "emerald"
    ? "hover:text-emerald-600"
    : "hover:text-[#5788FF]";

  const chevronColorClass = accentColor === "emerald"
    ? "group-hover:text-emerald-600"
    : "group-hover:text-[#5788FF]";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger
        className={cn(
          "group flex w-full items-center justify-between py-2 transition-colors duration-300",
          hoverColorClass
        )}
      >
        <span className="text-sm font-medium">{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-all duration-300 ease-premium",
            chevronColorClass,
            isOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
    </Collapsible>
  );
}
