"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { usePriceVsDistrict } from "@/hooks";
import { formatPercent, formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PriceVsDistrictPanel() {
  const { data, isLoading, isError, refetch } = usePriceVsDistrict();

  const withMedian = (data ?? []).filter((d) => d.district_median !== null && d.difference !== null);
  const sorted = [...withMedian].sort((a, b) => (a.difference_percent ?? 0) - (b.difference_percent ?? 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cena względem dzielnicy</CardTitle>
        <CardDescription>
          Oferty posortowane od najbardziej poniżej mediany swojej dzielnicy do najbardziej powyżej.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-64 w-full" />}
        {isError && <ErrorState onRetry={() => refetch()} description="Nie udało się pobrać analizy cen." />}
        {data && sorted.length === 0 && (
          <EmptyState title="Brak danych" description="Brak ofert z wystarczającymi danymi o dzielnicy." />
        )}
        {sorted.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {sorted.slice(0, 20).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <Link href={`/offers/${item.id}`} className="line-clamp-1 font-medium hover:underline">
                    {item.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {item.district} · {formatPln(item.price)} vs mediana {formatPln(item.district_median)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 font-semibold",
                    (item.difference_percent ?? 0) < 0 ? "text-emerald-600" : "text-amber-600",
                  )}
                >
                  {formatPercent(item.difference_percent)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
