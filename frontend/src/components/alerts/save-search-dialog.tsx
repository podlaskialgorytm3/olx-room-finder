"use client";

/**
 * Modal "🔔 Zapisz wyszukiwanie" - tworzy alert (`saved_searches`) na
 * podstawie aktualnie ustawionych filtrów ofert (`/offers`, `/favorites`).
 * Użytkownik podaje tylko nazwę i przełącza rodzaje powiadomień - kryteria
 * (miasto/kategoria/dzielnica/cena/powierzchnia) są przepisywane
 * automatycznie z `query`, patrz `backend/routers/saved_searches.py`.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCreateSavedSearch } from "@/hooks";
import { useUserAuthHydrated, useUserAuthStore } from "@/lib/user-auth-store";
import { formatArea, formatPln } from "@/lib/format";
import type { OfferCategory, OffersQuery } from "@/types";

const CATEGORY_LABELS: Record<OfferCategory, string> = { room: "Pokój", apartment: "Mieszkanie" };

interface SaveSearchDialogProps {
  city: string;
  category: OfferCategory;
  query: OffersQuery;
  /** Domyślna nazwa alertu proponowana użytkownikowi. */
  suggestedName?: string;
}

function summarizeCriteria(city: string, category: OfferCategory, query: OffersQuery): string {
  const parts: string[] = [city, CATEGORY_LABELS[category]];
  if (query.district) parts.push(query.district);
  if (query.minPrice != null || query.maxPrice != null) {
    parts.push(`${formatPln(query.minPrice ?? 0)} - ${query.maxPrice != null ? formatPln(query.maxPrice) : "∞"}`);
  }
  if (query.minAreaM2 != null || query.maxAreaM2 != null) {
    parts.push(`${formatArea(query.minAreaM2 ?? 0)} - ${query.maxAreaM2 != null ? formatArea(query.maxAreaM2) : "∞"}`);
  }
  return parts.join(" • ");
}

export function SaveSearchDialog({ city, category, query, suggestedName }: SaveSearchDialogProps) {
  const router = useRouter();
  const hydrated = useUserAuthHydrated();
  const token = useUserAuthStore((state) => state.token);
  const isLoggedIn = hydrated && !!token;

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [notifyNewOffers, setNotifyNewOffers] = useState(true);
  const [notifyPriceDrops, setNotifyPriceDrops] = useState(true);

  const createSavedSearch = useCreateSavedSearch();

  const handleTriggerClick = (e: React.MouseEvent) => {
    if (!isLoggedIn) {
      e.preventDefault();
      router.push("/login");
      return;
    }
    setName(suggestedName ?? `${CATEGORY_LABELS[category]} w ${query.district ?? city}`);
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Podaj nazwę alertu.");
      return;
    }
    createSavedSearch.mutate(
      {
        name: name.trim(),
        city_id: city,
        category,
        districts: query.district ? [query.district] : [],
        min_price: query.minPrice ?? null,
        max_price: query.maxPrice ?? null,
        min_area: query.minAreaM2 ?? null,
        max_area: query.maxAreaM2 ?? null,
        notification_enabled: true,
        notify_new_offers: notifyNewOffers,
        notify_price_drops: notifyPriceDrops,
      },
      {
        onSuccess: () => {
          toast.success("Alert został zapisany. Znajdziesz go na stronie /alerts.");
          setOpen(false);
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Nie udało się zapisać alertu.");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={handleTriggerClick}>
          <Bell className="size-3.5" /> Zapisz wyszukiwanie
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="size-4" /> Zapisz wyszukiwanie
          </DialogTitle>
          <DialogDescription>{summarizeCriteria(city, category, query)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="saved-search-name">Nazwa alertu</Label>
            <Input
              id="saved-search-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Tani pokój na Mokotowie"
              autoFocus
            />
          </div>

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
          <Button onClick={handleSave} disabled={createSavedSearch.isPending}>
            Zapisz
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
