"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { usePriceVsDistrict } from "@/hooks";
import { formatPercent, formatPln } from "@/lib/format";
import { getPriceDiffColor } from "@/lib/price-diff-color";

export function PriceVsDistrictPanel() {
  const { data, isLoading, isError, refetch } = usePriceVsDistrict();

  const withMedian = (data ?? []).filter((d) => d.district_median !== null && d.difference !== null);
  const sorted = [...withMedian].sort((a, b) => (a.difference_percent ?? 0) - (b.difference_percent ?? 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Koszt całkowity względem dzielnicy</CardTitle>
        <CardDescription>
          Oferty posortowane od najbardziej poniżej mediany całkowitego kosztu swojej dzielnicy do najbardziej powyżej.
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
                  className="shrink-0 rounded-full px-2 py-0.5 font-semibold"
                  style={{
                    color: getPriceDiffColor(item.difference_percent).text,
                    backgroundColor: getPriceDiffColor(item.difference_percent).background,
                  }}
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
