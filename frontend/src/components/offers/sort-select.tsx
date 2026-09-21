"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SortField, SortOrder } from "@/types";

const SORT_OPTIONS: { value: `${SortField}:${SortOrder}`; label: string }[] = [
  { value: "created_at:desc", label: "Najnowsze" },
  { value: "total_monthly_cost:asc", label: "Całkowity koszt ↑" },
  { value: "total_monthly_cost:desc", label: "Całkowity koszt ↓" },
  { value: "price:asc", label: "Cena ↑" },
  { value: "price:desc", label: "Cena ↓" },
  { value: "deposit:asc", label: "Kaucja ↑" },
  { value: "additional_cost:asc", label: "Dodatkowe opłaty ↑" },
];

interface SortSelectProps {
  sort: SortField;
  order: SortOrder;
  onChange: (sort: SortField, order: SortOrder) => void;
}

export function SortSelect({ sort, order, onChange }: SortSelectProps) {
  const value = `${sort}:${order}` as const;
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        const [newSort, newOrder] = v.split(":") as [SortField, SortOrder];
        onChange(newSort, newOrder);
      }}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Sortuj" />
      </SelectTrigger>
      <SelectContent>
        {SORT_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
