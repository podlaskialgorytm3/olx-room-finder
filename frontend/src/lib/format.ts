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

/** Powierzchnia w m² - dopuszcza wartości z częścią dziesiętną (np. 12.5). */
export function formatArea(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "brak danych";
  return `${numberFormatter.format(value)} m²`;
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

/** Sama data (bez godziny) - używane tam, gdzie liczy się dzień dodania
 * ogłoszenia, a nie dokładny czas (np. karta oferty). */
export function formatDateShort(value: string | null | undefined): string {
  if (!value) return "brak danych";
  try {
    return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return value;
  }
}

export interface OfferAge {
  /** Czytelny opis wieku, np. "< 1 godziny", "3 godziny", "2 dni". */
  label: string;
  /** Klasy Tailwind (tekst + tło) odzwierciedlające świeżość oferty:
   * zielony < 24h, żółty 1-7 dni, czerwony > 7 dni. */
  colorClassName: string;
  emoji: "🟢" | "🟡" | "🔴";
}

/** Oblicza wiek oferty na podstawie `created_at` względem aktualnego czasu -
 * liczone dynamicznie w UI, nie zapisywane w bazie (patrz `docs/age-of-listing`).
 * Zwraca `null`, gdy `created_at` jest nieznane. */
export function formatOfferAge(createdAt: string | null | undefined): OfferAge | null {
  if (!createdAt) return null;
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return null;

  const diffMs = Date.now() - created.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = Math.floor(diffHours / 24);

  let label: string;
  if (diffHours < 1) {
    label = "< 1 godziny";
  } else if (diffHours < 24) {
    const hours = Math.floor(diffHours);
    label = `${hours} ${hours === 1 ? "godzina" : hours < 5 ? "godziny" : "godzin"}`;
  } else {
    label = `${diffDays} ${diffDays === 1 ? "dzień" : "dni"}`;
  }

  if (diffHours < 24) {
    return { label, colorClassName: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400", emoji: "🟢" };
  }
  if (diffDays <= 7) {
    return { label, colorClassName: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400", emoji: "🟡" };
  }
  return { label, colorClassName: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400", emoji: "🔴" };
}

/** Baza danych przechowuje miasto wielkimi literami (np. "WARSZAWA") - w UI
 * pokazujemy je w naturalnej formie ("Warszawa"). */
export function formatCity(city: string | null | undefined): string {
  if (!city) return "brak danych";
  return city.charAt(0).toUpperCase() + city.slice(1).toLowerCase();
}

/** Ucina tekst po `maxLength` znakach, dodając "…" - używane np. dla
 * długich tytułów ofert w tabelach panelu administratora, żeby nie
 * rozciągały wiersza niezależnie od szerokości kolumny. */
export function truncateText(value: string | null | undefined, maxLength = 120): string {
  if (!value) return "";
  return value.length > maxLength ? `${value.slice(0, maxLength).trimEnd()}…` : value;
}
