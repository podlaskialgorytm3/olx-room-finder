"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { LayoutDashboard, LogOut, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAdminAuthHydrated, useAdminAuthStore } from "@/lib/admin-auth-store";
import { useUserAuthHydrated, useUserAuthStore } from "@/lib/user-auth-store";
import { useUserLogout } from "@/hooks";

const NAV_LINKS = [
  { href: "/", label: "Szukaj" },
  { href: "/statistics", label: "Statystyki" },
  { href: "/analysis", label: "Analiza" },
];

const ROLE_LABELS: Record<string, string> = {
  tenant: "Najemca",
  landlord: "Wynajmujący",
};

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const adminHydrated = useAdminAuthHydrated();
  const adminToken = useAdminAuthStore((state) => state.token);
  const adminUsername = useAdminAuthStore((state) => state.username);
  const isAdminLoggedIn = adminHydrated && !!adminToken;

  const userHydrated = useUserAuthHydrated();
  const user = useUserAuthStore((state) => state.user);
  const userToken = useUserAuthStore((state) => state.token);
  const isUserLoggedIn = userHydrated && !!userToken && !!user;

  const userLogout = useUserLogout();

  const handleUserLogout = () => {
    userLogout.mutate(undefined, {
      onSuccess: () => {
        toast.success("Wylogowano.");
        router.push("/");
      },
    });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm">
            OLX
          </span>
          <span className="hidden sm:inline">OLX Room Finder</span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname === link.href ? "bg-accent text-accent-foreground" : "text-muted-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isAdminLoggedIn ? (
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <UserCircle className="size-4" />
              <span>{adminUsername}</span>
              <span className="mx-1 text-border">|</span>
              <LayoutDashboard className="size-4" />
              <span>Panel</span>
            </Link>
          ) : isUserLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground">
                <UserCircle className="size-4" />
                <span>{user!.full_name}</span>
                <span className="text-xs text-muted-foreground">({ROLE_LABELS[user!.role] ?? user!.role})</span>
              </span>
              <Button variant="outline" size="sm" onClick={handleUserLogout} disabled={userLogout.isPending}>
                <LogOut className="size-3.5" />
                Wyloguj
              </Button>
            </div>
          ) : (
            <>
              <Link
                href="/register"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Rejestracja
              </Link>
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Logowanie
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
