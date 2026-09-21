import { Skeleton } from "@/components/ui/skeleton";
import { OfferCard } from "./offer-card";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import type { Offer } from "@/types";

interface OfferGridProps {
  offers: Offer[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
  onClearFilters?: () => void;
  skeletonCount?: number;
}

export function OfferGrid({
  offers,
  isLoading,
  isError,
  onRetry,
  onClearFilters,
  skeletonCount = 6,
}: OfferGridProps) {
  if (isError) {
    return <ErrorState onRetry={onRetry} description="Nie udało się pobrać listy ofert z API." />;
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <Skeleton key={i} className="aspect-[4/3] w-full rounded-xl" style={{ minHeight: 320 }} />
        ))}
      </div>
    );
  }

  if (!offers || offers.length === 0) {
    return <EmptyState onClear={onClearFilters} />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {offers.map((offer) => (
        <OfferCard key={offer.id} offer={offer} />
      ))}
    </div>
  );
}
