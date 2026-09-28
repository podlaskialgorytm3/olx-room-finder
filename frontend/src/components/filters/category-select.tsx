"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategoryStore, useSelectedCategory, CATEGORY_LABELS, type OfferCategory } from "@/lib/category-store";
import { cn } from "@/lib/utils";

interface CategorySelectProps {
  /** Renders the trigger inline as plain (heading-sized) text instead of a boxed input. */
  variant?: "heading" | "default";
  className?: string;
}

const CATEGORIES: OfferCategory[] = ["room", "apartment"];

/**
 * Globalny przełącznik kategorii ogłoszeń (Pokoje / Mieszkania), widoczny na
 * górze strony. Wybór jest zapamiętywany (localStorage) i filtruje wszystkie
 * widoki (oferty, statystyki, analizę) - analogicznie do `CitySelect`.
 */
export function CategorySelect({ variant = "default", className }: CategorySelectProps) {
  const category = useSelectedCategory();
  const setCategory = useCategoryStore((state) => state.setCategory);

  return (
    <Select value={category} onValueChange={(value) => setCategory(value as OfferCategory)}>
      <SelectTrigger
        className={cn(
          variant === "heading" &&
            "h-auto w-fit border-none bg-transparent p-0 text-[length:inherit] font-[inherit] leading-[inherit] tracking-[inherit] text-inherit shadow-none hover:opacity-80 focus-visible:ring-0 [&_svg]:size-5 [&_svg]:text-current",
          className,
        )}
      >
        <SelectValue placeholder={CATEGORY_LABELS[category]}>{CATEGORY_LABELS[category]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {CATEGORIES.map((c) => (
          <SelectItem key={c} value={c}>
            {CATEGORY_LABELS[c]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
