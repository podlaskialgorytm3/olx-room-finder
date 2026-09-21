"use client";

import { useState } from "react";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { useOutliers } from "@/hooks";
import { formatPln } from "@/lib/format";
import type { AnalysisMetric } from "@/types";

const METRIC_OPTIONS: { value: AnalysisMetric; label: string }[] = [
  { value: "total_monthly_cost", label: "Całkowity koszt" },
  { value: "price", label: "Cena" },
  { value: "additional_cost", label: "Dodatkowe opłaty" },
  { value: "deposit", label: "Kaucja" },
];

export function OutliersPanel() {
  const [metric, setMetric] = useState<AnalysisMetric>("total_monthly_cost");
  const { data, isLoading, isError, refetch } = useOutliers(metric);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Nietypowe oferty (outliers)</CardTitle>
          <CardDescription>Wykryte metodą Tukeya (IQR × 1.5) — nietypowo tanie lub drogie oferty.</CardDescription>
        </div>
        <Select value={metric} onValueChange={(v) => setMetric(v as AnalysisMetric)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {METRIC_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-48 w-full" />}
        {isError && <ErrorState onRetry={() => refetch()} description="Nie udało się pobrać outlierów." />}
        {data && (
          <>
            {data.bounds && (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">Q1: {formatPln(data.bounds.q1)}</Badge>
                <Badge variant="outline">Q3: {formatPln(data.bounds.q3)}</Badge>
                <Badge variant="outline">Dolna granica: {formatPln(data.bounds.lower_bound)}</Badge>
                <Badge variant="outline">Górna granica: {formatPln(data.bounds.upper_bound)}</Badge>
              </div>
            )}
            {data.outliers.length === 0 ? (
              <EmptyState title="Brak outlierów" description="Nie znaleziono nietypowych ofert dla wybranej metryki." />
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {data.outliers.slice(0, 25).map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <Link href={`/offers/${item.id}`} className="line-clamp-1 hover:underline">
                      {item.title}
                    </Link>
                    <span className="shrink-0 font-medium">{formatPln(item.value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
