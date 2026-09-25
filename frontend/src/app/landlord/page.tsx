"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LandlordOffersPanel } from "@/components/landlord/landlord-offers-panel";
import { useUserAuthHydrated, useUserAuthStore } from "@/lib/user-auth-store";

export default function LandlordDashboardPage() {
  const router = useRouter();
  const hydrated = useUserAuthHydrated();
  const token = useUserAuthStore((state) => state.token);
  const user = useUserAuthStore((state) => state.user);

  useEffect(() => {
    if (!hydrated) return;
    if (!token || !user) {
      router.replace("/login");
    } else if (user.role !== "landlord") {
      router.replace("/");
    }
  }, [hydrated, token, user, router]);

  if (!hydrated || !token || !user || user.role !== "landlord") {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Panel wynajmującego</h1>
        <p className="mt-1 text-muted-foreground">Zalogowano jako {user.full_name}.</p>
      </div>

      <LandlordOffersPanel />
    </div>
  );
}
