import { getFillColor } from "./color-scale";
import { formatNumber, formatPln } from "@/lib/format";
import type { MapMetric } from "@/lib/constants";

interface MapLegendProps {
  metric: MapMetric;
  min: number;
  max: number;
}

export function MapLegend({ metric, min, max }: MapLegendProps) {
  const steps = 5;
  const format = metric === "count" ? formatNumber : formatPln;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3 text-xs shadow-sm">
      <span className="font-medium text-muted-foreground">Legenda</span>
      <div className="flex h-3 w-48 overflow-hidden rounded">
        {Array.from({ length: steps }).map((_, i) => {
          const value = min + ((max - min) * i) / (steps - 1);
          return <div key={i} className="flex-1" style={{ backgroundColor: getFillColor(value, min, max) }} />;
        })}
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-muted-foreground">
        <span className="size-2.5 rounded-sm bg-slate-200" /> brak danych
      </div>
    </div>
  );
}
