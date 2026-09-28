"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/error-state";
import { useAdminAuthHydrated, useAdminAuthStore } from "@/lib/admin-auth-store";
import {
  useCancelCitySync,
  useCityConfigs,
  useDeleteCity,
  useTriggerCitySync,
  useUpdateCitySyncHour,
} from "@/hooks";
import { formatDate, formatNumber } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { CityConfig } from "@/types";

/** Editable form for a single city, keyed by `config.city` so local state
 * (re)initializes cleanly whenever the underlying city record changes. */
function CityEditor({ config }: { config: CityConfig }) {
  const router = useRouter();
  const updateCity = useUpdateCitySyncHour();
  const triggerSync = useTriggerCitySync();
  const cancelSync = useCancelCitySync();
  const deleteCity = useDeleteCity();

  const [hour, setHour] = useState(config.sync_hour);
  const [minute, setMinute] = useState(config.sync_minute);
  const [displayName, setDisplayName] = useState(config.display_name);
  const [link, setLink] = useState(config.link ?? "");

  const dirty =
    hour !== config.sync_hour ||
    minute !== config.sync_minute ||
    displayName !== config.display_name ||
    link !== (config.link ?? "");

  const handleSave = () => {
    updateCity.mutate(
      {
        city: config.city,
        payload: { sync_hour: hour, sync_minute: minute, display_name: displayName, link: link || undefined },
      },
      {
        onSuccess: () => toast.success(`Zapisano zmiany dla ${displayName}.`),
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Nie udało się zapisać zmian.");
        },
      },
    );
  };

  const handleSyncNow = () => {
    triggerSync.mutate(config.city, {
      onSuccess: () => toast.success(`Synchronizacja miasta ${config.display_name} uruchomiona.`),
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          toast.info("Synchronizacja tego miasta już trwa.");
        } else {
          toast.error("Nie udało się uruchomić synchronizacji.");
        }
      },
    });
  };

  const handleCancelSync = () => {
    cancelSync.mutate(config.city, {
      onSuccess: () =>
        toast.success(`Anulowano synchronizację miasta ${config.display_name}. Dotychczas pobrane oferty zostały zapisane.`),
      onError: (err) => {
        if (err instanceof ApiError && err.status === 409) {
          toast.info("Ta synchronizacja już się zakończyła.");
        } else {
          toast.error("Nie udało się anulować synchronizacji.");
        }
      },
    });
  };

  const handleDelete = () => {
    if (!window.confirm(`Na pewno usunąć miasto ${config.display_name}? Usunięte zostaną też jego oferty.`)) {
      return;
    }
    deleteCity.mutate(config.city, {
      onSuccess: () => {
        toast.success(`Usunięto miasto ${config.display_name}.`);
        router.push("/admin");
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : "Nie udało się usunąć miasta.");
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Zarządzanie miastem: {config.display_name}</CardTitle>
            <CardDescription>Kod miasta: {config.city}</CardDescription>
          </div>
          {config.running ? (
            <Badge variant="secondary" className="animate-pulse">
              {config.cancelling ? "Anulowanie…" : "W trakcie…"}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="display-name">Nazwa</Label>
            <Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Godzina synchronizacji</Label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                min={0}
                max={23}
                value={hour}
                onChange={(e) => setHour(Number(e.target.value))}
                className="w-20"
              />
              <span className="text-muted-foreground">:</span>
              <Input
                type="number"
                min={0}
                max={59}
                value={minute}
                onChange={(e) => setMinute(Number(e.target.value))}
                className="w-20"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="city-link">Link do listingu OLX</Label>
          <Input
            id="city-link"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://www.olx.pl/nieruchomosci/stancje-pokoje/..."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Liczba ofert</p>
            <p className="font-medium">{formatNumber(config.offers_count)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Ostatnia synchronizacja</p>
            <p className="font-medium">{formatDate(config.last_run?.finished_at ?? config.last_run?.started_at)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button onClick={handleSave} disabled={!dirty || updateCity.isPending}>
            Zapisz zmiany
          </Button>
          {config.running ? (
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
              onClick={handleCancelSync}
              disabled={config.cancelling || cancelSync.isPending}
            >
              Anuluj synchronizację
            </Button>
          ) : (
            <Button variant="outline" onClick={handleSyncNow} disabled={triggerSync.isPending}>
              <RefreshCw className={`size-3.5 ${triggerSync.isPending ? "animate-spin" : ""}`} />
              Synchronizuj teraz
            </Button>
          )}
          <Button
            variant="outline"
            className="ml-auto text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={deleteCity.isPending || config.running}
          >
            <Trash2 className="size-3.5" />
            Usuń miasto
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CityManagementPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = use(params);
  const router = useRouter();
  const hydrated = useAdminAuthHydrated();
  const token = useAdminAuthStore((state) => state.token);
  const cities = useCityConfigs();

  useEffect(() => {
    if (hydrated && !token) {
      router.replace("/admin/login");
    }
  }, [hydrated, token, router]);

  if (!hydrated || !token) {
    return null;
  }

  const config = cities.data?.find((c) => c.city === city);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push("/admin")}>
          <ArrowLeft className="size-3.5" />
          Wróć do panelu
        </Button>
      </div>

      {cities.isLoading && <Skeleton className="h-64 w-full" />}
      {cities.isError && <ErrorState onRetry={() => cities.refetch()} />}
      {!cities.isLoading && !cities.isError && !config && (
        <ErrorState title="Nie znaleziono miasta" description="To miasto mogło zostać usunięte." />
      )}
      {config && <CityEditor key={config.city} config={config} />}
    </div>
  );
}
