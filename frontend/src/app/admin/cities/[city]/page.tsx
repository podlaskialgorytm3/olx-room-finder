"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/error-state";
import { useAdminAuthHydrated, useAdminAuthStore } from "@/lib/admin-auth-store";
import { useCityConfigs, useDeleteCity, useUpdateCitySyncHour } from "@/hooks";
import { formatDate, formatNumber } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { CityCategoryConfig, CityConfig, OfferCategoryKey } from "@/types";

const CATEGORY_LABELS: Record<OfferCategoryKey, string> = { room: "Pokoje", apartment: "Mieszkania" };

/** Klikalna karta - podsumowanie jednej kategorii (pokoje/mieszkania) z
 * przejściem na jej osobną podstronę zarządzania
 * (`/admin/cities/[city]/rooms` lub `/admin/cities/[city]/apartments`).
 * Każda kategoria ma tam własny link OLX i harmonogram synchronizacji,
 * niezależny od drugiej. */
function CategoryLinkCard({
  city,
  category,
  categoryConfig,
}: {
  city: string;
  category: OfferCategoryKey;
  categoryConfig: CityCategoryConfig;
}) {
  const router = useRouter();
  const label = CATEGORY_LABELS[category];

  return (
    <Card
      className="cursor-pointer transition-colors hover:border-primary/50"
      onClick={() => router.push(`/admin/cities/${city}/${category === "room" ? "rooms" : "apartments"}`)}
    >
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
      <CardContent className="space-y-4">
        <p className="truncate text-sm text-muted-foreground">{categoryConfig.link || "— brak linku —"}</p>
        <div className="grid grid-cols-2 gap-4">
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
        <Button variant="outline" className="w-full">
          Zarządzaj kategorią {label.toLowerCase()}
          <ArrowRight className="size-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

/** Panel zarządzania danym miastem - nazwa miasta jest wspólna, natomiast
 * pokoje i mieszkania mają całkowicie niezależne linki OLX i harmonogramy
 * synchronizacji, zarządzane na osobnych podstronach (patrz `CategoryLinkCard`). */
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

      <div className="grid gap-6 sm:grid-cols-2">
        <CategoryLinkCard city={config.city} category="room" categoryConfig={config.rooms} />
        <CategoryLinkCard city={config.city} category="apartment" categoryConfig={config.apartments} />
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
