"use client";

import { useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, ImageOff, MapPin } from "lucide-react";
import { useOffer } from "@/hooks";
import { useDistrictStatisticsByName } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ErrorState } from "@/components/common/error-state";
import { formatPercent, formatPln, formatTriState } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function OfferDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: offer, isLoading, isError, refetch } = useOffer(params.id);
  const { data: districtStats } = useDistrictStatisticsByName(offer?.district ?? undefined);
  const [activePhoto, setActivePhoto] = useState(0);

  const handleBack = () => {
    // Wracamy przez historię przeglądarki, żeby przywrócić poprzedni URL
    // listy ofert razem z zastosowanymi filtrami (query params). Jeśli w tej
    // karcie nie ma wcześniejszego wpisu w historii (np. wejście z
    // zewnętrznego linku), wracamy po prostu do listy bez filtrów.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/offers");
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
        <Skeleton className="h-96 w-full rounded-xl" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError || !offer) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <ErrorState onRetry={() => refetch()} description="Nie udało się pobrać szczegółów oferty." />
      </div>
    );
  }

  const photos = offer.photos ?? [];
  const median = districtStats?.price.median ?? null;
  const diff = median !== null && offer.price !== null ? offer.price - median : null;
  const diffPercent = median && offer.price !== null ? ((offer.price - median) / median) * 100 : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Button variant="ghost" onClick={handleBack} className="-ml-2 text-muted-foreground">
        <ArrowLeft className="size-4" /> Powrót
      </Button>

      {/* Gallery */}
      <div className="space-y-2">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
          {photos.length > 0 ? (
            <Image
              src={photos[activePhoto]}
              alt={offer.title}
              fill
              unoptimized
              className="object-cover"
              sizes="(min-width: 1024px) 768px, 100vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageOff className="size-10" />
            </div>
          )}
        </div>
        {photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.map((photo, i) => (
              <button
                key={photo + i}
                onClick={() => setActivePhoto(i)}
                className={cn(
                  "relative size-16 shrink-0 overflow-hidden rounded-md border-2",
                  i === activePhoto ? "border-primary" : "border-transparent",
                )}
              >
                <Image src={photo} alt="" fill unoptimized className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Title + price */}
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{offer.title}</h1>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-3xl font-bold">{formatPln(offer.price)}</span>
          {offer.total_monthly_cost !== null && offer.total_monthly_cost !== undefined && (
            <span className="text-lg text-muted-foreground">{formatPln(offer.total_monthly_cost)} całkowity koszt</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {offer.district && (
            <Badge variant="secondary">
              <MapPin className="size-3.5" /> {offer.district}
            </Badge>
          )}
          {offer.address && <span>{offer.address}</span>}
        </div>
      </div>

      {/* Key facts */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Fact label="Kaucja" value={offer.has_deposit === false ? "Brak" : formatPln(offer.deposit)} />
        {offer.has_additional_cost !== null && offer.has_additional_cost !== undefined && (
          <Fact label="Dodatkowe opłaty" value={offer.has_additional_cost === false ? "Brak" : formatPln(offer.additional_cost)} />
        )}
        <Fact label="Negocjowalna" value={formatTriState(offer.negotiable)} />
      </div>

      <Separator />

      {/* Description */}
      {offer.description && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Opis</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{offer.description}</p>
        </div>
      )}

      <Separator />

      {/* Price analysis */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Analiza ceny</h2>
        {median === null ? (
          <p className="text-sm text-muted-foreground">
            Brak wystarczających danych o dzielnicy, aby porównać cenę oferty z medianą.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Fact label="Cena oferty" value={formatPln(offer.price)} />
            <Fact label="Mediana dzielnicy" value={formatPln(median)} />
            <Fact label="Różnica" value={formatPln(diff)} />
            <Fact label="Różnica %" value={formatPercent(diffPercent)} />
          </div>
        )}
      </div>

      {offer.link && (
        <Button asChild size="lg" className="w-full sm:w-auto">
          <a href={offer.link} target="_blank" rel="noopener noreferrer">
            Otwórz ogłoszenie OLX <ExternalLink className="size-4" />
          </a>
        </Button>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}
