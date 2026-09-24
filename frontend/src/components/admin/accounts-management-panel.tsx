"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Plus, Trash2, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ErrorState } from "@/components/common/error-state";
import { PaginationControls } from "@/components/offers/pagination-controls";
import { useAdminUsers, useCreateUser, useDeleteUser, useUpdateUser } from "@/hooks";
import { ApiError } from "@/lib/api";
import type { User, UserCreate, UserQuery, UserRole, UserStatus, UserUpdate } from "@/types";

const ALL = "all" as const;

const ROLE_LABELS: Record<UserRole, string> = {
  tenant: "Najemca",
  landlord: "Wynajmujący",
};

const STATUS_LABELS: Record<UserStatus, string> = {
  pending: "Oczekuje na zatwierdzenie",
  approved: "Zatwierdzone",
  rejected: "Odrzucone",
};

function statusBadgeVariant(status: UserStatus): "default" | "secondary" | "outline" {
  if (status === "approved") return "default";
  if (status === "pending") return "secondary";
  return "outline";
}

/** Formularz tworzenia nowego konta przez administratora (pełny CRUD - nie
 * tylko zatwierdzanie rejestracji, ale i ręczne zakładanie kont). */
function CreateUserDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createUser = useCreateUser();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("tenant");
  const [status, setStatus] = useState<UserStatus>("approved");

  const resetForm = () => {
    setEmail("");
    setFullName("");
    setPhone("");
    setPassword("");
    setRole("tenant");
    setStatus("approved");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const payload: UserCreate = {
      email: email.trim(),
      full_name: fullName.trim(),
      phone: phone.trim() || undefined,
      password,
      role,
      status,
    };
    createUser.mutate(payload, {
      onSuccess: () => {
        toast.success("Utworzono konto.");
        resetForm();
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : "Nie udało się utworzyć konta.");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nowe konto</DialogTitle>
          <DialogDescription>Ręcznie załóż konto użytkownika (np. na prośbę telefoniczną).</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-user-name">Imię i nazwisko</Label>
            <Input id="new-user-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-email">E-mail</Label>
            <Input id="new-user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-phone">Telefon</Label>
            <Input id="new-user-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-password">Hasło</Label>
            <Input
              id="new-user-password"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Typ konta</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tenant">Najemca</SelectItem>
                  <SelectItem value="landlord">Wynajmujący</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as UserStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Zatwierdzone</SelectItem>
                  <SelectItem value="pending">Oczekuje</SelectItem>
                  <SelectItem value="rejected">Odrzucone</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createUser.isPending}>
              Utwórz konto
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Formularz edycji istniejącego konta - dowolne pole, w tym rola i status
 * (czyli tu administrator zatwierdza/odrzuca konta wynajmujących). */
function EditUserDialog({ user, onOpenChange }: { user: User | null; onOpenChange: (open: boolean) => void }) {
  if (!user) return null;
  return (
    <Dialog open={user !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <EditUserForm user={user} onSaved={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function EditUserForm({ user, onSaved }: { user: User; onSaved: () => void }) {
  const updateUser = useUpdateUser();
  const [email, setEmail] = useState(user.email);
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [role, setRole] = useState<UserRole>(user.role);
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [password, setPassword] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const payload: UserUpdate = {
      email: email.trim(),
      full_name: fullName.trim(),
      phone: phone.trim() || undefined,
      role,
      status,
    };
    if (password.trim()) {
      payload.password = password.trim();
    }
    updateUser.mutate(
      { id: user.id, payload },
      {
        onSuccess: () => {
          toast.success("Zapisano zmiany.");
          onSaved();
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Nie udało się zapisać zmian.");
        },
      },
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edytuj konto</DialogTitle>
        <DialogDescription>Zmień dane, rolę lub status konta {user.email}.</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit-user-name">Imię i nazwisko</Label>
          <Input id="edit-user-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-user-email">E-mail</Label>
          <Input id="edit-user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-user-phone">Telefon</Label>
          <Input id="edit-user-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Typ konta</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tenant">Najemca</SelectItem>
                <SelectItem value="landlord">Wynajmujący</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as UserStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approved">Zatwierdzone</SelectItem>
                <SelectItem value="pending">Oczekuje</SelectItem>
                <SelectItem value="rejected">Odrzucone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-user-password">Nowe hasło (opcjonalnie)</Label>
          <Input
            id="edit-user-password"
            type="password"
            minLength={8}
            placeholder="Pozostaw puste, aby nie zmieniać"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={updateUser.isPending}>
            Zapisz zmiany
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function AccountsManagementPanel() {
  const [role, setRole] = useState<UserRole | undefined>(undefined);
  const [status, setStatus] = useState<UserStatus | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const query: UserQuery = useMemo(
    () => ({ role, status, search: search.trim() || undefined, page, limit: 20 }),
    [role, status, search, page],
  );

  const users = useAdminUsers(query);

  const resetPageAnd = (fn: () => void) => {
    fn();
    setPage(1);
  };

  const handleApprove = (user: User) => {
    updateUser.mutate(
      { id: user.id, payload: { status: "approved" } },
      {
        onSuccess: () => toast.success(`Zatwierdzono konto ${user.email}.`),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Nie udało się zatwierdzić konta."),
      },
    );
  };

  const handleReject = (user: User) => {
    updateUser.mutate(
      { id: user.id, payload: { status: "rejected" } },
      {
        onSuccess: () => toast.success(`Odrzucono konto ${user.email}.`),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Nie udało się odrzucić konta."),
      },
    );
  };

  const handleDelete = (user: User) => {
    if (!window.confirm(`Na pewno usunąć konto ${user.email}? Tej operacji nie można cofnąć.`)) {
      return;
    }
    deleteUser.mutate(user.id, {
      onSuccess: () => toast.success("Usunięto konto."),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Nie udało się usunąć konta."),
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtry</CardTitle>
          <CardDescription>Zawęź listę kont po typie, statusie lub wyszukaj po e-mailu/nazwisku.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Typ konta</Label>
            <Select value={role ?? ALL} onValueChange={(v) => resetPageAnd(() => setRole(v === ALL ? undefined : (v as UserRole)))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Wszystkie typy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Wszystkie typy</SelectItem>
                <SelectItem value="tenant">Najemca</SelectItem>
                <SelectItem value="landlord">Wynajmujący</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status ?? ALL} onValueChange={(v) => resetPageAnd(() => setStatus(v === ALL ? undefined : (v as UserStatus)))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Wszystkie statusy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Wszystkie statusy</SelectItem>
                <SelectItem value="pending">Oczekuje na zatwierdzenie</SelectItem>
                <SelectItem value="approved">Zatwierdzone</SelectItem>
                <SelectItem value="rejected">Odrzucone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="users-search">Szukaj</Label>
            <Input
              id="users-search"
              placeholder="E-mail, imię i nazwisko…"
              value={search}
              onChange={(e) => resetPageAnd(() => setSearch(e.target.value))}
            />
          </div>

          <div className="flex items-end">
            <Button type="button" className="w-full" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" />
              Nowe konto
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Konta</CardTitle>
          <CardDescription>
            {users.data ? `${users.data.pagination.total} kont spełnia wybrane filtry.` : "Lista wszystkich kont w serwisie."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {users.isLoading && <Skeleton className="h-64 w-full" />}
          {users.isError && <ErrorState onRetry={() => users.refetch()} />}
          {users.data && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Imię i nazwisko</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefon</TableHead>
                    <TableHead>Typ konta</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.data.data.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.phone ?? "brak danych"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{ROLE_LABELS[user.role]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(user.status)}>{STATUS_LABELS[user.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {user.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:bg-green-600/10"
                                onClick={() => handleApprove(user)}
                                disabled={updateUser.isPending}
                              >
                                <Check className="size-3.5" />
                                Zatwierdź
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={() => handleReject(user)}
                                disabled={updateUser.isPending}
                              >
                                <X className="size-3.5" />
                                Odrzuć
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setEditingUser(user)}>
                            Edytuj
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(user)}
                            disabled={deleteUser.isPending}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.data.data.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Brak kont spełniających wybrane filtry.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <PaginationControls page={page} totalPages={users.data.pagination.total_pages} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditUserDialog user={editingUser} onOpenChange={(open) => !open && setEditingUser(null)} />
    </div>
  );
}
