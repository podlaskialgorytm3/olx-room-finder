"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { ImageOff, Info, Scale, Trash2, X } from "lucide-react";
import { useOffer, useValueScore } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { MAX_COMPARE_ITEMS, MIN_COMPARE_ITEMS, useCompareHydrated, useCompareStore } from "@/lib/compare-store";
import { formatPln, formatArea, formatNumber } from "@/lib/format";
import type { OfferCategory } from "@/types";

const DASH = "—";
const CATEGORY_LABELS: Record<OfferCategory, string> = {
  room: "Pokój",
  apartment: "Mieszkanie",
};

/** Ten sam opis co w `value-score-panel.tsx` - trzymamy w jednym miejscu
 * znaczenie wskaźnika, żeby nie rozjechało się między stronami. */
const VALUE_SCORE_EXPLANATION =
  "To nie jest ocena jakości mieszkania — to wskaźnik statystyczny wyliczony na podstawie odchylenia " +
  "całkowitego kosztu miesięcznego (czynsz + dodatkowe opłaty) od mediany/MAD dzielnicy, skorygowany o " +
  "negocjowalność i wymaganą kaucję. Wyższa wartość oznacza koszt relatywnie korzystniejszy na tle dzielnicy, " +
  "ale nie uwzględnia stanu technicznego, lokalizacji szczegółowej ani innych cech oferty.";

function formatPlnOrDash(value: number | null | undefined): string {
  return value === null || value === undefined ? DASH : formatPln(value);
}

/** Cena/m² licz tylko gdy mamy obie wartości i powierzchnia > 0, żeby
 * uniknąć dzielenia przez zero lub mylącego wyniku dla niekompletnych ofert. */
function formatPricePerM2(price: number | null | undefined, area: number | null | undefined): string {
  if (price === null || price === undefined || !area) return DASH;
  return formatPln(price / area);
}

function orDash(value: string | null | undefined): string {
  return value ? value : DASH;
}

export default function ComparePage() {
  const hydrated = useCompareHydrated();
  const ids = useCompareStore((state) => state.ids);
  const remove = useCompareStore((state) => state.remove);
  const clear = useCompareStore((state) => state.clear);

  // Sloty stałej długości, żeby liczba wywołań hooków była zawsze taka sama
  // niezależnie od tego, ile ofert jest aktualnie zaznaczonych (max 4).
  const q0 = useOffer(ids[0]);
  const q1 = useOffer(ids[1]);
  const q2 = useOffer(ids[2]);
  const q3 = useOffer(ids[3]);
  const queries = [q0, q1, q2, q3].slice(0, ids.length);

  const { data: valueScores } = useValueScore();
  const valueScoreById = new Map((valueScores ?? []).map((item) => [item.id, item.value_score]));

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (ids.length < MIN_COMPARE_ITEMS) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <EmptyState
          icon="inbox"
          title="Zaznacz oferty do porównania"
          description={`Wybierz od ${MIN_COMPARE_ITEMS} do ${MAX_COMPARE_ITEMS} ofert na liście (checkbox "Porównaj"), aby zobaczyć je obok siebie.`}
        />
        <div className="mt-4 text-center">
          <Button asChild variant="outline">
            <Link href="/offers">Przeglądaj oferty</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Scale className="size-6" /> Porównanie ofert ({ids.length})
        </h1>
        <Button variant="outline" size="sm" onClick={clear}>
          <Trash2 className="size-4" /> Wyczyść porównanie
        </Button>
      </div>

      {isError && <ErrorState description="Nie udało się pobrać szczegółów jednej z ofert." />}

      {isLoading && !isError && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ids.map((id) => (
            <Skeleton key={id} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40 bg-muted/40">Parametr</TableHead>
                {queries.map((q, i) => {
                  const offer = q.data;
                  const id = ids[i];
                  const photo = offer?.photos?.[0];
                  return (
                    <TableHead key={id} className="min-w-[200px] align-top">
                      <div className="flex flex-col gap-2 py-2">
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            href={`/offers/${id}`}
                            className="relative block aspect-[4/3] w-full overflow-hidden rounded-lg bg-muted"
                          >
                            {photo ? (
                              <Image src={photo} alt={offer?.title ?? ""} fill unoptimized className="object-cover" sizes="200px" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <ImageOff className="size-6" />
                              </div>
                            )}
                          </Link>
                          <button
                            type="button"
                            onClick={() => remove(id)}
                            aria-label="Usuń z porównania"
                            className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <X className="size-4" />
                          </button>
                        </div>
                        <Link href={`/offers/${id}`} className="line-clamp-2 text-sm font-medium normal-case hover:underline">
                          {offer?.title ?? DASH}
                        </Link>
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              <CompareRow label="Cena" cells={queries.map((q) => formatPlnOrDash(q.data?.price))} />
              <CompareRow label="Powierzchnia" cells={queries.map((q) => (q.data?.area_m2 != null ? formatArea(q.data.area_m2) : DASH))} />
              <CompareRow label="Cena / m²" cells={queries.map((q) => formatPricePerM2(q.data?.price, q.data?.area_m2))} />
              <CompareRow
                label="Kaucja"
                cells={queries.map((q) =>
                  q.data?.has_deposit === false ? "Brak" : formatPlnOrDash(q.data?.deposit),
                )}
              />
              <CompareRow
                label="Koszty dodatkowe"
                cells={queries.map((q) =>
                  q.data?.has_additional_cost === false ? "Brak" : formatPlnOrDash(q.data?.additional_cost),
                )}
              />
              <CompareRow label="Dzielnica" cells={queries.map((q) => orDash(q.data?.district))} />
              <CompareRow label="Typ" cells={queries.map((q) => (q.data?.category ? CATEGORY_LABELS[q.data.category] : DASH))} />
              <CompareRow
                label={
                  <span className="inline-flex items-center gap-1.5">
                    Value Score
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Co oznacza value score?"
                        >
                          <Info className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs whitespace-normal text-left">
                        {VALUE_SCORE_EXPLANATION}
                      </TooltipContent>
                    </Tooltip>
                  </span>
                }
                cells={queries.map((q) => {
                  const score = q.data ? valueScoreById.get(q.data.id) : undefined;
                  return score != null ? formatNumber(score) : DASH;
                })}
              />
            </TableBody>
          </Table>
        </div>
      )}

      {!isLoading && !isError && (
        <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong className="font-medium text-foreground">Co oznacza Value Score? </strong>
            {VALUE_SCORE_EXPLANATION}
          </span>
        </p>
      )}
    </div>
  );
}

function CompareRow({ label, cells }: { label: ReactNode; cells: string[] }) {
  return (
    <TableRow>
      <TableCell className="bg-muted/20 font-medium">{label}</TableCell>
      {cells.map((cell, i) => (
        <TableCell key={i}>{cell}</TableCell>
      ))}
    </TableRow>
  );
}
