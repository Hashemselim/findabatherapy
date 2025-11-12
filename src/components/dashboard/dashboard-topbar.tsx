import Link from "next/link";
import { Bell, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function DashboardTopbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-white">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden />
          Find ABA Therapy
        </Link>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-primary/60 text-primary">
            Premium
          </Badge>
          <Button variant="ghost" size="icon" className="text-slate-200 hover:bg-white/10" aria-label="Notifications">
            <Bell className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </header>
  );
}
