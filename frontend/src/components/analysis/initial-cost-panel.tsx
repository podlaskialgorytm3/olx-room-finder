"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { useInitialCost } from "@/hooks";
import { formatPln } from "@/lib/format";

export function InitialCostPanel() {
  const { data, isLoading, isError, refetch } = useInitialCost();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Koszt wejścia (initial cost)</CardTitle>
        <CardDescription>
          Szacowany koszt potrzebny na start: miesięczny koszt + kaucja. Oferty bez pełnych danych są oznaczone jako
          szacunkowe.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-64 w-full" />}
        {isError && <ErrorState onRetry={() => refetch()} description="Nie udało się pobrać kosztu wejścia." />}
        {data && data.length === 0 && <EmptyState title="Brak danych" />}
        {data && data.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {[...data]
              .sort((a, b) => (b.initial_cost ?? 0) - (a.initial_cost ?? 0))
              .slice(0, 20)
              .map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <div className="min-w-0">
                    <Link href={`/offers/${item.id}`} className="line-clamp-1 font-medium hover:underline">
                      {item.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Miesięcznie: {formatPln(item.total_monthly_cost)} · Kaucja: {formatPln(item.deposit)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {item.initial_cost_is_estimate && (
                      <Badge variant="outline" className="text-[10px]">
                        szacunek
                      </Badge>
                    )}
                    <span className="font-semibold">{formatPln(item.initial_cost)}</span>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
