import Image from "next/image";
import Link from "next/link";
import { ImageOff, MapPin, Wallet, Handshake } from "lucide-react";
import type { Offer } from "@/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCity, formatPln, formatTriState } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function OfferCard({ offer }: { offer: Offer }) {
  const photo = offer.photos?.[0];

  const isNegotiable = offer.negotiable === true;

  return (
    <Card className="group overflow-hidden gap-0 py-0 shadow-sm ring-1 ring-foreground/10 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-primary/30">
      <Link href={`/offers/${offer.id}`} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          {photo ? (
            <Image
              src={photo}
              alt={offer.title}
              fill
              unoptimized
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
              sizes="(min-width: 1024px) 320px, 50vw"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-muted to-muted/60 text-muted-foreground">
              <ImageOff className="size-8" />
              <span className="text-xs">Brak zdjęcia</span>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <Badge className="absolute left-2 top-2 bg-background/90 text-foreground shadow backdrop-blur-sm" variant="secondary">
            <MapPin className="size-3" /> {formatCity(offer.city)}
            {offer.district ? `, ${offer.district}` : ""}
          </Badge>
        </div>
      </Link>

      <CardContent className="flex flex-col gap-3 px-4 pt-4 pb-3">
        <Link
          href={`/offers/${offer.id}`}
          className="line-clamp-2 min-h-[2.75rem] leading-snug font-medium transition-colors group-hover:text-primary"
        >
          {offer.title}
        </Link>

        <div className="space-y-0.5">
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold text-primary">{formatPln(offer.price)}</span>
            {offer.additional_cost !== null && offer.additional_cost !== undefined && (
              <span className="text-xs text-muted-foreground">+ {formatPln(offer.additional_cost)} opłat</span>
            )}
          </div>
          {offer.total_monthly_cost !== null && offer.total_monthly_cost !== undefined && (
            <div className="flex items-baseline justify-between border-t border-dashed pt-1 text-sm">
              <span className="text-muted-foreground">Miesięcznie</span>
              <span className="font-semibold text-foreground">{formatPln(offer.total_monthly_cost)}</span>
            </div>
          )}
        </div>

        <div className="mb-1 flex flex-wrap gap-1.5 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-muted-foreground">
            <Wallet className="size-3.5" /> Kaucja: {offer.has_deposit === false ? "brak" : formatPln(offer.deposit)}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${
              isNegotiable ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400" : "bg-muted text-muted-foreground"
            }`}
          >
            <Handshake className="size-3.5" /> {formatTriState(offer.negotiable, "Negocjowalna", "Cena stała", "Nieznana")}
          </span>
        </div>
      </CardContent>

      <CardFooter className="px-4 pt-3 pb-4">
        <Button asChild className="w-full transition-transform group-hover:scale-[1.02]" size="sm" variant="secondary">
          <Link href={`/offers/${offer.id}`}>Zobacz ogłoszenie</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
