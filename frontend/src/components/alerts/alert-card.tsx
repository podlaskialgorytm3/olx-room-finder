"use client";

/**
 * Karta pojedynczego alertu na `/alerts` - status (aktywny/wyłączony),
 * podsumowanie kryteriów, liczba pasujących ofert / wygenerowanych
 * powiadomień oraz akcje: edycja, włącz/wyłącz, usunięcie, podgląd
 * pasujących ofert. Patrz `backend/routers/saved_searches.py`.
 */

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OfferGrid } from "@/components/offers/offer-grid";
import { EditAlertDialog } from "@/components/alerts/edit-alert-dialog";
import { useDeleteSavedSearch, useSavedSearchMatches, useToggleSavedSearch } from "@/hooks";
import { formatDate, formatPln, formatArea } from "@/lib/format";
import type { SavedSearch } from "@/types";

const CATEGORY_LABELS: Record<string, string> = { room: "Pokój", apartment: "Mieszkanie" };

function criteriaSummary(search: SavedSearch): string {
  const parts: string[] = [];
  if (search.city_id) parts.push(search.city_id.charAt(0) + search.city_id.slice(1).toLowerCase());
  if (search.districts.length) parts.push(search.districts.join(", "));
  if (search.category) parts.push(CATEGORY_LABELS[search.category] ?? search.category);
  if (search.max_price != null) parts.push(`≤ ${formatPln(search.max_price)}`);
  else if (search.min_price != null) parts.push(`≥ ${formatPln(search.min_price)}`);
  if (search.min_area != null || search.max_area != null) {
    parts.push(`${search.min_area != null ? formatArea(search.min_area) : "0 m²"}+`);
  }
  return parts.join(" • ") || "Wszystkie oferty";
}

export function AlertCard({ savedSearch }: { savedSearch: SavedSearch }) {
  const [editOpen, setEditOpen] = useState(false);
  const [showMatches, setShowMatches] = useState(false);
  const toggleSavedSearch = useToggleSavedSearch();
  const deleteSavedSearch = useDeleteSavedSearch();
  const matches = useSavedSearchMatches(savedSearch.id, showMatches);

  const handleToggle = () => {
    toggleSavedSearch.mutate(
      { id: savedSearch.id, enabled: savedSearch.notification_enabled },
      {
        onSuccess: () =>
          toast.success(savedSearch.notification_enabled ? "Alert wyłączony." : "Alert włączony."),
        onError: (error) => toast.error(error instanceof Error ? error.message : "Nie udało się zmienić statusu."),
      },
    );
  };

  const handleDelete = () => {
    if (!confirm(`Usunąć alert "${savedSearch.name}"?`)) return;
    deleteSavedSearch.mutate(savedSearch.id, {
      onSuccess: () => toast.success("Alert został usunięty."),
      onError: (error) => toast.error(error instanceof Error ? error.message : "Nie udało się usunąć alertu."),
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>{savedSearch.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{criteriaSummary(savedSearch)}</p>
          </div>
          {savedSearch.notification_enabled ? (
            <Badge variant="secondary" className="gap-1">
              🟢 Aktywny
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              ⚪ Wyłączony
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted-foreground sm:grid-cols-4">
          <div>
            <span className="block text-xs">Utworzony</span>
            {formatDate(savedSearch.created_at)}
          </div>
          <div>
            <span className="block text-xs">Ostatnio sprawdzony</span>
            {savedSearch.last_checked_at ? formatDate(savedSearch.last_checked_at) : "jeszcze nie"}
          </div>
          <div>
            <span className="block text-xs">Znaleziono ofert</span>
            {savedSearch.matches_count}
          </div>
          <div>
            <span className="block text-xs">Nowe powiadomienia</span>
            {savedSearch.new_notifications_count}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-3.5" /> Edytuj
          </Button>
          <Button variant="outline" size="sm" onClick={handleToggle} disabled={toggleSavedSearch.isPending}>
            {savedSearch.notification_enabled ? (
              <>
                <PowerOff className="size-3.5" /> Wyłącz
              </>
            ) : (
              <>
                <Power className="size-3.5" /> Włącz
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowMatches((v) => !v)}>
            {showMatches ? "Ukryj pasujące oferty" : "Pokaż pasujące oferty"}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleteSavedSearch.isPending}
            className="ml-auto"
          >
            <Trash2 className="size-3.5" /> Usuń
          </Button>
        </div>

        {showMatches && (
          <div className="border-t border-border pt-4">
            <OfferGrid offers={matches.data} isLoading={matches.isLoading} isError={matches.isError} />
            {matches.data && matches.data.length > 0 && (
              <div className="mt-2 text-right">
                <Link href="/offers" className="text-xs text-primary hover:underline">
                  Zobacz wszystkie na /offers
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <EditAlertDialog savedSearch={savedSearch} open={editOpen} onOpenChange={setEditOpen} />
    </Card>
  );
}
