"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/api";
import { useAdminAuthStore } from "@/lib/admin-auth-store";
import { queryKeys } from "@/lib/query-keys";
import type { UserCreate, UserQuery, UserUpdate } from "@/types";

/** Panel administratora - "Zarządzanie kontami": pełny CRUD na kontach
 * użytkowników serwisu (najemcy/wynajmujący), w tym zatwierdzanie kont
 * wynajmujących (`status: pending -> approved/rejected`). */
export function useAdminUsers(query: UserQuery) {
  const token = useAdminAuthStore((state) => state.token);
  return useQuery({
    queryKey: queryKeys.adminUsers(query),
    queryFn: () => usersApi.getUsers(query),
    enabled: !!token,
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UserCreate) => usersApi.createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UserUpdate }) => usersApi.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => usersApi.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });
}
