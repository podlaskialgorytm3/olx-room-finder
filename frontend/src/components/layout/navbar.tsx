"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminAuthHydrated, useAdminAuthStore } from "@/lib/admin-auth-store";

const NAV_LINKS = [
  { href: "/", label: "Szukaj" },
  { href: "/statistics", label: "Statystyki" },
  { href: "/analysis", label: "Analiza" },
];

export function Navbar() {
  const pathname = usePathname();
  const hydrated = useAdminAuthHydrated();
  const token = useAdminAuthStore((state) => state.token);
  const username = useAdminAuthStore((state) => state.username);
  const isLoggedIn = hydrated && !!token;

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
          {isLoggedIn ? (
            <Link
              href="/admin"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <UserCircle className="size-4" />
              <span>{username}</span>
              <span className="mx-1 text-border">|</span>
              <LayoutDashboard className="size-4" />
              <span>Panel</span>
            </Link>
          ) : (
            <>
              <Link
                href="/register"
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                Rejestracja
              </Link>
              <Link
                href="/admin"
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
