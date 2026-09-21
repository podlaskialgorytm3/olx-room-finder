import { MAP_METRIC_LABELS, type MapMetric } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface MapMetricToggleProps {
  value: MapMetric;
  onChange: (value: MapMetric) => void;
}

export function MapMetricToggle({ value, onChange }: MapMetricToggleProps) {
  return (
    <fieldset className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3 text-sm shadow-sm">
      <legend className="px-1 text-xs font-medium text-muted-foreground">Mapa pokazuje:</legend>
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
          {MAP_METRIC_LABELS[metric]}
        </label>
      ))}
    </fieldset>
  );
}
