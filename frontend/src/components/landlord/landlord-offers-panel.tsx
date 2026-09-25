"use client";

/**
 * Panel wynajmującego - "Moje ogłoszenia". Pozwala zalogowanemu, zatwierdzonemu
 * kontu wynajmującego dodawać nowe ogłoszenia (zdjęcia jako linki URL) oraz
 * edytować/usuwać istniejące. Każde utworzone lub edytowane ogłoszenie trafia
 * ze statusem "Oczekuje na zatwierdzenie" i staje się widoczne publicznie
 * dopiero po akceptacji administratora - patrz `backend/routers/landlord.py`.
 */

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ErrorState } from "@/components/common/error-state";
import { PaginationControls } from "@/components/offers/pagination-controls";
import { useCreateMyOffer, useDeleteMyOffer, useMyOffers, useUpdateMyOffer, usePublicCities } from "@/hooks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPln, truncateText } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { LandlordOfferCreate, LandlordOfferUpdate, OfferDetail, OfferStatus } from "@/types";

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

interface OfferFormState {
  title: string;
  city: string;
  district: string;
  address: string;
  price: string;
  additionalCost: string;
  deposit: string;
  totalMonthlyCost: string;
  negotiable: boolean;
  description: string;
  link: string;
  photosText: string;
}

function emptyFormState(cityDefault: string): OfferFormState {
  return {
    title: "",
    city: cityDefault,
    district: "",
    address: "",
    price: "",
    additionalCost: "",
    deposit: "",
    totalMonthlyCost: "",
    negotiable: false,
    description: "",
    link: "",
    photosText: "",
  };
}

function offerToFormState(offer: OfferDetail): OfferFormState {
  return {
    title: offer.title,
    city: offer.city,
    district: offer.district ?? "",
    address: offer.address ?? "",
    price: offer.price?.toString() ?? "",
    additionalCost: offer.additional_cost?.toString() ?? "",
    deposit: offer.deposit?.toString() ?? "",
    totalMonthlyCost: offer.total_monthly_cost?.toString() ?? "",
    negotiable: Boolean(offer.negotiable),
    description: offer.description ?? "",
    link: offer.link ?? "",
    photosText: offer.photos.join("\n"),
  };
}

function parsePhotos(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function toNumberOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/** Wspólny formularz dodawania/edycji ogłoszenia. */
function OfferForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: {
  initial: OfferFormState;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: OfferFormState) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<OfferFormState>(initial);
  const cities = usePublicCities();

  const update = <K extends keyof OfferFormState>(key: K, value: OfferFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) {
      toast.error("Tytuł nie może być pusty.");
      return;
    }
    if (!form.city.trim()) {
      toast.error("Miasto nie może być puste.");
      return;
    }
    if (!form.price.trim() || Number.isNaN(Number(form.price))) {
      toast.error("Podaj poprawną cenę.");
      return;
    }
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="offer-title">Tytuł ogłoszenia</Label>
        <Input id="offer-title" value={form.title} onChange={(e) => update("title", e.target.value)} required />
      </div>

      <div className="space-y-1.5">
        <Label>Miasto</Label>
        <Select value={form.city} onValueChange={(v) => update("city", v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Wybierz miasto" />
          </SelectTrigger>
          <SelectContent>
            {cities.data?.map((c) => (
              <SelectItem key={c.city} value={c.city}>
                {c.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="offer-district">Dzielnica</Label>
        <Input id="offer-district" value={form.district} onChange={(e) => update("district", e.target.value)} />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="offer-address">Adres</Label>
        <Input id="offer-address" value={form.address} onChange={(e) => update("address", e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="offer-price">Cena (PLN)</Label>
        <Input
          id="offer-price"
          type="number"
          min={0}
          value={form.price}
          onChange={(e) => update("price", e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="offer-total">Całkowity koszt miesięczny (opcjonalnie)</Label>
        <Input
          id="offer-total"
          type="number"
          min={0}
          placeholder="Wyliczone automatycznie, jeśli puste"
          value={form.totalMonthlyCost}
          onChange={(e) => update("totalMonthlyCost", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="offer-additional-cost">Dodatkowe opłaty (PLN)</Label>
        <Input
          id="offer-additional-cost"
          type="number"
          min={0}
          value={form.additionalCost}
          onChange={(e) => update("additionalCost", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="offer-deposit">Kaucja (PLN)</Label>
        <Input
          id="offer-deposit"
          type="number"
          min={0}
          value={form.deposit}
          onChange={(e) => update("deposit", e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2 sm:col-span-2">
        <input
          id="offer-negotiable"
          type="checkbox"
          className="size-4 rounded border-input"
          checked={form.negotiable}
          onChange={(e) => update("negotiable", e.target.checked)}
        />
        <Label htmlFor="offer-negotiable" className="cursor-pointer">
          Cena do negocjacji
        </Label>
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="offer-link">Link zewnętrzny (opcjonalnie)</Label>
        <Input id="offer-link" value={form.link} onChange={(e) => update("link", e.target.value)} />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="offer-photos">Zdjęcia - linki (jeden URL na linię)</Label>
        <textarea
          id="offer-photos"
          value={form.photosText}
          onChange={(e) => update("photosText", e.target.value)}
          rows={4}
          placeholder={"https://example.com/zdjecie1.jpg\nhttps://example.com/zdjecie2.jpg"}
          className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
      </div>

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="offer-description">Opis</Label>
        <textarea
          id="offer-description"
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
          rows={5}
          className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
      </div>

      <DialogFooter className="sm:col-span-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Anuluj
        </Button>
        <Button type="submit" disabled={pending}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}

function CreateOfferDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createOffer = useCreateMyOffer();
  const cities = usePublicCities();
  const defaultCity = cities.data?.[0]?.city ?? "";

  const handleSubmit = (form: OfferFormState) => {
    const payload: LandlordOfferCreate = {
      title: form.title.trim(),
      city: form.city.trim(),
      district: form.district.trim() || undefined,
      address: form.address.trim() || undefined,
      price: Number(form.price),
      total_monthly_cost: toNumberOrUndefined(form.totalMonthlyCost),
      additional_cost: toNumberOrUndefined(form.additionalCost),
      has_additional_cost: form.additionalCost.trim() ? true : undefined,
      deposit: toNumberOrUndefined(form.deposit),
      has_deposit: form.deposit.trim() ? true : undefined,
      negotiable: form.negotiable,
      description: form.description.trim() || undefined,
      link: form.link.trim() || undefined,
      photos: parsePhotos(form.photosText),
    };

    createOffer.mutate(payload, {
      onSuccess: () => {
        toast.success("Ogłoszenie zostało dodane i oczekuje na zatwierdzenie przez administratora.");
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : "Nie udało się dodać ogłoszenia.");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nowe ogłoszenie</DialogTitle>
          <DialogDescription>
            Po dodaniu ogłoszenie trafi do kolejki moderacji i pojawi się publicznie dopiero po zatwierdzeniu przez
            administratora.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <OfferForm
            key={defaultCity}
            initial={emptyFormState(defaultCity)}
            submitLabel="Dodaj ogłoszenie"
            pending={createOffer.isPending}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditOfferDialog({ offer, onOpenChange }: { offer: OfferDetail | null; onOpenChange: (open: boolean) => void }) {
  const updateOffer = useUpdateMyOffer();
  if (!offer) return null;

  const handleSubmit = (form: OfferFormState) => {
    const payload: LandlordOfferUpdate = {
      title: form.title.trim(),
      city: form.city.trim(),
      district: form.district.trim() || null,
      address: form.address.trim() || null,
      price: Number(form.price),
      total_monthly_cost: toNumberOrUndefined(form.totalMonthlyCost) ?? null,
      additional_cost: toNumberOrUndefined(form.additionalCost) ?? null,
      has_additional_cost: form.additionalCost.trim() ? true : null,
      deposit: toNumberOrUndefined(form.deposit) ?? null,
      has_deposit: form.deposit.trim() ? true : null,
      negotiable: form.negotiable,
      description: form.description.trim() || null,
      link: form.link.trim() || null,
      photos: parsePhotos(form.photosText),
    };

    updateOffer.mutate(
      { id: offer.id, payload },
      {
        onSuccess: () => {
          toast.success("Zapisano zmiany. Ogłoszenie ponownie oczekuje na zatwierdzenie przez administratora.");
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Nie udało się zapisać zmian.");
        },
      },
    );
  };

  return (
    <Dialog open={offer !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edytuj ogłoszenie</DialogTitle>
          <DialogDescription>
            Każda zmiana wymaga ponownego zatwierdzenia przez administratora, zanim ogłoszenie znów będzie widoczne
            publicznie.
          </DialogDescription>
        </DialogHeader>
        <OfferForm
          key={offer.id}
          initial={offerToFormState(offer)}
          submitLabel="Zapisz zmiany"
          pending={updateOffer.isPending}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function LandlordOffersPanel() {
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<OfferDetail | null>(null);

  const offers = useMyOffers(page, 20);
  const deleteOffer = useDeleteMyOffer();

  const handleDelete = (offer: OfferDetail) => {
    if (!window.confirm(`Na pewno usunąć ogłoszenie "${offer.title}"? Tej operacji nie można cofnąć.`)) {
      return;
    }
    deleteOffer.mutate(offer.id, {
      onSuccess: () => toast.success("Usunięto ogłoszenie."),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Nie udało się usunąć ogłoszenia."),
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Moje ogłoszenia</CardTitle>
            <CardDescription>
              Dodawaj i zarządzaj własnymi ogłoszeniami. Nowe/edytowane ogłoszenie wymaga zatwierdzenia przez
              administratora, zanim pojawi się publicznie.
            </CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" />
            Nowe ogłoszenie
          </Button>
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
                    <TableHead>Cena</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers.data.data.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell className="w-[18rem] max-w-[18rem]">
                        <span className="font-medium" title={offer.title}>
                          {truncateText(offer.title, 60)}
                        </span>
                        <p className="truncate text-xs text-muted-foreground">{offer.address ?? "brak adresu"}</p>
                      </TableCell>
                      <TableCell>{offer.city}</TableCell>
                      <TableCell>{formatPln(offer.price)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={statusBadgeVariant(offer.status)}>{STATUS_LABELS[offer.status]}</Badge>
                          {offer.status === "rejected" && offer.rejection_reason && (
                            <p className="text-xs text-destructive">Powód: {offer.rejection_reason}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {offer.status === "approved" && (
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/offers/${encodeURIComponent(offer.id)}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="size-3.5" />
                                Podgląd
                              </Link>
                            </Button>
                          )}
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
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nie masz jeszcze żadnych ogłoszeń.{" "}
                        <button type="button" className="underline" onClick={() => setCreateOpen(true)}>
                          Dodaj pierwsze
                        </button>
                        .
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <PaginationControls page={page} totalPages={offers.data.pagination.total_pages} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      <CreateOfferDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditOfferDialog offer={editingOffer} onOpenChange={(open) => !open && setEditingOffer(null)} />
    </div>
  );
}
