/** Formatting helpers shared across the UI. Keep null-handling explicit. */

const plnFormatter = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("pl-PL");

export function formatPln(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "brak danych";
  return plnFormatter.format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "brak danych";
  return numberFormatter.format(value);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "brak danych";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

/** Tri-state boolean → readable label. `null`/`undefined` = unknown, not "no". */
export function formatTriState(value: boolean | null | undefined, yes = "Tak", no = "Nie", unknown = "Brak danych"): string {
  if (value === true) return yes;
  if (value === false) return no;
  return unknown;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "brak danych";
  try {
    return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}
