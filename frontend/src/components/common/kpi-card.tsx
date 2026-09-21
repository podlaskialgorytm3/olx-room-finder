import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  isLoading?: boolean;
  hint?: string;
  className?: string;
}

export function KpiCard({ label, value, icon: Icon, isLoading, hint, className }: KpiCardProps) {
  return (
    <Card className={cn("gap-2 py-5 shadow-sm", className)}>
      <CardContent className="flex items-start justify-between px-5">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{label}</span>
          {isLoading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <span className="text-2xl font-semibold tracking-tight">{value}</span>
          )}
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
        {Icon && (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </span>
        )}
      </CardContent>
    </Card>
  );
}
