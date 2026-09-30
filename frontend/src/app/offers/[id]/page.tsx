"use client";

import { useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Heart, ImageOff, MapPin, Pencil, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { useOffer, useFavoriteIds, useToggleFavorite } from "@/hooks";
import { useDistrictStatisticsByName } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ErrorState } from "@/components/common/error-state";
import { PhotoLightbox } from "@/components/offers/photo-lightbox";
import { OfferRouteCheck } from "@/components/offers/offer-route-check";
import { OfferEditDialog } from "@/components/admin/offer-edit-dialog";
import { formatCity, formatDateShort, formatOfferAge, formatPercent, formatPln, formatTriState, formatArea } from "@/lib/format";
import { getPriceDiffColor } from "@/lib/price-diff-color";
import { ApiError } from "@/lib/api";
import { useUserAuthHydrated, useUserAuthStore } from "@/lib/user-auth-store";
import { useAdminAuthHydrated, useAdminAuthStore } from "@/lib/admin-auth-store";
import { cn } from "@/lib/utils";

export default function OfferDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: offer, isLoading, isError, refetch } = useOffer(params.id);
  const { data: districtStats } = useDistrictStatisticsByName(offer?.district ?? undefined);
  const [activePhoto, setActivePhoto] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const hydrated = useUserAuthHydrated();
  const user = useUserAuthStore((state) => state.user);
  const isTenant = hydrated && user?.role === "tenant";
  const adminHydrated = useAdminAuthHydrated();
  const adminToken = useAdminAuthStore((state) => state.token);
  const isAdmin = adminHydrated && !!adminToken;
  const favoriteIds = useFavoriteIds();
  const isFavorite = isTenant && (favoriteIds.data?.includes(params.id) ?? false);
  const toggleFavorite = useToggleFavorite();

  const handleToggleFavorite = () => {
    toggleFavorite.mutate(
      { offerId: params.id, isFavorite },
      {
        onError: (err) =>
          toast.error(err instanceof ApiError ? err.message : "Nie udało się zaktualizować ulubionych."),
      },
    );
  };

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
  const age = formatOfferAge(offer.created_at);
  // Porównanie z medianą dzielnicy ma opierać się na całkowitym koszcie
  // miesięcznym (czynsz + dodatkowe opłaty), a nie samej cenie bazowej -
  // to on odzwierciedla realny koszt najmu i jest spójny z resztą statystyk.
  const offerTotalCost = offer.total_monthly_cost ?? offer.price;
  const median = districtStats?.total_monthly_cost.median ?? null;
  const diff = median !== null && offerTotalCost !== null ? offerTotalCost - median : null;
  const diffPercent = median && offerTotalCost !== null ? ((offerTotalCost - median) / median) * 100 : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Button variant="ghost" onClick={handleBack} className="-ml-2 text-muted-foreground">
        <ArrowLeft className="size-4" /> Powrót
      </Button>

      {/* Gallery */}
      <div className="space-y-2">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
          {photos.length > 0 ? (
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="absolute inset-0 cursor-zoom-in"
              aria-label="Powiększ zdjęcie"
            >
              <Image
                src={photos[activePhoto]}
                alt={offer.title}
                fill
                unoptimized
                className="object-contain"
                sizes="(min-width: 1024px) 768px, 100vw"
              />
            </button>
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

      <PhotoLightbox
        photos={photos}
        index={activePhoto}
        onIndexChange={setActivePhoto}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        alt={offer.title}
      />

      {/* Title + price */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold">{offer.title}</h1>
          <div className="flex shrink-0 gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                Edytuj
              </Button>
            )}
            {isTenant && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleFavorite}
                disabled={toggleFavorite.isPending}
              >
                <Heart className={cn("size-4", isFavorite ? "fill-red-500 text-red-500" : "")} />
                {isFavorite ? "W ulubionych" : "Dodaj do ulubionych"}
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-3xl font-bold">{formatPln(offer.price)}</span>
          {offer.total_monthly_cost !== null && offer.total_monthly_cost !== undefined && (
            <span className="text-lg text-muted-foreground">{formatPln(offer.total_monthly_cost)} całkowity koszt</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {offer.district && (
            <Badge variant="secondary">
              <MapPin className="size-3.5" /> {formatCity(offer.city)}, {offer.district}
            </Badge>
          )}
          {age && <Badge className={age.colorClassName}>{age.emoji} Oferta od {age.label}</Badge>}
          {offer.address && <span>{offer.address}</span>}
        </div>
      </div>

      {/* Key facts */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Fact label="Powierzchnia" value={formatArea(offer.area_m2)} />
        <Fact label="Kaucja" value={offer.has_deposit === false ? "Brak" : formatPln(offer.deposit)} />
        {offer.has_additional_cost !== null && offer.has_additional_cost !== undefined && (
          <Fact label="Dodatkowe opłaty" value={offer.has_additional_cost === false ? "Brak" : formatPln(offer.additional_cost)} />
        )}
        <Fact label="Negocjowalna" value={formatTriState(offer.negotiable)} />
        {offer.created_at && <Fact label="Data dodania" value={formatDateShort(offer.created_at)} />}
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

      {/* Sprawdź dojazd */}
      <OfferRouteCheck offerId={offer.id} />

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
            <Fact label="Cena oferty (całk. koszt mies.)" value={formatPln(offerTotalCost)} />
            <Fact label="Mediana dzielnicy" value={formatPln(median)} />
            <Fact label="Różnica" value={formatPln(diff)} color={getPriceDiffColor(diffPercent)} />
            <Fact label="Różnica %" value={formatPercent(diffPercent)} color={getPriceDiffColor(diffPercent)} />
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

      {isAdmin && (
        <OfferEditDialog
          offer={offer}
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) refetch();
          }}
        />
      )}
    </div>
  );
}

function Fact({ label, value, color }: { label: string; value: string; color?: { text: string; background: string } }) {
  return (
    <div
      className="rounded-lg border border-border bg-card px-3 py-2"
      style={color ? { backgroundColor: color.background, borderColor: color.text } : undefined}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold" style={color ? { color: color.text } : undefined}>
        {value}
      </p>
    </div>
  );
}
