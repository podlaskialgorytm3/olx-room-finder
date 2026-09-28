"use client";

/**
 * Panel najemcy - "Ulubione". Lista ogłoszeń dodanych do ulubionych przez
 * zalogowanego najemcę (`role='tenant'`). Patrz `backend/routers/favorites.py`.
 */

import { Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OfferGrid } from "@/components/offers/offer-grid";
import { useFavorites } from "@/hooks";

export function FavoritesPanel() {
  const favorites = useFavorites(1, 50);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="size-5 fill-red-500 text-red-500" /> Ulubione pokoje
        </CardTitle>
        <CardDescription>
          {favorites.data ? `${favorites.data.pagination.total} polubionych ogłoszeń.` : "Ogłoszenia dodane do ulubionych."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <OfferGrid
          offers={favorites.data?.data}
          isLoading={favorites.isLoading}
          isError={favorites.isError}
          onRetry={() => favorites.refetch()}
        />
      </CardContent>
    </Card>
  );
}
