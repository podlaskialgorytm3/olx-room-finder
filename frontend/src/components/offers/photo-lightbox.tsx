"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface PhotoLightboxProps {
  photos: string[];
  index: number;
  onIndexChange: (index: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alt: string;
}

// Minimalny dystans przesunięcia palcem (px), od którego traktujemy gest jako
// świadome przełączenie zdjęcia, a nie przypadkowe drgnięcie/tap.
const SWIPE_THRESHOLD = 50;

export function PhotoLightbox({ photos, index, onIndexChange, open, onOpenChange, alt }: PhotoLightboxProps) {
  const touchStartX = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);

  const goTo = (next: number) => {
    if (photos.length === 0) return;
    onIndexChange((next + photos.length) % photos.length);
  };
  const goPrev = () => goTo(index - 1);
  const goNext = () => goTo(index + 1);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, photos.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    setDragOffset(e.touches[0].clientX - touchStartX.current);
  };
  const handleTouchEnd = () => {
    if (touchStartX.current !== null && Math.abs(dragOffset) > SWIPE_THRESHOLD) {
      if (dragOffset > 0) {
        goPrev();
      } else {
        goNext();
      }
    }
    touchStartX.current = null;
    setDragOffset(0);
  };

  if (photos.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex h-screen w-screen max-w-none flex-col items-center justify-center gap-0 rounded-none border-none bg-black/95 p-0 sm:max-w-none [&_button]:text-white [&_button]:hover:bg-white/10"
      >
        <DialogTitle className="sr-only">{alt}</DialogTitle>

        <div
          className="relative flex h-full w-full items-center justify-center select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Image
            key={photos[index]}
            src={photos[index]}
            alt={alt}
            fill
            unoptimized
            className="object-contain"
            sizes="100vw"
            priority
          />

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label="Poprzednie zdjęcie"
                className="absolute left-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60 sm:left-4"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Następne zdjęcie"
                className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60 sm:right-4"
              >
                <ChevronRight className="size-6" />
              </button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                {index + 1} / {photos.length}
              </div>

              <div className="absolute bottom-12 left-1/2 flex max-w-[90vw] -translate-x-1/2 gap-1.5 overflow-x-auto px-2">
                {photos.map((photo, i) => (
                  <button
                    key={photo + i}
                    type="button"
                    onClick={() => onIndexChange(i)}
                    aria-label={`Przejdź do zdjęcia ${i + 1}`}
                    className={cn(
                      "size-1.5 shrink-0 rounded-full bg-white/40 transition-colors",
                      i === index && "bg-white",
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
