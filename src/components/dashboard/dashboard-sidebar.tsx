"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, GaugeCircle, LogOut, MapPinned, Sparkles, Users2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const dashboardNav = [
  { href: "/dashboard", label: "Overview", icon: GaugeCircle },
  { href: "/dashboard/listing", label: "Listing details", icon: MapPinned },
  { href: "/dashboard/billing", label: "Billing & subscriptions", icon: CreditCard },
  { href: "/dashboard/partners", label: "Featured partners", icon: Sparkles },
  { href: "/dashboard/team", label: "Team & access", icon: Users2 },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-20 hidden h-[calc(100vh-5rem)] w-64 flex-none flex-col justify-between rounded-3xl border border-border bg-muted/30 p-4 shadow-sm lg:flex">
      <nav className="space-y-1">
        {dashboardNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "w-full justify-start gap-3 rounded-xl px-3 py-2 text-sm",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button className={cn(buttonVariants({ variant: "ghost" }), "w-full justify-start gap-3 text-sm")}>
        <LogOut className="h-4 w-4" aria-hidden />
        Logout
      </button>
    </aside>
  );
}
