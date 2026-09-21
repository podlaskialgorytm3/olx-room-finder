/** Types mirroring `backend/schemas/analysis.py`. */

export type AnalysisMetric = "price" | "total_monthly_cost" | "additional_cost" | "deposit";

export interface PriceVsDistrict {
  id: string;
  title: string;
  district: string | null;
  price: number | null;
  district_median: number | null;
  difference: number | null;
  difference_percent: number | null;
}

export interface InitialCost {
  id: string;
  title: string;
  total_monthly_cost: number | null;
  deposit: number | null;
  initial_cost: number | null;
  initial_cost_is_estimate: boolean;
}

export interface DistrictProfile {
  district: string;
  count: number;
  median_price: number | null;
  median_total_monthly_cost: number | null;
  median_deposit: number | null;
  negotiable_percent: number | null;
  no_deposit_percent: number | null;
  has_additional_cost_percent: number | null;
}

export interface OutlierBounds {
  q1: number | null;
  q3: number | null;
  iqr: number | null;
  lower_bound: number | null;
  upper_bound: number | null;
}

export interface OutlierItem {
  id: string;
  title: string;
  metric: string;
  value: number;
}

export interface Outliers {
  metric: string;
  bounds: OutlierBounds | null;
  outliers: OutlierItem[];
}

export interface CostDistributionBucket {
  from: number;
  to: number;
  count: number;
}

export interface ValueScoreComponents {
  price_z_score: number | null;
  total_cost_z_score: number | null;
  negotiable_bonus: number;
  deposit_penalty: number;
}

export interface ValueScore {
  id: string;
  title: string;
  district: string | null;
  value_score: number | null;
  reason: string | null;
  components: ValueScoreComponents | null;
}
