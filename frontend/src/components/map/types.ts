export type DistrictGeoJsonProperties = {
  name: string;
};

export interface DistrictFeature extends GeoJSON.Feature<GeoJSON.Geometry, DistrictGeoJsonProperties> {}

export interface DistrictMetricValue {
  district: string;
  count: number;
  avgPrice: number | null;
  medianPrice: number | null;
  avgTotalCost: number | null;
  medianTotalCost: number | null;
}
