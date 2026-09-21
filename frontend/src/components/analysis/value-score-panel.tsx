"use client";

import Link from "next/link";
import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { useValueScore } from "@/hooks";
import { formatNumber } from "@/lib/format";

export function ValueScorePanel() {
  const { data, isLoading, isError, refetch } = useValueScore();

  const scored = (data ?? []).filter((d) => d.value_score !== null);
  const sorted = [...scored].sort((a, b) => (b.value_score ?? 0) - (a.value_score ?? 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wskaźnik opłacalności (value score)</CardTitle>
        <CardDescription className="flex items-start gap-2">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            To nie jest ocena jakości mieszkania — to wskaźnik statystyczny wyliczony na podstawie odchylenia
            całkowitego kosztu miesięcznego (czynsz + dodatkowe opłaty) od mediany/MAD dzielnicy, skorygowany o
            negocjowalność i wymaganą kaucję. Wyższa wartość oznacza koszt relatywnie korzystniejszy na tle dzielnicy,
            ale nie uwzględnia stanu technicznego, lokalizacji szczegółowej ani innych cech oferty.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-64 w-full" />}
        {isError && <ErrorState onRetry={() => refetch()} description="Nie udało się pobrać wskaźnika value score." />}
        {data && scored.length === 0 && (
          <EmptyState
            title="Brak wystarczających danych"
            description="Zbyt mało ofert w dzielnicach, aby policzyć wiarygodny wskaźnik (wymagana minimalna liczebność próby)."
          />
        )}
        {sorted.length > 0 && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {sorted.slice(0, 20).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <Link href={`/offers/${item.id}`} className="line-clamp-1 font-medium hover:underline">
                    {item.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">{item.district}</p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {formatNumber(item.value_score)}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
