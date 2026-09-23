"use client";

import { Building2, TrendingUp, BarChart3, ArrowDownUp } from "lucide-react";
import { KpiCard } from "@/components/common/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PriceHistogramChart } from "@/components/statistics/price-histogram-chart";
import { DistrictComparisonChart } from "@/components/statistics/district-comparison-chart";
import { DistrictsTable } from "@/components/statistics/districts-table";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useDistrictStatistics, useStatisticsOverview, usePublicCities } from "@/hooks";
import { useSelectedCity, DEFAULT_CITY } from "@/lib/city-store";
import { formatCity, formatNumber, formatPln } from "@/lib/format";

export default function StatisticsPage() {
  const overview = useStatisticsOverview();
  const districts = useDistrictStatistics();
  const selectedCity = useSelectedCity();
  const { data: cities } = usePublicCities();
  const cityLabel = cities?.find((c) => c.city === selectedCity)?.display_name ?? formatCity(selectedCity ?? DEFAULT_CITY);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Statystyki rynku</h1>
        <p className="mt-1 text-muted-foreground">Zbiorczy przegląd cen i kosztów ofert pokoi w mieście {cityLabel}.</p>
      </div>

      {/* Overview KPIs */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Liczba ofert" value={formatNumber(overview.data?.count)} icon={Building2} isLoading={overview.isLoading} />
        <KpiCard
          label="Średni koszt całkowity"
          value={formatPln(overview.data?.total_monthly_cost.avg)}
          icon={TrendingUp}
          isLoading={overview.isLoading}
        />
        <KpiCard
          label="Mediana kosztu całkowitego"
          value={formatPln(overview.data?.total_monthly_cost.median)}
          icon={BarChart3}
          isLoading={overview.isLoading}
        />
        <KpiCard
          label="Min / Max"
          value={`${formatPln(overview.data?.total_monthly_cost.min)} – ${formatPln(overview.data?.total_monthly_cost.max)}`}
          icon={ArrowDownUp}
          isLoading={overview.isLoading}
        />
      </section>

      {overview.data && overview.data.count === 0 && (
        <EmptyState
          title={`Brak ofert dla miasta ${cityLabel}`}
          description="Nie mamy jeszcze zebranych danych statystycznych dla tego miasta. Spróbuj wybrać inne miasto."
        />
      )}

      {/* Price distribution */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Rozkład kosztu całkowitego</CardTitle>
          </CardHeader>
          <CardContent>
            <PriceHistogramChart />
          </CardContent>
        </Card>
      </section>

      {/* District comparison chart */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Mediana kosztu całkowitego wg dzielnicy</CardTitle>
          </CardHeader>
          <CardContent>
            {districts.isLoading && <Skeleton className="h-96 w-full" />}
            {districts.isError && <ErrorState onRetry={() => districts.refetch()} />}
            {districts.data && districts.data.length === 0 && <EmptyState title="Brak danych o dzielnicach" />}
            {districts.data && districts.data.length > 0 && <DistrictComparisonChart data={districts.data} />}
          </CardContent>
        </Card>
      </section>

      {/* Districts table */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Dzielnice</CardTitle>
          </CardHeader>
          <CardContent>
            {districts.isLoading && <Skeleton className="h-64 w-full" />}
            {districts.isError && <ErrorState onRetry={() => districts.refetch()} />}
            {districts.data && districts.data.length === 0 && <EmptyState title="Brak danych o dzielnicach" />}
            {districts.data && districts.data.length > 0 && <DistrictsTable data={districts.data} />}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
