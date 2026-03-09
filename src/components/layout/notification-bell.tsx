"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

const POLL_INTERVAL = 60_000; // 60 segundos

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?unreadOnly=true&limit=1");
      if (!res.ok) return;
      const data = (await res.json()) as any;
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // Silenciar erros de polling
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();

    const interval = setInterval(fetchUnreadCount, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const displayCount = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <Button variant="ghost" size="icon" asChild className="relative">
      <Link href="/notificacoes">
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {displayCount}
          </span>
        )}
        <span className="sr-only">
          {unreadCount > 0
            ? `${unreadCount} notificações não lidas`
            : "Notificações"}
        </span>
      </Link>
    </Button>
  );
}
