"use client";

import { HelpCircle, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DistrictSelect } from "./district-select";
import { RangeSliderField } from "./range-slider-field";
import { TriStateSelect } from "./tri-state-select";
import { PRICE_RANGE, TOTAL_COST_RANGE } from "@/lib/constants";
import type { OfferFilters } from "@/types";
import { formatPln } from "@/lib/format";

interface QuickFilterBarProps {
  filters: OfferFilters;
  onChange: (patch: Partial<OfferFilters>) => void;
  onClear: () => void;
  activeCount: number;
}

export function QuickFilterBar({ filters, onChange, onClear, activeCount }: QuickFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DistrictSelect
        value={filters.district}
        onChange={(district) => onChange({ district })}
        className="w-[180px]"
      />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-between">
            Cena{" "}
            {(filters.minPrice || filters.maxPrice) && (
              <span className="text-muted-foreground">
                {formatPln(filters.minPrice ?? PRICE_RANGE.min)}–{formatPln(filters.maxPrice ?? PRICE_RANGE.max)}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <RangeSliderField
            label="Cena"
            min={PRICE_RANGE.min}
            max={PRICE_RANGE.max}
            step={PRICE_RANGE.step}
            value={[filters.minPrice, filters.maxPrice]}
            onChange={([minPrice, maxPrice]) => onChange({ minPrice, maxPrice })}
          />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-between">
            Koszt całkowity{" "}
            {(filters.minTotalMonthlyCost || filters.maxTotalMonthlyCost) && (
              <span className="text-muted-foreground">
                {formatPln(filters.minTotalMonthlyCost ?? TOTAL_COST_RANGE.min)}–
                {formatPln(filters.maxTotalMonthlyCost ?? TOTAL_COST_RANGE.max)}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <RangeSliderField
            label="Całkowity koszt miesięczny"
            min={TOTAL_COST_RANGE.min}
            max={TOTAL_COST_RANGE.max}
            step={TOTAL_COST_RANGE.step}
            value={[filters.minTotalMonthlyCost, filters.maxTotalMonthlyCost]}
            onChange={([minTotalMonthlyCost, maxTotalMonthlyCost]) =>
              onChange({ minTotalMonthlyCost, maxTotalMonthlyCost })
            }
          />
        </PopoverContent>
      </Popover>

      <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
        <Switch
          id="only-additional-cost"
          checked={filters.hasAdditionalCost === true}
          onCheckedChange={(checked) => onChange({ hasAdditionalCost: checked ? true : undefined })}
        />
        <label htmlFor="only-additional-cost" className="text-sm font-medium">
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

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline">
            <SlidersHorizontal className="size-4" /> Więcej filtrów
            {activeCount > 0 && (
              <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Więcej filtrów</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-5 px-4">
            <TriStateSelect
              label="Kaucja"
              value={filters.hasDeposit}
              onChange={(hasDeposit) => onChange({ hasDeposit })}
              yesLabel="Wymagana"
              noLabel="Bez kaucji"
            />
            <TriStateSelect
              label="Kwota kaucji podana"
              value={filters.hasDepositCost}
              onChange={(hasDepositCost) => onChange({ hasDepositCost })}
              yesLabel="Podana"
              noLabel="Nieznana"
            />
            <TriStateSelect
              label="Negocjacja ceny"
              value={filters.negotiable}
              onChange={(negotiable) => onChange({ negotiable })}
              yesLabel="Negocjowalna"
              noLabel="Cena stała"
            />
          </div>
          <SheetFooter>
            <Button variant="ghost" onClick={onClear}>
              <X className="size-4" /> Wyczyść filtry
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {activeCount > 0 && (
        <Button variant="ghost" onClick={onClear} className="text-muted-foreground">
          <X className="size-4" /> Wyczyść filtry
        </Button>
      )}
    </div>
  );
}
