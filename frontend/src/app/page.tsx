"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, TrendingUp, Wallet, BarChart3 } from "lucide-react";
import { WarsawMap } from "@/components/map";
import { DistrictDetailPanel } from "@/components/map/district-detail-panel";
import { SearchBar } from "@/components/filters/search-bar";
import { QuickFilterBar } from "@/components/filters/quick-filter-bar";
import { KpiCard } from "@/components/common/kpi-card";
import { OfferGrid } from "@/components/offers/offer-grid";
import { Button } from "@/components/ui/button";
import { useOffers, useStatisticsOverview } from "@/hooks";
import { formatNumber, formatPln } from "@/lib/format";
import { countActiveFilters } from "@/lib/filter-utils";
import type { OfferFilters } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const [filters, setFilters] = useState<OfferFilters>({});

  const overview = useStatisticsOverview(filters);
  const recentOffers = useOffers({ ...filters, sort: "created_at", order: "desc", limit: 6, page: 1 });

  const activeCount = countActiveFilters(filters);

  const patchFilters = (patch: Partial<OfferFilters>) => setFilters((prev) => ({ ...prev, ...patch }));
  const clearFilters = () => setFilters({});

  const goToOffers = () => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
    }
    router.push(`/offers${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero + search */}
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Znajdź pokój w Warszawie</h1>
          <p className="mt-1 text-muted-foreground">
            Przeglądaj aktualne oferty OLX, porównuj dzielnice na mapie i filtruj po cenie i kosztach.
          </p>
        </div>

        <SearchBar
          value={filters.search ?? ""}
          onChange={(search) => patchFilters({ search: search || undefined })}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <QuickFilterBar filters={filters} onChange={patchFilters} onClear={clearFilters} activeCount={activeCount} />
          <Button onClick={goToOffers} className="shrink-0">
            Szukaj ofert
          </Button>
        </div>
      </section>

      {/* Map */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WarsawMap
            selectedDistrict={filters.district}
            onSelectDistrict={(district) => patchFilters({ district })}
          />
        </div>
        <div className="space-y-4">
          {filters.district ? (
            <DistrictDetailPanel district={filters.district} onClose={() => patchFilters({ district: undefined })} />
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Kliknij dzielnicę na mapie, aby zobaczyć jej statystyki i przejść do ofert.
            </div>
          )}
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Liczba ofert"
          value={formatNumber(overview.data?.count)}
          icon={Building2}
          isLoading={overview.isLoading}
        />
        <KpiCard
          label="Średnia cena"
          value={formatPln(overview.data?.price.avg)}
          icon={TrendingUp}
          isLoading={overview.isLoading}
        />
        <KpiCard
          label="Mediana ceny"
          value={formatPln(overview.data?.price.median)}
          icon={BarChart3}
          isLoading={overview.isLoading}
        />
        <KpiCard
          label="Średni całkowity koszt"
          value={formatPln(overview.data?.total_monthly_cost.avg)}
          icon={Wallet}
          isLoading={overview.isLoading}
        />
      </section>

      {/* Recent offers */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ostatnio znalezione oferty</h2>
          <Button variant="link" asChild>
            <Link href="/offers">Zobacz wszystkie →</Link>
          </Button>
        </div>
        <OfferGrid
          offers={recentOffers.data?.data}
          isLoading={recentOffers.isLoading}
          isError={recentOffers.isError}
          onRetry={() => recentOffers.refetch()}
          onClearFilters={clearFilters}
        />
      </section>
    </div>
  );
}
