import type { MapMetric } from "@/lib/constants";
import type { DistrictMetricValue } from "./types";

/** Extracts the numeric value for the currently selected map metric. */
export function getMetricValue(value: DistrictMetricValue | undefined, metric: MapMetric): number | null {
  if (!value) return null;
  switch (metric) {
    case "count":
      return value.count;
    case "avg_price":
      return value.avgPrice;
    case "median_price":
      return value.medianPrice;
    case "avg_total_cost":
      return value.avgTotalCost;
    case "median_total_cost":
      return value.medianTotalCost;
    default:
      return null;
  }
}

/** Interpolates between two hex colors (t in [0,1]). */
function lerpColor(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

const SCALE_LOW: [number, number, number] = [219, 234, 254]; // blue-100
const SCALE_HIGH: [number, number, number] = [29, 78, 216]; // blue-700

/** Maps a value within [min,max] to a color on the fill scale. Returns a neutral color if value/range is missing. */
export function getFillColor(value: number | null, min: number, max: number): string {
  if (value === null || max <= min) return "#e2e8f0"; // slate-200 for missing data
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return lerpColor(SCALE_LOW, SCALE_HIGH, t);
}
