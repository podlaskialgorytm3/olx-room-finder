"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HelpCircle, MapPin, X } from "lucide-react";
import { SearchBar } from "@/components/filters/search-bar";
import { DistrictSelect } from "@/components/filters/district-select";
import { RangeSliderField } from "@/components/filters/range-slider-field";
import { TriStateSelect } from "@/components/filters/tri-state-select";
import { OfferGrid } from "@/components/offers/offer-grid";
import { SortSelect } from "@/components/offers/sort-select";
import { PaginationControls } from "@/components/offers/pagination-controls";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useOffers } from "@/hooks";
import { parseOffersQuery, offersQueryToParams } from "@/lib/url-filters";
import { PRICE_RANGE, TOTAL_COST_RANGE } from "@/lib/constants";
import type { OffersQuery, SortField, SortOrder } from "@/types";

export function OffersPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = useMemo(() => parseOffersQuery(searchParams), [searchParams]);
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const sort = query.sort ?? "created_at";
  const order = query.order ?? "desc";

  const { data, isLoading, isError, refetch } = useOffers({ ...query, page, limit, sort, order });

  const updateQuery = (patch: Partial<OffersQuery>, resetPage = true) => {
    const next: OffersQuery = { ...query, ...patch, page: resetPage ? 1 : (patch.page ?? query.page) };
    const params = offersQueryToParams(next);
    router.push(`/offers${Object.keys(params).length ? `?${new URLSearchParams(params).toString()}` : ""}`);
  };

  const clearFilters = () => router.push("/offers");

  const total = data?.pagination.total ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Oferty pokoi</h1>
        <SearchBar value={query.search ?? ""} onChange={(search) => updateQuery({ search: search || undefined })} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
        {/* Filters sidebar */}
        <aside>
          <Card className="lg:sticky lg:top-24">
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">Filtry</h2>
                <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                  <X className="size-3.5" /> Wyczyść
                </Button>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Dzielnica</label>
                <DistrictSelect
                  value={query.district}
                  onChange={(district) => updateQuery({ district })}
                  className="w-full"
                />
              </div>

              <RangeSliderField
                label="Cena"
                min={PRICE_RANGE.min}
                max={PRICE_RANGE.max}
                step={PRICE_RANGE.step}
                value={[query.minPrice, query.maxPrice]}
                onChange={([minPrice, maxPrice]) => updateQuery({ minPrice, maxPrice })}
              />

              <RangeSliderField
                label="Całkowity koszt miesięczny"
                min={TOTAL_COST_RANGE.min}
                max={TOTAL_COST_RANGE.max}
                step={TOTAL_COST_RANGE.step}
                value={[query.minTotalMonthlyCost, query.maxTotalMonthlyCost]}
                onChange={([minTotalMonthlyCost, maxTotalMonthlyCost]) =>
                  updateQuery({ minTotalMonthlyCost, maxTotalMonthlyCost })
                }
              />

              <TriStateSelect
                label="Kaucja"
                value={query.hasDeposit}
                onChange={(hasDeposit) => updateQuery({ hasDeposit })}
                yesLabel="Wymagana"
                noLabel="Bez kaucji"
              />
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Switch
                    id="only-additional-cost-sidebar"
                    checked={query.hasAdditionalCost === true}
                    onCheckedChange={(checked) => updateQuery({ hasAdditionalCost: checked ? true : undefined })}
                  />
                  <label htmlFor="only-additional-cost-sidebar" className="text-sm font-medium">
                    Tylko z dodatkowymi dopłatami
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="Informacja">
                        <HelpCircle className="size-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Z tą opcją, będzie możliwość zobaczenia pełnych cen</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <TriStateSelect
                label="Negocjacja ceny"
                value={query.negotiable}
                onChange={(negotiable) => updateQuery({ negotiable })}
                yesLabel="Negocjowalna"
                noLabel="Cena stała"
              />
            </CardContent>
          </Card>
        </aside>

        {/* Results */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {query.district && (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-accent-foreground">
                  <MapPin className="size-3.5" /> {query.district}
                </span>
              )}
              <span>{isLoading ? "Ładowanie…" : `${total} ofert`}</span>
            </div>
            <SortSelect
              sort={sort as SortField}
              order={order as SortOrder}
              onChange={(newSort, newOrder) => updateQuery({ sort: newSort, order: newOrder }, false)}
            />
          </div>

          <OfferGrid
            offers={data?.data}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            onClearFilters={clearFilters}
          />

          <PaginationControls
            page={page}
            totalPages={data?.pagination.total_pages ?? 0}
            onPageChange={(newPage) => updateQuery({ page: newPage }, false)}
          />
        </div>
      </div>
    </div>
  );
}
