"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateOffer } from "@/hooks";
import { ApiError } from "@/lib/api";
import type { OfferDetail, OfferUpdate } from "@/types";

interface OfferEditDialogProps {
  offer: OfferDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TriState = "true" | "false" | "unknown";

function toTriState(value: boolean | null | undefined): TriState {
  if (value === true) return "true";
  if (value === false) return "false";
  return "unknown";
}

function fromTriState(value: TriState): boolean | null {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function TriStateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: TriState;
  onChange: (value: TriState) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={(v) => onChange(v as TriState)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Tak</SelectItem>
          <SelectItem value="false">Nie</SelectItem>
          <SelectItem value="unknown">Nieznane</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

/** Formularz edycji pojedynczej oferty - pozwala poprawić dowolne pole
 * zapisane przy synchronizacji (np. błędnie rozpoznaną dzielnicę czy kwotę
 * kaucji przez LLM parsujący ogłoszenia OLX).
 *
 * Zamontowany z `key={offer.id}` przez rodzica, żeby stan formularza
 * inicjalizował się bezpośrednio z propsów (bez efektu wywołującego
 * `setState`) przy każdej zmianie edytowanej oferty. */
function OfferEditForm({
  offer,
  onSaved,
  onCancel,
}: {
  offer: OfferDetail;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const updateOffer = useUpdateOffer();

  const [title, setTitle] = useState(offer.title ?? "");
  const [city, setCity] = useState(offer.city ?? "");
  const [district, setDistrict] = useState(offer.district ?? "");
  const [address, setAddress] = useState(offer.address ?? "");
  const [link, setLink] = useState(offer.link ?? "");
  const [price, setPrice] = useState(offer.price?.toString() ?? "");
  const [additionalCost, setAdditionalCost] = useState(offer.additional_cost?.toString() ?? "");
  const [deposit, setDeposit] = useState(offer.deposit?.toString() ?? "");
  const [totalMonthlyCost, setTotalMonthlyCost] = useState(offer.total_monthly_cost?.toString() ?? "");
  const [description, setDescription] = useState(offer.description ?? "");
  const [negotiable, setNegotiable] = useState<TriState>(toTriState(offer.negotiable));
  const [hasAdditionalCost, setHasAdditionalCost] = useState<TriState>(toTriState(offer.has_additional_cost));
  const [hasDeposit, setHasDeposit] = useState<TriState>(toTriState(offer.has_deposit));
  const [hasDepositCost, setHasDepositCost] = useState<TriState>(toTriState(offer.has_deposit_cost));

  const toNumberOrNull = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!title.trim()) {
      toast.error("Tytuł nie może być pusty.");
      return;
    }
    if (!city.trim()) {
      toast.error("Miasto nie może być puste.");
      return;
    }

    const payload: OfferUpdate = {
      title: title.trim(),
      city: city.trim(),
      district: district.trim() || null,
      address: address.trim() || null,
      link: link.trim() || null,
      description: description.trim() || null,
      price: toNumberOrNull(price),
      additional_cost: toNumberOrNull(additionalCost),
      deposit: toNumberOrNull(deposit),
      total_monthly_cost: toNumberOrNull(totalMonthlyCost),
      negotiable: fromTriState(negotiable),
      has_additional_cost: fromTriState(hasAdditionalCost),
      has_deposit: fromTriState(hasDeposit),
      has_deposit_cost: fromTriState(hasDepositCost),
    };

    updateOffer.mutate(
      { id: offer.id, payload },
      {
        onSuccess: () => {
          toast.success("Zapisano zmiany w ofercie.");
          onSaved();
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Nie udało się zapisać zmian.");
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="edit-title">Tytuł</Label>
        <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-city">Miasto</Label>
        <Input id="edit-city" value={city} onChange={(e) => setCity(e.target.value.toUpperCase())} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-district">Dzielnica</Label>
        <Input id="edit-district" value={district} onChange={(e) => setDistrict(e.target.value)} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="edit-address">Adres</Label>
        <Input id="edit-address" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="edit-link">Link OLX</Label>
        <Input id="edit-link" value={link} onChange={(e) => setLink(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-price">Cena</Label>
        <Input id="edit-price" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-total">Całkowity koszt miesięczny</Label>
        <Input
          id="edit-total"
          type="number"
          min={0}
          value={totalMonthlyCost}
          onChange={(e) => setTotalMonthlyCost(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-additional-cost">Dodatkowe opłaty</Label>
        <Input
          id="edit-additional-cost"
          type="number"
          min={0}
          value={additionalCost}
          onChange={(e) => setAdditionalCost(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-deposit">Kaucja</Label>
        <Input id="edit-deposit" type="number" min={0} value={deposit} onChange={(e) => setDeposit(e.target.value)} />
      </div>

      <TriStateField label="Cena negocjowalna" value={negotiable} onChange={setNegotiable} />
      <TriStateField label="Są dodatkowe opłaty" value={hasAdditionalCost} onChange={setHasAdditionalCost} />
      <TriStateField label="Jest kaucja" value={hasDeposit} onChange={setHasDeposit} />
      <TriStateField label="Znana kwota kaucji" value={hasDepositCost} onChange={setHasDepositCost} />

      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="edit-description">Opis</Label>
        <textarea
          id="edit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
        />
      </div>

      <DialogFooter className="sm:col-span-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Anuluj
        </Button>
        <Button type="submit" disabled={updateOffer.isPending}>
          Zapisz zmiany
        </Button>
      </DialogFooter>
    </form>
  );
}

export function OfferEditDialog({ offer, open, onOpenChange }: OfferEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edytuj pokój</DialogTitle>
          <DialogDescription>
            Popraw dane oferty {offer?.id ? <code>#{offer.id}</code> : null} - np. błędnie rozpoznaną dzielnicę,
            cenę czy kaucję.
          </DialogDescription>
        </DialogHeader>

        {offer && (
          <OfferEditForm
            key={offer.id}
            offer={offer}
            onSaved={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
