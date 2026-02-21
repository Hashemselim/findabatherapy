import { cn } from "@/lib/utils";

interface BwSectionWrapperProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
  background?: "cream" | "white" | "golden" | "dark";
  narrow?: boolean;
}

export function BwSectionWrapper({
  children,
  id,
  className,
  background = "cream",
  narrow = false,
}: BwSectionWrapperProps) {
  return (
    <section
      id={id}
      className={cn(
        "py-24 lg:py-32",
        background === "cream" && "bg-[#FFFBF0]",
        background === "white" && "bg-white",
        background === "golden" && "bg-[#FFF7E1]",
        background === "dark" && "bg-[#1A2744]",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto px-5 sm:px-6 lg:px-8",
          narrow ? "max-w-3xl" : "max-w-6xl"
        )}
      >
        {children}
      </div>
    </section>
  );
}
