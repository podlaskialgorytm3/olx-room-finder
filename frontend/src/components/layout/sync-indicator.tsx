"use client";

import { RefreshCw } from "lucide-react";
import { useRunSync, useSyncStatus } from "@/hooks";
import { formatDate, formatNumber } from "@/lib/format";
import { ApiError } from "@/lib/api";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

export function SyncIndicator() {
  const { data, isLoading, isError } = useSyncStatus();
  const runSync = useRunSync();

  const handleRun = () => {
    runSync.mutate(undefined, {
      onSuccess: () => toast.success("Synchronizacja rozpoczęta."),
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          toast.info("Synchronizacja już trwa.");
        } else {
          toast.error("Nie udało się uruchomić synchronizacji.");
        }
      },
    });
  };

  if (isLoading) {
    return <span className="text-xs text-muted-foreground">Sprawdzanie synchronizacji…</span>;
  }

  if (isError || !data) {
    return <span className="text-xs text-muted-foreground">Status sync niedostępny</span>;
  }

  const dotColor = data.running ? "bg-amber-500 animate-pulse" : "bg-emerald-500";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={handleRun}
          disabled={runSync.isPending || data.running}
          className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className={`size-2 rounded-full ${dotColor}`} />
          <span>{data.running ? "Synchronizacja w toku…" : "Dane zsynchronizowane"}</span>
          <RefreshCw className={`size-3 ${runSync.isPending ? "animate-spin" : ""}`} />
        </button>
      </TooltipTrigger>
      <TooltipContent className="text-xs">
        <p>Ostatnia synchronizacja: {formatDate(data.last_run?.finished_at ?? data.last_run?.started_at)}</p>
        <p>Ofert: {formatNumber(data.offers_count)}</p>
        <p className="mt-1 text-muted-foreground">Kliknij, aby uruchomić synchronizację ręcznie.</p>
      </TooltipContent>
    </Tooltip>
  );
}
