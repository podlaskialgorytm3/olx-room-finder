/** Types mirroring `backend/schemas/statistics.py`. */

export interface MetricSummary {
  avg: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
}

export interface Overview {
  count: number;
  price: MetricSummary;
  total_monthly_cost: MetricSummary;
}

export interface DistrictStats {
  district: string;
  count: number;
  price: MetricSummary;
  total_monthly_cost: MetricSummary;
}

export interface PriceHistogramBucket {
  from: number;
  to: number;
  count: number;
}

export interface DepositsStats {
  with_deposit: number;
  without_deposit: number;
  unknown: number;
  with_deposit_percent: number | null;
  avg_deposit: number | null;
  median_deposit: number | null;
}

export interface AdditionalCostsStats {
  with_additional_cost: number;
  without_additional_cost: number;
  unknown: number;
  with_additional_cost_percent: number | null;
  avg_additional_cost: number | null;
  median_additional_cost: number | null;
}

export interface NegotiationStats {
  negotiable: number;
  non_negotiable: number;
  negotiable_percent: number | null;
}
