"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserLogin } from "@/hooks";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const login = useUserLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    login.mutate(
      { email, password },
      {
        onSuccess: (data) => {
          toast.success(`Zalogowano jako ${data.user.full_name}.`);
          router.push("/");
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 401) {
            toast.error("Nieprawidłowy e-mail lub hasło.");
          } else if (err instanceof ApiError && err.status === 403) {
            toast.error(err.message);
          } else {
            toast.error("Nie udało się zalogować.");
          }
        },
      },
    );
  };

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-16 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Logowanie</CardTitle>
          <CardDescription>Zaloguj się na swoje konto najemcy lub wynajmującego.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Adres e-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Hasło</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? "Logowanie…" : "Zaloguj się"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Nie masz konta?{" "}
            <Link href="/register" className="font-medium text-foreground hover:underline">
              Zarejestruj się
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
