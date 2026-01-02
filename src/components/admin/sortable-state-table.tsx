"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STATE_NAMES } from "@/lib/data/cities";
import type { StateListingCounts } from "@/lib/actions/admin";

type SortField = "state" | "realListings" | "scrapedListings" | "total";
type SortDirection = "asc" | "desc";

interface SortableStateTableProps {
  data: StateListingCounts[];
}

export function SortableStateTable({ data }: SortableStateTableProps) {
  const [sortField, setSortField] = useState<SortField>("total");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      if (sortField === "state") {
        aValue = STATE_NAMES[a.state] || a.state;
        bValue = STATE_NAMES[b.state] || b.state;
      } else {
        aValue = a[sortField];
        bValue = b[sortField];
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
  }, [data, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "state" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  const totalRealListings = data.reduce((sum, s) => sum + s.realListings, 0);
  const totalScrapedListings = data.reduce((sum, s) => sum + s.scrapedListings, 0);
  const totalAllListings = totalRealListings + totalScrapedListings;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead
            className="cursor-pointer select-none hover:bg-muted/50"
            onClick={() => handleSort("state")}
          >
            <div className="flex items-center">
              State
              <SortIcon field="state" />
            </div>
          </TableHead>
          <TableHead
            className="cursor-pointer select-none text-right hover:bg-muted/50"
            onClick={() => handleSort("realListings")}
          >
            <div className="flex items-center justify-end">
              Real
              <SortIcon field="realListings" />
            </div>
          </TableHead>
          <TableHead
            className="cursor-pointer select-none text-right hover:bg-muted/50"
            onClick={() => handleSort("scrapedListings")}
          >
            <div className="flex items-center justify-end">
              Scraped
              <SortIcon field="scrapedListings" />
            </div>
          </TableHead>
          <TableHead
            className="cursor-pointer select-none text-right hover:bg-muted/50"
            onClick={() => handleSort("total")}
          >
            <div className="flex items-center justify-end">
              Total
              <SortIcon field="total" />
            </div>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.map((item) => (
          <TableRow key={item.state}>
            <TableCell className="font-medium">
              {STATE_NAMES[item.state] || item.state}
            </TableCell>
            <TableCell className="text-right">
              <span className="font-medium text-green-600">{item.realListings}</span>
            </TableCell>
            <TableCell className="text-right">
              <span className="text-muted-foreground">{item.scrapedListings}</span>
            </TableCell>
            <TableCell className="text-right font-bold">{item.total}</TableCell>
          </TableRow>
        ))}
        {data.length > 0 && (
          <TableRow className="bg-muted/50 font-bold">
            <TableCell>Total</TableCell>
            <TableCell className="text-right text-green-600">{totalRealListings}</TableCell>
            <TableCell className="text-right text-muted-foreground">{totalScrapedListings}</TableCell>
            <TableCell className="text-right">{totalAllListings}</TableCell>
          </TableRow>
        )}
        {data.length === 0 && (
          <TableRow>
            <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
              No listings found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
