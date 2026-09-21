import { Suspense } from "react";
import { OffersPageClient } from "./offers-page-client";
import { Skeleton } from "@/components/ui/skeleton";

export default function OffersPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-8"><Skeleton className="h-96 w-full" /></div>}>
      <OffersPageClient />
    </Suspense>
  );
}
