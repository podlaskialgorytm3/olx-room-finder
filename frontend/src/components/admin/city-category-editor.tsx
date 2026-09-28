"use client";

/**
 * Formularz zarządzania jedną kategorią ogłoszeń (pokoje albo mieszkania)
 * dla danego miasta - własny link do listingu OLX, harmonogram synchronizacji
 * oraz przyciski uruchomienia/anulowania synchronizacji. Używany przez
 * osobne podstrony `/admin/cities/[city]/rooms` i `/admin/cities/[city]/apartments`,
 * żeby każda kategoria mogła w przyszłości ewoluować niezależnie (inne pola,
 * inna logika) bez wpływu na drugą.
 */

import { useState } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useCancelCitySync, useTriggerCitySync, useUpdateCitySyncHour } from "@/hooks";
import { formatDate, formatNumber } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { CityCategoryConfig, OfferCategoryKey } from "@/types";

export const CATEGORY_LABELS: Record<OfferCategoryKey, string> = { room: "Pokoje", apartment: "Mieszkania" };
export const CATEGORY_LINK_HINTS: Record<OfferCategoryKey, string> = {
  room: "https://www.olx.pl/nieruchomosci/stancje-pokoje/...",
  apartment: "https://www.olx.pl/nieruchomosci/mieszkania/wynajem/...",
};

interface CityCategoryEditorProps {
  city: string;
  category: OfferCategoryKey;
  categoryConfig: CityCategoryConfig;
  /** Renders without the outer Card chrome/title - useful when the parent page already has its own header. */
  bare?: boolean;
}

export function CityCategoryEditor({ city, category, categoryConfig, bare = false }: CityCategoryEditorProps) {
  const updateCity = useUpdateCitySyncHour();
  const triggerSync = useTriggerCitySync();
  const cancelSync = useCancelCitySync();

  const [hour, setHour] = useState(categoryConfig.sync_hour);
  const [minute, setMinute] = useState(categoryConfig.sync_minute);
  const [link, setLink] = useState(categoryConfig.link ?? "");

  const dirty = hour !== categoryConfig.sync_hour || minute !== categoryConfig.sync_minute || link !== (categoryConfig.link ?? "");

  const label = CATEGORY_LABELS[category];

  const handleSave = () => {
    updateCity.mutate(
      { city, payload: { category, sync_hour: hour, sync_minute: minute, link } },
      {
        onSuccess: () => toast.success(`Zapisano ustawienia (${label}).`),
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Nie udało się zapisać zmian.");
        },
      },
    );
  };

  const handleSyncNow = () => {
    triggerSync.mutate(
      { city, category },
      {
        onSuccess: () => toast.success(`Synchronizacja (${label}) uruchomiona.`),
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            toast.info("Synchronizacja już trwa.");
          } else if (err instanceof ApiError && err.status === 422) {
            toast.error("Ustaw najpierw link do listingu OLX dla tej kategorii.");
          } else {
            toast.error("Nie udało się uruchomić synchronizacji.");
          }
        },
      },
    );
  };

  const handleCancelSync = () => {
    cancelSync.mutate(
      { city, category },
      {
        onSuccess: () => toast.success(`Anulowano synchronizację (${label}). Dotychczas pobrane oferty zostały zapisane.`),
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            toast.info("Ta synchronizacja już się zakończyła.");
          } else {
            toast.error("Nie udało się anulować synchronizacji.");
          }
        },
      },
    );
  };

  const body = (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor={`${category}-link`}>Link do listingu OLX</Label>
        <Input
          id={`${category}-link`}
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder={CATEGORY_LINK_HINTS[category]}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Godzina synchronizacji</Label>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={0}
            max={23}
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="w-20"
          />
          <span className="text-muted-foreground">:</span>
          <Input
            type="number"
            min={0}
            max={59}
            value={minute}
            onChange={(e) => setMinute(Number(e.target.value))}
            className="w-20"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Liczba ofert</p>
          <p className="font-medium">{formatNumber(categoryConfig.offers_count)}</p>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">Ostatnia synchronizacja</p>
          <p className="font-medium">
            {formatDate(categoryConfig.last_run?.finished_at ?? categoryConfig.last_run?.started_at)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t pt-4">
        <Button onClick={handleSave} disabled={!dirty || updateCity.isPending}>
          Zapisz zmiany
        </Button>
        {categoryConfig.running ? (
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive/10"
            onClick={handleCancelSync}
            disabled={categoryConfig.cancelling || cancelSync.isPending}
          >
            Anuluj synchronizację
          </Button>
        ) : (
          <Button variant="outline" onClick={handleSyncNow} disabled={triggerSync.isPending || !categoryConfig.link}>
            <RefreshCw className={`size-3.5 ${triggerSync.isPending ? "animate-spin" : ""}`} />
            Synchronizuj teraz
          </Button>
        )}
      </div>
    </div>
  );

  if (bare) {
    return body;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>{label}</CardTitle>
          {categoryConfig.running ? (
            <Badge variant="secondary" className="animate-pulse">
              {categoryConfig.cancelling ? "Anulowanie…" : "W trakcie…"}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
