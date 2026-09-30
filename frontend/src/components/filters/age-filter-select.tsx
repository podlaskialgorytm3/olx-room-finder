"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

/** Opcje filtra "Wiek oferty" - wartość to liczba godzin (`maxAgeHours`
 * wysyłane do `/api/offers`), `undefined` = brak filtra ("Wszystkie"). */
const AGE_OPTIONS: { value: string; hours: number | undefined; label: string }[] = [
  { value: "all", hours: undefined, label: "Wszystkie" },
  { value: "24", hours: 24, label: "< 24h" },
  { value: "72", hours: 72, label: "< 3 dni" },
  { value: "168", hours: 168, label: "< 7 dni" },
  { value: "720", hours: 720, label: "< 30 dni" },
];

interface AgeFilterSelectProps {
  value: number | undefined;
  onChange: (maxAgeHours: number | undefined) => void;
}

export function AgeFilterSelect({ value, onChange }: AgeFilterSelectProps) {
  const current = AGE_OPTIONS.find((opt) => opt.hours === value)?.value ?? "all";
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">Wiek oferty</Label>
      <Select
        value={current}
        onValueChange={(v) => onChange(AGE_OPTIONS.find((opt) => opt.value === v)?.hours)}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {AGE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
