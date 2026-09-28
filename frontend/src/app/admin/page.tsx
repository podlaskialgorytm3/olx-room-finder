"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogOut, Plus, Settings2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState } from "@/components/common/error-state";
import { RoomsManagementPanel } from "@/components/admin/rooms-management-panel";
import { AccountsManagementPanel } from "@/components/admin/accounts-management-panel";
import { useAdminAuthHydrated, useAdminAuthStore } from "@/lib/admin-auth-store";
import { useAdminLogout, useCityConfigs, useCreateCity } from "@/hooks";
import { formatDate, formatNumber } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { CityConfig } from "@/types";

function CategorySummary({ label, config }: { label: string; config: CityConfig["rooms"] }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {config.running ? (
          <Badge variant="secondary" className="animate-pulse">
            {config.cancelling ? "Anulowanie…" : "W trakcie…"}
          </Badge>
        ) : null}
      </div>
      <p className="max-w-[16rem] truncate text-sm text-muted-foreground">{config.link || "— brak linku —"}</p>
      <p className="text-xs text-muted-foreground">
        {String(config.sync_hour).padStart(2, "0")}:{String(config.sync_minute).padStart(2, "0")} · {formatNumber(config.offers_count)} ofert
        {!config.running && (config.last_run?.finished_at || config.last_run?.started_at)
          ? ` · ${formatDate(config.last_run?.finished_at ?? config.last_run?.started_at)}`
          : ""}
      </p>
    </div>
  );
}

function CityRow({ config }: { config: CityConfig }) {
  const router = useRouter();

  return (
    <TableRow className="cursor-pointer" onClick={() => router.push(`/admin/cities/${config.city}`)}>
      <TableCell className="min-w-[10rem] align-top">
        <p className="font-medium">{config.display_name}</p>
        <p className="mt-1 text-xs text-muted-foreground">{config.city}</p>
      </TableCell>
      <TableCell className="min-w-[16rem] align-top">
        <CategorySummary label="Pokoje" config={config.rooms} />
      </TableCell>
      <TableCell className="min-w-[16rem] align-top">
        <CategorySummary label="Mieszkania" config={config.apartments} />
      </TableCell>
      <TableCell className="text-right align-top">
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/admin/cities/${config.city}`);
          }}
        >
          <Settings2 className="size-3.5" />
          Zarządzaj
        </Button>
      </TableCell>
    </TableRow>
  );
}

function AddCityForm() {
  const createCity = useCreateCity();
  const [city, setCity] = useState("");
  const [displayName, setDisplayName] = useState("");

  const resetForm = () => {
    setCity("");
    setDisplayName("");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    createCity.mutate(
      {
        city: city.trim().toUpperCase(),
        display_name: displayName.trim(),
      },
      {
        onSuccess: () => {
          toast.success(`Dodano miasto ${displayName}. Ustaw linki OLX i harmonogram na jego stronie zarządzania.`);
          resetForm();
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Nie udało się dodać miasta.");
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-1.5 lg:col-span-2">
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
      <div className="flex items-end sm:col-span-2 lg:col-span-1">
        <Button type="submit" disabled={createCity.isPending} className="w-full">
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

      <Tabs defaultValue="cities">
        <TabsList>
          <TabsTrigger value="cities">Zarządzanie miastami</TabsTrigger>
          <TabsTrigger value="rooms">Zarządzanie pokojami</TabsTrigger>
          <TabsTrigger value="accounts">Zarządzanie kontami</TabsTrigger>
        </TabsList>

        <TabsContent value="cities" className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Dodaj miasto</CardTitle>
              <CardDescription>
                Podaj tylko kod i nazwę miasta. Linki do listingów OLX (osobno dla pokoi i mieszkań) oraz
                harmonogram synchronizacji ustawisz później, na stronie zarządzania danym miastem.
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
                Kliknij miasto lub przycisk &quot;Zarządzaj&quot;, aby przejść do jego strony zarządzania i tam zmienić
                parametry, uruchomić synchronizację albo usunąć miasto.
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
                      <TableHead>Pokoje</TableHead>
                      <TableHead>Mieszkania</TableHead>
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
        </TabsContent>

        <TabsContent value="rooms">
          <RoomsManagementPanel />
        </TabsContent>

        <TabsContent value="accounts">
          <AccountsManagementPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
