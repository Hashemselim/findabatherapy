import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center border text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "rounded-md px-2.5 py-0.5 border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "rounded-md px-2.5 py-0.5 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "rounded-md px-2.5 py-0.5 border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "rounded-md px-2.5 py-0.5 text-foreground",
        filter:
          "gap-1 rounded-full px-3 py-1 border-[#5788FF]/50 bg-[#5788FF]/10 text-foreground transition-all duration-300 ease-premium hover:border-[#5788FF]/70 hover:bg-[#5788FF]/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
