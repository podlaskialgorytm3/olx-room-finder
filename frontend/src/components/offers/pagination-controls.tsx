import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ page, totalPages, onPageChange }: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="icon"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Poprzednia strona"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="text-sm text-muted-foreground">
        Strona {page} z {totalPages}
      </span>
      <Button
        variant="outline"
        size="icon"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Następna strona"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
