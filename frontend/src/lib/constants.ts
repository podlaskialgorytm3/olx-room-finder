/** Canonical list of Warsaw districts covered by the OLX Room Finder dataset. */
export const WARSAW_DISTRICTS = [
  "Bemowo",
  "Białołęka",
  "Bielany",
  "Mokotów",
  "Ochota",
  "Praga-Południe",
  "Praga-Północ",
  "Rembertów",
  "Śródmieście",
  "Targówek",
  "Ursus",
  "Ursynów",
  "Wawer",
  "Wesoła",
  "Wilanów",
  "Włochy",
  "Wola",
  "Żoliborz",
] as const;

export type WarsawDistrict = (typeof WARSAW_DISTRICTS)[number];

export const PRICE_RANGE = { min: 0, max: 5000, step: 50 } as const;
export const TOTAL_COST_RANGE = { min: 0, max: 6000, step: 50 } as const;

export type MapMetric = "count" | "avg_price" | "median_price" | "avg_total_cost" | "median_total_cost";

export const MAP_METRIC_LABELS: Record<MapMetric, string> = {
  count: "Liczbę ofert",
  avg_price: "Średnią cenę",
  median_price: "Medianę ceny",
  avg_total_cost: "Średni całkowity koszt",
  median_total_cost: "Medianę całkowitego kosztu",
};
