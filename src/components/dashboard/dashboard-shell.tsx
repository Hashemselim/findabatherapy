import { PropsWithChildren } from "react";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard/dashboard-topbar";

export function DashboardShell({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <DashboardTopbar />
      <main className="container flex flex-1 gap-6 px-4 py-10 sm:px-6">
        <DashboardSidebar />
        <div className="flex-1 space-y-6 rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-xl">
          {children}
        </div>
      </main>
    </div>
  );
}
