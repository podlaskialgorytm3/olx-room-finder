"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const WarsawMap = dynamic(() => import("./warsaw-map").then((mod) => mod.WarsawMap), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-[420px] w-full rounded-xl" />,
});
