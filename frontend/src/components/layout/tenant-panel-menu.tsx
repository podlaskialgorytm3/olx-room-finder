"use client";

/**
 * Zbiorczy dropdown "Panel najemcy" w navbarze - chowa pod jednym
 * przyciskiem elementy specyficzne dla najemcy: Ulubione, Alerty oraz
 * centrum powiadomień (dawniej osobne pozycje/ikona na pasku nawigacji,
 * patrz `notification-bell.tsx`), żeby nie zaśmiecać głównego paska.
 */

import Link from "next/link";
import { Heart, LayoutDashboard, ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NotificationRow } from "@/components/notifications/notification-bell";
import { useMarkAllNotificationsRead, useNotifications } from "@/hooks";

export function TenantPanelMenu() {
  const { data } = useNotifications({ limit: 10 });
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = data?.unread_count ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative flex items-center gap-2 text-muted-foreground">
          <LayoutDashboard className="size-4" />
          <span>Panel najemcy</span>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-4 min-w-4 px-1 text-[0.65rem]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuItem asChild>
          <Link href="/favorites" className="flex items-center gap-2">
            <Heart className="size-4" />
            <span>Ulubione</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/alerts" className="flex items-center gap-2">
            <ListChecks className="size-4" />
            <span>Alerty</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <div className="flex items-center justify-between px-1.5 py-1">
          <DropdownMenuLabel className="p-0">Powiadomienia</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="xs"
              onClick={(event) => {
                event.preventDefault();
                markAllRead.mutate();
              }}
              disabled={markAllRead.isPending}
            >
              Oznacz wszystkie
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-72">
          <div className="flex flex-col gap-0.5 px-0.5 pb-1">
            {data && data.data.length > 0 ? (
              data.data.map((notification) => <NotificationRow key={notification.id} notification={notification} />)
            ) : (
              <p className="px-2.5 py-4 text-center text-xs text-muted-foreground">Brak powiadomień.</p>
            )}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
