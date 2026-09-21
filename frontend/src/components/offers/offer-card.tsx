import Image from "next/image";
import Link from "next/link";
import { ImageOff, MapPin, Wallet, Handshake } from "lucide-react";
import type { Offer } from "@/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPln, formatTriState } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function OfferCard({ offer }: { offer: Offer }) {
  const photo = offer.photos?.[0];

  return (
    <Card className="overflow-hidden gap-0 py-0 shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/offers/${offer.id}`} className="block">
        <div className="relative aspect-[4/3] w-full bg-muted">
          {photo ? (
            <Image
              src={photo}
              alt={offer.title}
              fill
              unoptimized
              className="object-cover"
              sizes="(min-width: 1024px) 320px, 50vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageOff className="size-8" />
            </div>
          )}
          {offer.district && (
            <Badge className="absolute left-2 top-2 bg-background/90 text-foreground shadow" variant="secondary">
              <MapPin className="size-3" /> {offer.district}
            </Badge>
          )}
        </div>
      </Link>

      <CardContent className="flex flex-col gap-2 px-4 pt-4">
        <Link href={`/offers/${offer.id}`} className="line-clamp-1 font-medium hover:underline">
          {offer.title}
        </Link>

        <div className="space-y-0.5">
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-semibold">{formatPln(offer.price)}</span>
            {offer.additional_cost !== null && offer.additional_cost !== undefined && (
              <span className="text-xs text-muted-foreground">+ {formatPln(offer.additional_cost)} opłat</span>
            )}
          </div>
          <div className="flex items-baseline justify-between border-t border-dashed pt-1 text-sm">
            <span className="text-muted-foreground">Miesięcznie</span>
            <span className="font-semibold text-foreground">{formatPln(offer.total_monthly_cost)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Wallet className="size-3.5" /> Kaucja: {offer.has_deposit === false ? "brak" : formatPln(offer.deposit)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Handshake className="size-3.5" /> {formatTriState(offer.negotiable, "Negocjowalna", "Cena stała", "Nieznana")}
          </span>
        </div>
      </CardContent>

      <CardFooter className="px-4 pb-4">
        <Button asChild className="w-full" size="sm" variant="secondary">
          <Link href={`/offers/${offer.id}`}>Zobacz ogłoszenie</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
