"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/error-state";
import { CityCategoryEditor } from "@/components/admin/city-category-editor";
import { useAdminAuthHydrated, useAdminAuthStore } from "@/lib/admin-auth-store";
import { useCityConfigs } from "@/hooks";

export default function CityRoomsManagementPage({ params }: { params: Promise<{ city: string }> }) {
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
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => router.push(`/admin/cities/${city}`)}>
          <ArrowLeft className="size-3.5" />
          Wróć do miasta
        </Button>
      </div>

      {cities.isLoading && <Skeleton className="h-64 w-full" />}
      {cities.isError && <ErrorState onRetry={() => cities.refetch()} />}
      {!cities.isLoading && !cities.isError && !config && (
        <ErrorState title="Nie znaleziono miasta" description="To miasto mogło zostać usunięte." />
      )}

      {config && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Pokoje: {config.display_name}</h1>
            {config.rooms.running ? (
              <Badge variant="secondary" className="animate-pulse">
                {config.rooms.cancelling ? "Anulowanie…" : "W trakcie…"}
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground">Link do listingu OLX i harmonogram synchronizacji ogłoszeń kategorii pokoje/stancje.</p>
        </div>
      )}

      {config && <CityCategoryEditor key={`${config.city}-room`} city={config.city} category="room" categoryConfig={config.rooms} bare />}
    </div>
  );
}
