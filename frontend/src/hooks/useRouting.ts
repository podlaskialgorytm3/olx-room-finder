"use client";

import { useMutation } from "@tanstack/react-query";
import { routingApi } from "@/lib/api";

/** Mutacja "Sprawdź dojazd" - patrz `backend/routers/offers.py::get_offer_route`. */
export function useCheckOfferRoute(offerId: string) {
  return useMutation({
    mutationFn: (destination: string) => routingApi.checkOfferRoute(offerId, destination),
  });
}
