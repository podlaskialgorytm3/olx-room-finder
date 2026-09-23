"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useDistrictStatisticsByName } from "@/hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatPln } from "@/lib/format";
import { ErrorState } from "@/components/common/error-state";

interface DistrictDetailPanelProps {
  district: string;
  onClose: () => void;
}

export function DistrictDetailPanel({ district, onClose }: DistrictDetailPanelProps) {
  const { data, isLoading, isError, refetch } = useDistrictStatisticsByName(district);

  return (
    <Card className="shadow-sm">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Wybrana dzielnica</p>
            <h3 className="text-xl font-semibold">{district}</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Zamknij szczegóły dzielnicy">
            <X className="size-4" />
          </Button>
        </div>

        {isError && <ErrorState onRetry={() => refetch()} description="Nie udało się pobrać statystyk dzielnicy." />}

        {isLoading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Liczba ofert" value={formatNumber(data.count)} />
              <Stat label="Mediana kosztu całkowitego" value={formatPln(data.total_monthly_cost.median)} />
              <Stat label="Śr. koszt całkowity" value={formatPln(data.total_monthly_cost.avg)} />
              <Stat label="Śr. cena bazowa" value={formatPln(data.price.avg)} />
            </div>
            <Button asChild className="w-full">
              <Link href={`/offers?district=${encodeURIComponent(district)}`}>
                Zobacz oferty w dzielnicy {district}
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
