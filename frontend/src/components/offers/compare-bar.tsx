"use client";

/** Pływający pasek widoczny na każdej stronie, gdy użytkownik ma zaznaczone
 * oferty do porównania (patrz `lib/compare-store.ts`). Pozwala przejść do
 * `/compare` lub wyczyścić cały wybór bez wchodzenia na stronę porównania. */

import Link from "next/link";
import { Scale, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MIN_COMPARE_ITEMS, useCompareHydrated, useCompareStore } from "@/lib/compare-store";

export function CompareBar() {
  const hydrated = useCompareHydrated();
  const ids = useCompareStore((state) => state.ids);
  const clear = useCompareStore((state) => state.clear);

  if (!hydrated || ids.length === 0) return null;

  const canCompare = ids.length >= MIN_COMPARE_ITEMS;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-full border border-border bg-background/95 px-4 py-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Scale className="size-4" />
          Zaznaczono {ids.length}
        </span>
        {canCompare ? (
          <Button asChild size="sm" className="rounded-full">
            <Link href="/compare">Porównaj oferty ({ids.length})</Link>
          </Button>
        ) : (
          <Button size="sm" disabled className="rounded-full" title={`Zaznacz co najmniej ${MIN_COMPARE_ITEMS} oferty`}>
            Porównaj oferty ({ids.length})
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={clear}
          className="rounded-full text-muted-foreground"
          aria-label="Wyczyść porównanie"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
