"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, ExternalLink, Pencil, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorState } from "@/components/common/error-state";
import { PaginationControls } from "@/components/offers/pagination-controls";
import { OfferEditDialog } from "@/components/admin/offer-edit-dialog";
import { useAdminOfferDistricts, useAdminOffers, useCityConfigs, useDeleteOffer, useUpdateOffer } from "@/hooks";
import { formatCity, formatPln, formatTriState, truncateText } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { cn } from "cn";
import type { OfferDetail, OffersQuery, OfferStatus, SortField } from "@/types";

const ALL = "all" as const;

const STATUS_LABELS: Record<OfferStatus, string> = {
  pending: "Oczekuje na zatwierdzenie",
  approved: "Opublikowane",
  rejected: "Odrzucone",
};

function statusBadgeVariant(status: OfferStatus): "default" | "secondary" | "outline" {
  if (status === "approved") return "default";
  if (status === "pending") return "secondary";
  return "outline";
}

export function RoomsManagementPanel() {
  const [city, setCity] = useState<string | undefined>(undefined);
  const [district, setDistrict] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<OfferStatus | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortField>("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [editingOffer, setEditingOffer] = useState<OfferDetail | null>(null);

  const cities = useCityConfigs();
  const districts = useAdminOfferDistricts(city);
  const deleteOffer = useDeleteOffer();
  const updateOffer = useUpdateOffer();

  const handleSort = (field: SortField) => {
    setPage(1);
    if (sort === field) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSort(field);
      setOrder("desc");
    }
  };

  const query: OffersQuery = useMemo(
    () => ({
      city,
      district,
      status,
      search: search.trim() || undefined,
      minPrice: minPrice.trim() ? Number(minPrice) : undefined,
      maxPrice: maxPrice.trim() ? Number(maxPrice) : undefined,
      page,
      limit: 20,
      sort,
      order,
    }),
    [city, district, status, search, minPrice, maxPrice, page, sort, order],
  );

  const offers = useAdminOffers(query);

  const resetPageAnd = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const handleDelete = (offer: OfferDetail) => {
    if (!window.confirm(`Na pewno usunąć ofertę "${offer.title}"? Tej operacji nie można cofnąć.`)) {
      return;
    }
    deleteOffer.mutate(offer.id, {
      onSuccess: () => toast.success("Usunięto ofertę."),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Nie udało się usunąć oferty."),
    });
  };

  const handleApprove = (offer: OfferDetail) => {
    updateOffer.mutate(
      { id: offer.id, payload: { status: "approved", rejection_reason: null } },
      {
        onSuccess: () => toast.success(`Zatwierdzono ogłoszenie "${offer.title}".`),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Nie udało się zatwierdzić ogłoszenia."),
      },
    );
  };

  const handleReject = (offer: OfferDetail) => {
    const reason = window.prompt("Powód odrzucenia (widoczny dla wynajmującego, opcjonalnie):", "") ?? undefined;
    updateOffer.mutate(
      { id: offer.id, payload: { status: "rejected", rejection_reason: reason || null } },
      {
        onSuccess: () => toast.success(`Odrzucono ogłoszenie "${offer.title}".`),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Nie udało się odrzucić ogłoszenia."),
      },
    );
  };

  const renderSortIcon = (field: SortField) => {
    if (sort !== field) return <ArrowUpDown className="size-3.5 text-muted-foreground/50" />;
    return order === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />;
  };

  const renderSortableHead = (field: SortField, label: string, className?: string) => (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => handleSort(field)}
        className={cn(
          "inline-flex items-center gap-1 hover:text-foreground",
          sort === field && "font-semibold text-foreground",
        )}
      >
        {label}
        {renderSortIcon(field)}
      </button>
    </TableHead>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtry</CardTitle>
          <CardDescription>Zawęź listę pokoi po mieście, dzielnicy, cenie, statusie lub treści ogłoszenia.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-1.5">
            <Label>Miasto</Label>
            <Select
              value={city ?? ALL}
              onValueChange={(v) => resetPageAnd(() => { setCity(v === ALL ? undefined : v); setDistrict(undefined); })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Wszystkie miasta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Wszystkie miasta</SelectItem>
                {cities.data?.map((c) => (
                  <SelectItem key={c.city} value={c.city}>
                    {c.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Dzielnica</Label>
            <Select value={district ?? ALL} onValueChange={(v) => resetPageAnd(() => setDistrict(v === ALL ? undefined : v))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Wszystkie dzielnice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Wszystkie dzielnice</SelectItem>
                {districts.data?.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status ?? ALL} onValueChange={(v) => resetPageAnd(() => setStatus(v === ALL ? undefined : (v as OfferStatus)))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Wszystkie statusy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Wszystkie statusy</SelectItem>
                <SelectItem value="pending">Oczekuje na zatwierdzenie</SelectItem>
                <SelectItem value="approved">Opublikowane</SelectItem>
                <SelectItem value="rejected">Odrzucone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rooms-search">Szukaj</Label>
            <Input
              id="rooms-search"
              placeholder="Tytuł, opis, adres…"
              value={search}
              onChange={(e) => resetPageAnd(() => setSearch(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rooms-min-price">Cena od</Label>
            <Input
              id="rooms-min-price"
              type="number"
              min={0}
              value={minPrice}
              onChange={(e) => resetPageAnd(() => setMinPrice(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rooms-max-price">Cena do</Label>
            <Input
              id="rooms-max-price"
              type="number"
              min={0}
              value={maxPrice}
              onChange={(e) => resetPageAnd(() => setMaxPrice(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pokoje</CardTitle>
          <CardDescription>
            {offers.data ? `${offers.data.pagination.total} ofert spełnia wybrane filtry.` : "Lista wszystkich pokoi w bazie."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {offers.isLoading && <Skeleton className="h-64 w-full" />}
          {offers.isError && <ErrorState onRetry={() => offers.refetch()} />}
          {offers.data && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tytuł</TableHead>
                    <TableHead>Miasto</TableHead>
                    <TableHead>Dzielnica</TableHead>
                    {renderSortableHead("price", "Cena")}
                    {renderSortableHead("total_monthly_cost", "Koszt całkowity")}
                    <TableHead>Negocjacja</TableHead>
                    <TableHead>Status</TableHead>
                    {renderSortableHead("views_count", "Wyświetlenia", "text-right")}
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.data.data.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell className="w-[18rem] max-w-[18rem]">
                        <Link
                          href={`/offers/${encodeURIComponent(offer.id)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-w-0 items-center gap-1 font-medium text-foreground hover:text-primary hover:underline"
                          title={offer.title}
                        >
                          <span className="truncate">{truncateText(offer.title, 60)}</span>
                          <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                        </Link>
                        <p className="truncate text-xs text-muted-foreground">{offer.address ?? "brak adresu"}</p>
                      </TableCell>
                      <TableCell>{formatCity(offer.city)}</TableCell>
                      <TableCell>{offer.district ?? "brak danych"}</TableCell>
                      <TableCell>{formatPln(offer.price)}</TableCell>
                      <TableCell>{formatPln(offer.total_monthly_cost)}</TableCell>
                      <TableCell>
                        <Badge variant={offer.negotiable ? "secondary" : "outline"}>
                          {formatTriState(offer.negotiable, "Tak", "Nie", "Brak danych")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={statusBadgeVariant(offer.status)}>{STATUS_LABELS[offer.status]}</Badge>
                          {offer.source === "landlord" && (
                            <p className="text-xs text-muted-foreground">Od wynajmującego</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{offer.views_count}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {offer.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:bg-green-600/10"
                                onClick={() => handleApprove(offer)}
                                disabled={updateOffer.isPending}
                              >
                                <Check className="size-3.5" />
                                Zatwierdź
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => handleReject(offer)}
                                disabled={updateOffer.isPending}
                              >
                                <X className="size-3.5" />
                                Odrzuć
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/offers/${encodeURIComponent(offer.id)}`} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="size-3.5" />
                              Podgląd
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingOffer(offer)}>
                            <Pencil className="size-3.5" />
                            Edytuj
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(offer)}
                            disabled={deleteOffer.isPending}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {offers.data.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        Brak ofert spełniających wybrane filtry.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <PaginationControls
                page={page}
                totalPages={offers.data.pagination.total_pages}
                onPageChange={setPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <OfferEditDialog offer={editingOffer} open={editingOffer !== null} onOpenChange={(open) => !open && setEditingOffer(null)} />
    </div>
  );
}

