"use client";

import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCityStore, useSelectedCity, DEFAULT_CITY } from "@/lib/city-store";
import { usePublicCities } from "@/hooks";
import { cn } from "@/lib/utils";

interface CitySelectProps {
  /** Renders the trigger inline as plain (heading-sized) text instead of a boxed input. */
  variant?: "heading" | "default";
  className?: string;
}

/**
 * Przełącznik wybranego miasta - klikając w nazwę miasta użytkownik może
 * wybrać inne spośród skonfigurowanych w panelu administratora. Wybór jest
 * zapamiętywany (localStorage) i wpływa na wszystkie widoki (oferty,
 * statystyki, analizę).
 */
export function CitySelect({ variant = "default", className }: CitySelectProps) {
  const city = useSelectedCity();
  const setCity = useCityStore((state) => state.setCity);
  const { data: cities, isLoading } = usePublicCities();

  // Guards against a hydration mismatch: the fetched city list can resolve at a
  // slightly different point in time on the server vs. the client, which would
  // otherwise make the `disabled` attribute differ between SSR and first paint.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const currentLabel = cities?.find((c) => c.city === city)?.display_name ?? city ?? DEFAULT_CITY;

  return (
    <Select value={city} onValueChange={setCity} disabled={mounted ? isLoading || !cities?.length : true}>
      <SelectTrigger
        className={cn(
          variant === "heading" &&
            "h-auto w-fit border-none bg-transparent p-0 text-[length:inherit] font-[inherit] leading-[inherit] tracking-[inherit] text-inherit shadow-none hover:opacity-80 focus-visible:ring-0 [&_svg]:size-5 [&_svg]:text-current",
          className,
        )}
      >
        <SelectValue placeholder={currentLabel}>{currentLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {cities?.map((c) => (
          <SelectItem key={c.city} value={c.city}>
            {c.display_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
