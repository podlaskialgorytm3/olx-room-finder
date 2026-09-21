import { SearchX, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title?: string;
  description?: string;
  onClear?: () => void;
  clearLabel?: string;
  icon?: "search" | "inbox";
}

export function EmptyState({
  title = "Brak wyników",
  description = "Brak ofert spełniających podane kryteria.",
  onClear,
  clearLabel = "Wyczyść filtry",
  icon = "search",
}: EmptyStateProps) {
  const Icon = icon === "search" ? SearchX : Inbox;
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
      <Icon className="size-8 text-muted-foreground" />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {onClear && (
        <Button variant="outline" size="sm" onClick={onClear}>
          {clearLabel}
        </Button>
      )}
    </div>
  );
}
