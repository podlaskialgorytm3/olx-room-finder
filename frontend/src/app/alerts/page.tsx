"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertsPanel } from "@/components/alerts/alerts-panel";
import { useUserAuthHydrated, useUserAuthStore } from "@/lib/user-auth-store";

export default function AlertsPage() {
  const router = useRouter();
  const hydrated = useUserAuthHydrated();
  const token = useUserAuthStore((state) => state.token);
  const user = useUserAuthStore((state) => state.user);

  useEffect(() => {
    if (!hydrated) return;
    if (!token || !user) {
      router.replace("/login");
    }
  }, [hydrated, token, user, router]);

  if (!hydrated || !token || !user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">🔔 Moje alerty</h1>
        <p className="mt-1 text-muted-foreground">
          Powiadomienia o nowych ofertach i spadkach cen dopasowane do Twoich kryteriów.
        </p>
      </div>

      <AlertsPanel />
    </div>
  );
}
