import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { MAP_METRIC_LABELS, type MapMetric } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface MapMetricToggleProps {
  value: MapMetric;
  onChange: (value: MapMetric) => void;
}

export function MapMetricToggle({ value, onChange }: MapMetricToggleProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label="Rozwiń wybór metryki mapy"
        className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent"
      >
        <Plus className="size-3.5" />
        Mapa pokazuje
      </button>
    );
  }

  return (
    <fieldset className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3 text-sm shadow-sm">
      <legend className="sr-only">Mapa pokazuje</legend>
      <div className="flex w-full items-center justify-between gap-2 px-1">
        <span className="text-xs font-medium text-muted-foreground">Mapa pokazuje:</span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Zwiń wybór metryki mapy"
          className="flex size-5 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Minus className="size-3.5" />
        </button>
      </div>
      {(Object.keys(MAP_METRIC_LABELS) as MapMetric[]).map((metric) => (
        <label
          key={metric}
          className={cn(
            "flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-accent",
            value === metric && "bg-accent font-medium",
          )}
        >
          <input
            type="radio"
            name="map-metric"
            className="accent-primary"
            checked={value === metric}
            onChange={() => onChange(metric)}
          />
          <span className="whitespace-nowrap">{MAP_METRIC_LABELS[metric]}</span>
        </label>
      ))}
    </fieldset>
  );
}
