"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRegisterUser } from "@/hooks";
import { ApiError } from "@/lib/api";
import type { UserRole } from "@/types";

export default function RegisterPage() {
  const router = useRouter();
  const register = useRegisterUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("tenant");
  const [submitted, setSubmitted] = useState<{ role: UserRole } | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (password !== passwordConfirm) {
      toast.error("Hasła nie są identyczne.");
      return;
    }

    register.mutate(
      {
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        role,
      },
      {
        onSuccess: (data) => {
          toast.success(data.message);
          setSubmitted({ role });
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) {
            toast.error("Konto z tym adresem e-mail/loginem już istnieje.");
          } else {
            toast.error(err instanceof ApiError ? err.message : "Nie udało się utworzyć konta.");
          }
        },
      },
    );
  };

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16 sm:px-6">
        <Card>
          <CardHeader>
            <CardTitle>Dziękujemy za rejestrację!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {submitted.role === "landlord" ? (
              <p className="text-sm text-muted-foreground">
                Twoje konto wynajmującego zostało utworzone i oczekuje na zatwierdzenie przez administratora.
                Otrzymasz dostęp po weryfikacji.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Twoje konto najemcy jest już aktywne.</p>
            )}
            <Button className="w-full" onClick={() => router.push("/")}>
              Wróć na stronę główną
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Rejestracja</CardTitle>
          <CardDescription>
            Załóż konto, aby korzystać z serwisu. Konta wynajmujących wymagają zatwierdzenia przez administratora.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              {role === "landlord" && (
                <p className="text-xs text-muted-foreground">
                  Konto wynajmującego musi zostać zatwierdzone przez administratora przed aktywacją.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="full-name">Imię i nazwisko</Label>
              <Input
                id="full-name"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail lub login</Label>
              <Input
                id="email"
                type="text"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefon (opcjonalnie)</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password-confirm">Powtórz hasło</Label>
              <Input
                id="password-confirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={register.isPending}>
              {register.isPending ? "Rejestrowanie…" : "Zarejestruj się"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
