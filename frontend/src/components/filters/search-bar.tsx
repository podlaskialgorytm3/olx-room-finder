"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Debounced search input so we don't refetch on every keystroke. */
export function SearchBar({ value, onChange, placeholder, className }: SearchBarProps) {
  const [local, setLocal] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);

  // Re-sync local state when the external `value` changes (e.g. cleared filters, browser back).
  // Adjusting state during render (not in an effect) avoids an extra render pass.
  if (value !== syncedValue) {
    setSyncedValue(value);
    setLocal(value);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (local !== value) onChange(local);
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return (
    <div className={className}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder={placeholder ?? "Szukaj po nazwie, adresie lub opisie..."}
          className="h-14 rounded-xl pl-12 text-base shadow-sm"
        />
      </div>
    </div>
  );
}
