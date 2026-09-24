"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
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
import { useAdminOfferDistricts, useAdminOffers, useCityConfigs, useDeleteOffer } from "@/hooks";
import { formatCity, formatPln, formatTriState } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { OfferDetail, OffersQuery } from "@/types";

const ALL = "all" as const;

export function RoomsManagementPanel() {
  const [city, setCity] = useState<string | undefined>(undefined);
  const [district, setDistrict] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [page, setPage] = useState(1);
  const [editingOffer, setEditingOffer] = useState<OfferDetail | null>(null);

  const cities = useCityConfigs();
  const districts = useAdminOfferDistricts(city);
  const deleteOffer = useDeleteOffer();

  const query: OffersQuery = useMemo(
    () => ({
      city,
      district,
      search: search.trim() || undefined,
      minPrice: minPrice.trim() ? Number(minPrice) : undefined,
      maxPrice: maxPrice.trim() ? Number(maxPrice) : undefined,
      page,
      limit: 20,
      sort: "created_at",
      order: "desc",
    }),
    [city, district, search, minPrice, maxPrice, page],
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtry</CardTitle>
          <CardDescription>Zawęź listę pokoi po mieście, dzielnicy, cenie lub treści ogłoszenia.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                    <TableHead>Cena</TableHead>
                    <TableHead>Koszt całkowity</TableHead>
                    <TableHead>Negocjacja</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.data.data.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell className="max-w-[20rem]">
                        <p className="truncate font-medium">{offer.title}</p>
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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
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
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
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
