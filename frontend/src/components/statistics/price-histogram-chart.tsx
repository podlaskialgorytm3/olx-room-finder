"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePriceDistribution } from "@/hooks";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { formatPln } from "@/lib/format";

export function PriceHistogramChart() {
  const { data, isLoading, isError, refetch } = usePriceDistribution(250);

  if (isLoading) return <Skeleton className="h-72 w-full" />;
  if (isError) return <ErrorState onRetry={() => refetch()} description="Nie udało się pobrać rozkładu cen." />;
  if (!data || data.length === 0) return <EmptyState title="Brak danych" description="Brak danych do zbudowania histogramu cen." />;

  const chartData = data.map((bucket) => ({
    range: `${formatPln(bucket.from)}`,
    count: bucket.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="range" tick={{ fontSize: 11 }} interval={Math.ceil(chartData.length / 10)} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          formatter={(value) => [`${value} ofert`, "Liczba"]}
          contentStyle={{ borderRadius: 8, fontSize: 12 }}
        />
        <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
