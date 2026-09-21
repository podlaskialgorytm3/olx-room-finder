"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WARSAW_DISTRICTS } from "@/lib/constants";

interface DistrictSelectProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  className?: string;
}

export function DistrictSelect({ value, onChange, className }: DistrictSelectProps) {
  return (
    <Select
      value={value ?? "all"}
      onValueChange={(v) => onChange(v === "all" ? undefined : v)}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder="Dzielnica" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Wszystkie dzielnice</SelectItem>
        {WARSAW_DISTRICTS.map((district) => (
          <SelectItem key={district} value={district}>
            {district}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
