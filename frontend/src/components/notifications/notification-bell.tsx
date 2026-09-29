"use client";

/**
 * Dzwonek powiadomień w navbarze - pokazuje liczbę nieprzeczytanych
 * powiadomień (NEW_OFFER/PRICE_DROP z alertów, patrz
 * `backend/routers/notifications.py`) i listę najnowszych w popoverze.
 * Kliknięcie powiadomienia oznacza je jako przeczytane i przenosi do
 * szczegółów oferty (`/offers/{offer_id}`), jeśli oferta jeszcze istnieje.
 */

import Link from "next/link";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/hooks";
import { formatDate } from "@/lib/format";
import type { AppNotification } from "@/types";

const TYPE_ICON: Record<AppNotification["type"], string> = {
  NEW_OFFER: "🆕",
  PRICE_DROP: "📉",
  OFFER_REMOVED: "🗑️",
};

function NotificationRow({ notification }: { notification: AppNotification }) {
  const markRead = useMarkNotificationRead();

  const handleClick = () => {
    if (!notification.is_read) markRead.mutate(notification.id);
  };

  const content = (
    <div
      className={`flex flex-col gap-0.5 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-accent ${
        notification.is_read ? "opacity-60" : ""
      }`}
    >
      <span className="font-medium">
        {TYPE_ICON[notification.type]} {notification.title}
      </span>
      <span className="whitespace-pre-line text-xs text-muted-foreground">{notification.message}</span>
      <span className="text-[0.7rem] text-muted-foreground">{formatDate(notification.created_at)}</span>
    </div>
  );

  if (notification.offer_id) {
    return (
      <Link href={`/offers/${encodeURIComponent(notification.offer_id)}`} onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={handleClick} className="block w-full text-left">
      {content}
    </button>
  );
}

export function NotificationBell() {
  const { data } = useNotifications({ limit: 10 });
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = data?.unread_count ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Powiadomienia">
          <Bell className="size-4.5" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[0.65rem]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-medium">Powiadomienia</span>
          {unreadCount > 0 && (
            <Button variant="ghost" size="xs" onClick={() => markAllRead.mutate()} disabled={markAllRead.isPending}>
              Oznacz wszystkie jako przeczytane
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          <div className="flex flex-col gap-0.5 p-1.5">
            {data && data.data.length > 0 ? (
              data.data.map((notification) => <NotificationRow key={notification.id} notification={notification} />)
            ) : (
              <p className="px-2.5 py-6 text-center text-sm text-muted-foreground">Brak powiadomień.</p>
            )}
          </div>
        </ScrollArea>
        <div className="border-t border-border px-3 py-2 text-center">
          <Link href="/alerts" className="text-xs font-medium text-primary hover:underline">
            Zarządzaj alertami
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
