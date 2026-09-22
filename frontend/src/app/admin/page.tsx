"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, LogOut, Trash2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorState } from "@/components/common/error-state";
import { useAdminAuthHydrated, useAdminAuthStore } from "@/lib/admin-auth-store";
import {
  useAdminLogout,
  useCityConfigs,
  useCreateCity,
  useDeleteCity,
  useTriggerCitySync,
  useUpdateCitySyncHour,
} from "@/hooks";
import { formatDate, formatNumber } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { CityConfig } from "@/types";

function CityRow({ config }: { config: CityConfig }) {
  const [hour, setHour] = useState(config.sync_hour);
  const [minute, setMinute] = useState(config.sync_minute);
  const [displayName, setDisplayName] = useState(config.display_name);
  const [link, setLink] = useState(config.link ?? "");
  const updateCity = useUpdateCitySyncHour();
  const triggerSync = useTriggerCitySync();
  const deleteCity = useDeleteCity();

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

  const handleDelete = () => {
    if (!window.confirm(`Na pewno usunąć miasto ${config.display_name}? Usunięte zostaną też jego oferty.`)) {
      return;
    }
    deleteCity.mutate(config.city, {
      onSuccess: () => toast.success(`Usunięto miasto ${config.display_name}.`),
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : "Nie udało się usunąć miasta.");
      },
    });
  };

  return (
    <TableRow>
      <TableCell className="min-w-[10rem]">
        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        <p className="mt-1 text-xs text-muted-foreground">{config.city}</p>
      </TableCell>
      <TableCell className="min-w-[16rem]">
        <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://www.olx.pl/nieruchomosci/stancje-pokoje/..." />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={0}
            max={23}
            value={hour}
            onChange={(e) => setHour(Number(e.target.value))}
            className="w-16"
          />
          <span className="text-muted-foreground">:</span>
          <Input
            type="number"
            min={0}
            max={59}
            value={minute}
            onChange={(e) => setMinute(Number(e.target.value))}
            className="w-16"
          />
        </div>
      </TableCell>
      <TableCell>{formatNumber(config.offers_count)}</TableCell>
      <TableCell>
        {config.running ? (
          <Badge variant="secondary" className="animate-pulse">
            W trakcie…
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">
            {formatDate(config.last_run?.finished_at ?? config.last_run?.started_at)}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Button size="sm" variant="outline" onClick={handleSave} disabled={!dirty || updateCity.isPending}>
            Zapisz
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSyncNow}
            disabled={config.running || triggerSync.isPending}
          >
            <RefreshCw className={`size-3.5 ${triggerSync.isPending ? "animate-spin" : ""}`} />
            Synchronizuj
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={deleteCity.isPending || config.running}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function AddCityForm() {
  const createCity = useCreateCity();
  const [city, setCity] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [link, setLink] = useState("");
  const [hour, setHour] = useState(2);
  const [minute, setMinute] = useState(0);

  const resetForm = () => {
    setCity("");
    setDisplayName("");
    setLink("");
    setHour(2);
    setMinute(0);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedLink = link.trim();
    if (!/^(https?:\/\/)?(www\.)?olx\.pl\/nieruchomosci\/stancje-pokoje\//i.test(trimmedLink)) {
      toast.error("Link musi prowadzić do listingu OLX kategorii pokoje/stancje (np. https://www.olx.pl/nieruchomosci/stancje-pokoje/lublin/).");
      return;
    }

    createCity.mutate(
      {
        city: city.trim().toUpperCase(),
        display_name: displayName.trim(),
        link: trimmedLink,
        sync_hour: hour,
        sync_minute: minute,
      },
      {
        onSuccess: () => {
          toast.success(`Dodano miasto ${displayName}.`);
          resetForm();
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Nie udało się dodać miasta.");
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      <div className="space-y-1.5">
        <Label htmlFor="city-code">Kod miasta</Label>
        <Input
          id="city-code"
          placeholder="LUBLIN"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5 lg:col-span-2">
        <Label htmlFor="city-name">Nazwa</Label>
        <Input
          id="city-name"
          placeholder="Lublin"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
        <Label htmlFor="city-link">Link do listingu OLX</Label>
        <Input
          id="city-link"
          placeholder="https://www.olx.pl/nieruchomosci/stancje-pokoje/lublin/"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          required
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
            className="w-16"
          />
          <span className="text-muted-foreground">:</span>
          <Input
            type="number"
            min={0}
            max={59}
            value={minute}
            onChange={(e) => setMinute(Number(e.target.value))}
            className="w-16"
          />
        </div>
      </div>
      <div className="flex items-end sm:col-span-2 lg:col-span-6">
        <Button type="submit" disabled={createCity.isPending}>
          <Plus className="size-3.5" />
          Dodaj miasto
        </Button>
      </div>
    </form>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const hydrated = useAdminAuthHydrated();
  const token = useAdminAuthStore((state) => state.token);
  const username = useAdminAuthStore((state) => state.username);
  const logout = useAdminLogout();
  const cities = useCityConfigs();

  useEffect(() => {
    if (hydrated && !token) {
      router.replace("/admin/login");
    }
  }, [hydrated, token, router]);

  if (!hydrated || !token) {
    return null;
  }

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => router.push("/admin/login"),
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Panel administratora</h1>
          <p className="mt-1 text-muted-foreground">Zalogowano jako {username}.</p>
        </div>
        <Button variant="outline" onClick={handleLogout} disabled={logout.isPending}>
          <LogOut className="size-3.5" />
          Wyloguj
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dodaj miasto</CardTitle>
          <CardDescription>
            Podaj link do listingu OLX kategorii pokoje/stancje dla nowego miasta (np.{" "}
            <code>https://www.olx.pl/nieruchomosci/stancje-pokoje/lublin/</code>). Inne linki zostaną odrzucone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddCityForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Miasta i synchronizacja</CardTitle>
          <CardDescription>
            Zarządzaj miastami, ich linkami OLX oraz godziną codziennej synchronizacji - albo uruchom ją od razu.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cities.isLoading && <Skeleton className="h-64 w-full" />}
          {cities.isError && <ErrorState onRetry={() => cities.refetch()} />}
          {cities.data && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Miasto</TableHead>
                  <TableHead>Link OLX</TableHead>
                  <TableHead>Godzina synchronizacji</TableHead>
                  <TableHead>Liczba ofert</TableHead>
                  <TableHead>Ostatnia synchronizacja</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cities.data.map((config) => (
                  <CityRow key={config.city} config={config} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
