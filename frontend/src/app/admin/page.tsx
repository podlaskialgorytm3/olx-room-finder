"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorState } from "@/components/common/error-state";
import { useAdminAuthHydrated, useAdminAuthStore } from "@/lib/admin-auth-store";
import { useAdminLogout, useCityConfigs, useTriggerCitySync, useUpdateCitySyncHour } from "@/hooks";
import { formatDate, formatNumber } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { CityConfig } from "@/types";

function CityRow({ config }: { config: CityConfig }) {
  const [hour, setHour] = useState(config.sync_hour);
  const [minute, setMinute] = useState(config.sync_minute);
  const updateSyncHour = useUpdateCitySyncHour();
  const triggerSync = useTriggerCitySync();

  const dirty = hour !== config.sync_hour || minute !== config.sync_minute;

  const handleSave = () => {
    updateSyncHour.mutate(
      { city: config.city, payload: { sync_hour: hour, sync_minute: minute } },
      {
        onSuccess: () => toast.success(`Zapisano godzinę synchronizacji dla ${config.display_name}.`),
        onError: () => toast.error("Nie udało się zapisać godziny synchronizacji."),
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

  return (
    <TableRow>
      <TableCell className="font-medium">{config.display_name}</TableCell>
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
          <Button size="sm" variant="outline" onClick={handleSave} disabled={!dirty || updateSyncHour.isPending}>
            Zapisz
          </Button>
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
        <Button
          size="sm"
          variant="outline"
          onClick={handleSyncNow}
          disabled={config.running || triggerSync.isPending}
        >
          <RefreshCw className={`size-3.5 ${triggerSync.isPending ? "animate-spin" : ""}`} />
          Synchronizuj teraz
        </Button>
      </TableCell>
    </TableRow>
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
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
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
          <CardTitle>Synchronizacja per miasto</CardTitle>
          <CardDescription>
            Ustaw godzinę codziennej synchronizacji dla każdego miasta albo uruchom ją od razu.
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
