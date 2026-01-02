"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportAnalyticsCSV, type DateRange } from "@/lib/actions/admin";

type ExportType = "customers" | "searches" | "timeseries" | "states" | "customer_list";

interface AdminExportButtonProps {
  dateRange?: DateRange;
}

const exportOptions: { type: ExportType; label: string }[] = [
  { type: "customers", label: "Customer Metrics" },
  { type: "customer_list", label: "Full Customer List" },
  { type: "searches", label: "Search Analytics" },
  { type: "timeseries", label: "Activity Over Time" },
  { type: "states", label: "Customers by State" },
];

export function AdminExportButton({ dateRange }: AdminExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (type: ExportType) => {
    setIsExporting(true);
    try {
      const result = await exportAnalyticsCSV(type, dateRange);
      if (result.success && result.data) {
        // Create and download the CSV file
        const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${type}-analytics-${new Date().toISOString().split("T")[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        console.error("Export failed:", result.error);
      }
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export CSV
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {exportOptions.map((option) => (
          <DropdownMenuItem key={option.type} onClick={() => handleExport(option.type)}>
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
