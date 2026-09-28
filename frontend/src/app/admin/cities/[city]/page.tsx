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
import type { CityCategoryConfig, CityConfig, OfferCategoryKey } from "@/types";

const CATEGORY_LABELS: Record<OfferCategoryKey, string> = { room: "Pokoje", apartment: "Mieszkania" };
const CATEGORY_LINK_HINTS: Record<OfferCategoryKey, string> = {
  room: "https://www.olx.pl/nieruchomosci/stancje-pokoje/...",
  apartment: "https://www.olx.pl/nieruchomosci/mieszkania/wynajem/...",
};

/** Editable form for a single city+category (pokoje/mieszkania), keyed by
 * `${config.city}-${category}` so local state (re)initializes cleanly
 * whenever the underlying record changes. Each category has its own
 * independent OLX link and sync schedule/trigger/cancel. */
function CategoryEditor({
  city,
  category,
  categoryConfig,
}: {
  city: string;
  category: OfferCategoryKey;
  categoryConfig: CityCategoryConfig;
}) {
  const updateCity = useUpdateCitySyncHour();
  const triggerSync = useTriggerCitySync();
  const cancelSync = useCancelCitySync();

  const [hour, setHour] = useState(categoryConfig.sync_hour);
  const [minute, setMinute] = useState(categoryConfig.sync_minute);
  const [link, setLink] = useState(categoryConfig.link ?? "");

  const dirty = hour !== categoryConfig.sync_hour || minute !== categoryConfig.sync_minute || link !== (categoryConfig.link ?? "");

  const label = CATEGORY_LABELS[category];

  const handleSave = () => {
    updateCity.mutate(
      { city, payload: { category, sync_hour: hour, sync_minute: minute, link } },
      {
        onSuccess: () => toast.success(`Zapisano ustawienia (${label}).`),
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Nie udało się zapisać zmian.");
        },
      },
    );
  };

  const handleSyncNow = () => {
    triggerSync.mutate(
      { city, category },
      {
        onSuccess: () => toast.success(`Synchronizacja (${label}) uruchomiona.`),
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            toast.info("Synchronizacja już trwa.");
          } else if (err instanceof ApiError && err.status === 422) {
            toast.error("Ustaw najpierw link do listingu OLX dla tej kategorii.");
          } else {
            toast.error("Nie udało się uruchomić synchronizacji.");
          }
        },
      },
    );
  };

  const handleCancelSync = () => {
    cancelSync.mutate(
      { city, category },
      {
        onSuccess: () => toast.success(`Anulowano synchronizację (${label}). Dotychczas pobrane oferty zostały zapisane.`),
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            toast.info("Ta synchronizacja już się zakończyła.");
          } else {
            toast.error("Nie udało się anulować synchronizacji.");
          }
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>{label}</CardTitle>
          {categoryConfig.running ? (
            <Badge variant="secondary" className="animate-pulse">
              {categoryConfig.cancelling ? "Anulowanie…" : "W trakcie…"}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1.5">
          <Label htmlFor={`${category}-link`}>Link do listingu OLX</Label>
          <Input
            id={`${category}-link`}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder={CATEGORY_LINK_HINTS[category]}
          />
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Liczba ofert</p>
            <p className="font-medium">{formatNumber(categoryConfig.offers_count)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Ostatnia synchronizacja</p>
            <p className="font-medium">
              {formatDate(categoryConfig.last_run?.finished_at ?? categoryConfig.last_run?.started_at)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button onClick={handleSave} disabled={!dirty || updateCity.isPending}>
            Zapisz zmiany
          </Button>
          {categoryConfig.running ? (
            <Button
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
              onClick={handleCancelSync}
              disabled={categoryConfig.cancelling || cancelSync.isPending}
            >
              Anuluj synchronizację
            </Button>
          ) : (
            <Button variant="outline" onClick={handleSyncNow} disabled={triggerSync.isPending || !categoryConfig.link}>
              <RefreshCw className={`size-3.5 ${triggerSync.isPending ? "animate-spin" : ""}`} />
              Synchronizuj teraz
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/** Panel zarządzania danym miastem - nazwa miasta jest wspólna, natomiast
 * pokoje i mieszkania mają całkowicie niezależne linki OLX i harmonogramy
 * synchronizacji (patrz `CategoryEditor`). */
function CityEditor({ config }: { config: CityConfig }) {
  const router = useRouter();
  const updateCity = useUpdateCitySyncHour();
  const deleteCity = useDeleteCity();

  const [displayName, setDisplayName] = useState(config.display_name);
  const nameDirty = displayName !== config.display_name;

  const handleSaveName = () => {
    updateCity.mutate(
      {
        city: config.city,
        payload: {
          category: "room",
          sync_hour: config.rooms.sync_hour,
          sync_minute: config.rooms.sync_minute,
          display_name: displayName,
        },
      },
      {
        onSuccess: () => toast.success(`Zapisano nazwę miasta ${displayName}.`),
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Nie udało się zapisać zmian.");
        },
      },
    );
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

  const anyRunning = config.rooms.running || config.apartments.running;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Zarządzanie miastem: {config.display_name}</CardTitle>
          <CardDescription>Kod miasta: {config.city}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1.5 sm:max-w-sm">
            <Label htmlFor="display-name">Nazwa</Label>
            <Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <Button onClick={handleSaveName} disabled={!nameDirty || updateCity.isPending}>
              Zapisz nazwę
            </Button>
            <Button
              variant="outline"
              className="ml-auto text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
              disabled={deleteCity.isPending || anyRunning}
            >
              <Trash2 className="size-3.5" />
              Usuń miasto
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <CategoryEditor city={config.city} category="room" categoryConfig={config.rooms} />
        <CategoryEditor city={config.city} category="apartment" categoryConfig={config.apartments} />
      </div>
    </div>
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
