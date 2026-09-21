"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface TriStateSelectProps {
  label: string;
  value: boolean | undefined;
  onChange: (value: boolean | undefined) => void;
  yesLabel?: string;
  noLabel?: string;
}

/**
 * Filter control for tri-state offer fields. Note this only affects the
 * *filter* (which must be a plain true/false/omitted query param) — it is
 * NOT the same as displaying `null` values, which represent "unknown" data
 * on individual offers.
 */
export function TriStateSelect({ label, value, onChange, yesLabel = "Tak", noLabel = "Nie" }: TriStateSelectProps) {
  const current = value === undefined ? "all" : value ? "true" : "false";
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Select
        value={current}
        onValueChange={(v) => onChange(v === "all" ? undefined : v === "true")}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Wszystkie</SelectItem>
          <SelectItem value="true">{yesLabel}</SelectItem>
          <SelectItem value="false">{noLabel}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
