"use client";

import { useState } from "react";
import { MapPinned, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api";
import { useCheckOfferRoute } from "@/hooks";

/**
 * Sekcja "📍 Sprawdź dojazd" na stronie szczegółów oferty - pozwala
 * użytkownikowi wpisać dowolne miejsce docelowe (np. "Politechnika
 * Warszawska") i sprawdzić szacowany czas dojazdu komunikacją publiczną
 * oraz odległość z lokalizacji oferty. Trasa jest liczona wyłącznie
 * on-demand, po kliknięciu przycisku - patrz `POST /api/offers/{id}/route`.
 */
export function OfferRouteCheck({ offerId }: { offerId: string }) {
  const [destination, setDestination] = useState("");
  const { mutate, data, isPending, error, reset } = useCheckOfferRoute(offerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) return;
    mutate(destination.trim());
  };

  const errorMessage =
    error instanceof ApiError ? error.message : error ? "Nie udało się obliczyć trasy dla podanych lokalizacji." : null;

  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <MapPinned className="size-5" /> Sprawdź dojazd
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={destination}
          onChange={(e) => {
            setDestination(e.target.value);
            if (data || error) reset();
          }}
          placeholder="np. Politechnika Warszawska"
          className="sm:max-w-sm"
        />
        <Button type="submit" disabled={isPending || !destination.trim()}>
          <Navigation className="size-4" />
          {isPending ? "Sprawdzanie..." : "Sprawdź dojazd"}
        </Button>
      </form>

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      {data && (
        <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <span>🚇 Czas dojazdu: {data.duration_min} min</span>
          <span>📏 Odległość: {data.distance_km.toLocaleString("pl-PL", { maximumFractionDigits: 1 })} km</span>
        </div>
      )}
    </div>
  );
}
