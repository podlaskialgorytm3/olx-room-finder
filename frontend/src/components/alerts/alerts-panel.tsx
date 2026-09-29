"use client";

/**
 * Panel "🔔 Moje alerty" - lista wszystkich alertów ofertowych zalogowanego
 * użytkownika. Patrz `backend/routers/saved_searches.py`.
 */

import { AlertCard } from "@/components/alerts/alert-card";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useSavedSearches } from "@/hooks";

export function AlertsPanel() {
  const { data, isLoading, isError, refetch } = useSavedSearches();

  if (isError) {
    return <ErrorState onRetry={() => refetch()} description="Nie udało się pobrać listy alertów." />;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const searches = data?.data ?? [];

  if (searches.length === 0) {
    return (
      <EmptyState
        icon="inbox"
        title="Brak zapisanych alertów"
        description={'Na stronie "/offers" ustaw filtry i kliknij "🔔 Zapisz wyszukiwanie", żeby dostawać powiadomienia o nowych ofertach.'}
      />
    );
  }

  return (
    <div className="space-y-4">
      {searches.map((search) => (
        <AlertCard key={search.id} savedSearch={search} />
      ))}
    </div>
  );
}
