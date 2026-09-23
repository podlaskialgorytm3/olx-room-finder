"use client";

import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DistrictStats } from "@/types";
import { formatNumber, formatPln } from "@/lib/format";

export function DistrictsTable({ data }: { data: DistrictStats[] }) {
  const sorted = [...data].sort((a, b) => b.count - a.count);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dzielnica</TableHead>
            <TableHead className="text-right">Oferty</TableHead>
            <TableHead className="text-right">Mediana kosztu całkowitego</TableHead>
            <TableHead className="text-right">Śr. koszt całkowity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((row) => (
            <TableRow key={row.district}>
              <TableCell className="font-medium">
                <Link href={`/offers?district=${encodeURIComponent(row.district)}`} className="hover:underline">
                  {row.district}
                </Link>
              </TableCell>
              <TableCell className="text-right">{formatNumber(row.count)}</TableCell>
              <TableCell className="text-right">{formatPln(row.total_monthly_cost.median)}</TableCell>
              <TableCell className="text-right">{formatPln(row.total_monthly_cost.avg)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
