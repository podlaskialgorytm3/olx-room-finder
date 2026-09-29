"use client";

/**
 * Modal edycji istniejącego alertu - pozwala zmienić nazwę i kryteria
 * (miasto/kategoria/dzielnica/cena/powierzchnia) oraz rodzaje powiadomień.
 * Otwierany z `AlertCard` ("Edytuj"), patrz `backend/routers/saved_searches.py::update_saved_search`.
 */

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DistrictSelect } from "@/components/filters/district-select";
import { RangeSliderField } from "@/components/filters/range-slider-field";
import { useUpdateSavedSearch } from "@/hooks";
import { PRICE_RANGE, AREA_RANGE } from "@/lib/constants";
import { formatArea } from "@/lib/format";
import type { SavedSearch } from "@/types";

interface EditAlertDialogProps {
  savedSearch: SavedSearch;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditAlertDialog({ savedSearch, open, onOpenChange }: EditAlertDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj alert</DialogTitle>
        </DialogHeader>
        {/* Remontowany za każdym otwarciem (klucz `open`) - stan formularza
            zawsze startuje z aktualnych danych alertu, bez efektu
            synchronizującego stan po fakcie. */}
        {open && <EditAlertForm key={savedSearch.id} savedSearch={savedSearch} onOpenChange={onOpenChange} />}
      </DialogContent>
    </Dialog>
  );
}

function EditAlertForm({
  savedSearch,
  onOpenChange,
}: {
  savedSearch: SavedSearch;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(savedSearch.name);
  const [district, setDistrict] = useState<string | undefined>(savedSearch.districts[0]);
  const [minPrice, setMinPrice] = useState<number | undefined>(savedSearch.min_price ?? undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(savedSearch.max_price ?? undefined);
  const [minArea, setMinArea] = useState<number | undefined>(savedSearch.min_area ?? undefined);
  const [maxArea, setMaxArea] = useState<number | undefined>(savedSearch.max_area ?? undefined);
  const [notifyNewOffers, setNotifyNewOffers] = useState(savedSearch.notify_new_offers);
  const [notifyPriceDrops, setNotifyPriceDrops] = useState(savedSearch.notify_price_drops);

  const updateSavedSearch = useUpdateSavedSearch();

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Podaj nazwę alertu.");
      return;
    }
    updateSavedSearch.mutate(
      {
        id: savedSearch.id,
        payload: {
          name: name.trim(),
          districts: district ? [district] : [],
          min_price: minPrice ?? null,
          max_price: maxPrice ?? null,
          min_area: minArea ?? null,
          max_area: maxArea ?? null,
          notify_new_offers: notifyNewOffers,
          notify_price_drops: notifyPriceDrops,
        },
      },
      {
        onSuccess: () => {
          toast.success("Alert został zaktualizowany.");
          onOpenChange(false);
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Nie udało się zapisać zmian."),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj alert</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-alert-name">Nazwa alertu</Label>
            <Input id="edit-alert-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Dzielnica</Label>
            <DistrictSelect value={district} onChange={setDistrict} className="w-full" />
          </div>

          <RangeSliderField
            label="Cena"
            min={PRICE_RANGE.min}
            max={PRICE_RANGE.max}
            step={PRICE_RANGE.step}
            value={[minPrice, maxPrice]}
            onChange={([min, max]) => {
              setMinPrice(min);
              setMaxPrice(max);
            }}
          />

          <RangeSliderField
            label="Powierzchnia"
            min={AREA_RANGE.min}
            max={AREA_RANGE.max}
            step={AREA_RANGE.step}
            value={[minArea, maxArea]}
            onChange={([min, max]) => {
              setMinArea(min);
              setMaxArea(max);
            }}
            formatValue={formatArea}
          />

          <div className="space-y-2">
            <Label>Powiadomienia</Label>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="text-sm">Nowe pasujące oferty</span>
              <Switch checked={notifyNewOffers} onCheckedChange={setNotifyNewOffers} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="text-sm">Spadki cen</span>
              <Switch checked={notifyPriceDrops} onCheckedChange={setNotifyPriceDrops} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Anuluj</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={updateSavedSearch.isPending}>
            Zapisz zmiany
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
