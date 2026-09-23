"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DistrictStats } from "@/types";
import { formatPln } from "@/lib/format";

export function DistrictComparisonChart({ data }: { data: DistrictStats[] }) {
  const chartData = [...data]
    .filter((d) => d.total_monthly_cost.median !== null)
    .sort((a, b) => (b.total_monthly_cost.median ?? 0) - (a.total_monthly_cost.median ?? 0))
    .map((d) => ({ district: d.district, median: d.total_monthly_cost.median }));

  return (
    <ResponsiveContainer width="100%" height={420}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 12, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
        <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatPln(v)} />
        <YAxis type="category" dataKey="district" width={110} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(value) => [formatPln(Number(value)), "Mediana"]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
        <Bar dataKey="median" fill="var(--primary)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
