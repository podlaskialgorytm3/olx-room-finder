"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import type { Layer, LeafletMouseEvent, Path } from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { useDistrictStatistics } from "@/hooks";
import { MapMetricToggle } from "./map-metric-toggle";
import { MapLegend } from "./map-legend";
import { getFillColor, getMetricValue } from "./color-scale";
import type { DistrictMetricValue } from "./types";
import type { MapMetric } from "@/lib/constants";
import { formatNumber, formatPln } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";

const WARSAW_CENTER: [number, number] = [52.2297, 21.0122];

interface WarsawMapProps {
  selectedDistrict: string | undefined;
  onSelectDistrict: (district: string | undefined) => void;
}

function FitBounds({ data }: { data: FeatureCollection | null }) {
  const map = useMap();
  useEffect(() => {
    if (!data) return;
    // Lazily import leaflet only on the client to build a bounds object from the GeoJSON.
    import("leaflet").then((L) => {
      const layer = L.geoJSON(data as never);
      const bounds = layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [16, 16] });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  return null;
}

export function WarsawMap({ selectedDistrict, onSelectDistrict }: WarsawMapProps) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [metric, setMetric] = useState<MapMetric>("count");
  const { data: districtStats, isLoading: statsLoading } = useDistrictStatistics();

  useEffect(() => {
    fetch("/data/warsaw-districts.geojson")
      .then((res) => {
        if (!res.ok) throw new Error("geojson not found");
        return res.json();
      })
      .then(setGeoData)
      .catch(() => setGeoError(true));
  }, []);

  const valuesByDistrict = useMemo(() => {
    const map = new Map<string, DistrictMetricValue>();
    for (const stat of districtStats ?? []) {
      map.set(stat.district, {
        district: stat.district,
        count: stat.count,
        avgPrice: stat.price.avg,
        medianPrice: stat.price.median,
        avgTotalCost: stat.total_monthly_cost.avg,
        medianTotalCost: stat.total_monthly_cost.median,
      });
    }
    return map;
  }, [districtStats]);

  const [minValue, maxValue] = useMemo(() => {
    const values = Array.from(valuesByDistrict.values())
      .map((v) => getMetricValue(v, metric))
      .filter((v): v is number => v !== null);
    if (values.length === 0) return [0, 0];
    return [Math.min(...values), Math.max(...values)];
  }, [valuesByDistrict, metric]);

  if (geoError) {
    return (
      <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Nie znaleziono granic dzielnic</p>
        <p>
          Dodaj plik <code className="rounded bg-muted px-1 py-0.5">public/data/warsaw-districts.geojson</code>, aby
          włączyć interaktywną mapę.
        </p>
      </div>
    );
  }

  if (!geoData) {
    return <Skeleton className="h-full min-h-[420px] w-full rounded-xl" />;
  }

  const styleFeature = (feature: Feature<Geometry, { name: string }> | undefined) => {
    const name = feature?.properties?.name;
    const value = name ? valuesByDistrict.get(name) : undefined;
    const isSelected = name === selectedDistrict;
    return {
      fillColor: getFillColor(getMetricValue(value, metric), minValue, maxValue),
      fillOpacity: isSelected ? 0.9 : 0.75,
      weight: isSelected ? 3 : 1,
      color: isSelected ? "#1d4ed8" : "#64748b",
    };
  };

  const onEachFeature = (feature: Feature<Geometry, { name: string }>, layer: Layer) => {
    const name = feature.properties?.name;
    const value = name ? valuesByDistrict.get(name) : undefined;

    if (name) {
      layer.bindTooltip(
        `<div class="font-sans">
          <div class="font-semibold">${name}</div>
          <div>${formatNumber(value?.count ?? 0)} ofert</div>
          <div>Mediana: ${formatPln(value?.medianPrice ?? null)}</div>
          <div>Średni koszt: ${formatPln(value?.avgTotalCost ?? null)}</div>
        </div>`,
        { sticky: true, direction: "top", className: "!rounded-lg !border-0 !bg-popover !text-popover-foreground !shadow-md !px-3 !py-2 !text-xs" },
      );
    }

    layer.on({
      mouseover: (e: LeafletMouseEvent) => {
        (e.target as Path).setStyle({ weight: 3, fillOpacity: 0.9 });
      },
      mouseout: (e: LeafletMouseEvent) => {
        (e.target as Path).setStyle(styleFeature(feature));
      },
      click: () => {
        if (!name) return;
        onSelectDistrict(name === selectedDistrict ? undefined : name);
      },
    });
  };

  return (
    <div className="relative isolate z-0 h-full min-h-[420px] w-full overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={WARSAW_CENTER}
        zoom={11}
        scrollWheelZoom={false}
        className="h-full w-full"
        style={{ minHeight: 420 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds data={geoData} />
        <GeoJSON key={metric} data={geoData} style={styleFeature} onEachFeature={onEachFeature} />
      </MapContainer>

      <div className="pointer-events-none absolute inset-3 z-[1000] flex flex-col justify-between">
        <div className="pointer-events-auto self-start">
          <MapMetricToggle value={metric} onChange={setMetric} />
        </div>
        <div className="pointer-events-auto self-start">
          <MapLegend metric={metric} min={minValue} max={maxValue} />
        </div>
      </div>

      {statsLoading && (
        <div className="absolute right-3 top-3 z-[1000] rounded-md bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow">
          Ładowanie statystyk…
        </div>
      )}
    </div>
  );
}
