"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Bell,
  Calendar,
  FolderKanban,
  TrendingUp,
  TrendingDown,
  CheckCheck,
  X,
  Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  userId: string;
  portfolioId: string | null;
  type: string;
  title: string;
  message: string;
  isRead: number;
  link: string | null;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d atrás`;
  const months = Math.floor(days / 30);
  return `${months}m atrás`;
}

function getNotificationIcon(type: string): LucideIcon {
  switch (type) {
    case "maturity":
      return Calendar;
    case "project_alert":
      return FolderKanban;
    case "stop_gain":
      return TrendingUp;
    case "stop_loss":
      return TrendingDown;
    default:
      return Bell;
  }
}

function getNotificationIconColor(type: string): string {
  switch (type) {
    case "maturity":
      return "text-blue-500";
    case "project_alert":
      return "text-orange-500";
    case "stop_gain":
      return "text-green-500";
    case "stop_loss":
      return "text-red-500";
    default:
      return "text-muted-foreground";
  }
}

export default function NotificacoesPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Erro ao carregar notificações");
      const data = (await res.json()) as any;
      setNotifications(data.notifications || []);
    } catch {
      toast.error("Erro ao carregar notificações");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.isRead === 0) {
      try {
        const res = await fetch(`/api/notifications/${notification.id}`, {
          method: "PUT",
        });
        if (!res.ok) throw new Error();
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, isRead: 1 } : n
          )
        );
      } catch {
        toast.error("Erro ao marcar notificação como lida");
      }
    }

    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true);
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: 1 }))
      );
      toast.success("Todas as notificações foram marcadas como lidas");
    } catch {
      toast.error("Erro ao marcar notificações como lidas");
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success("Notificação removida");
    } catch {
      toast.error("Erro ao remover notificação");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const unreadCount = notifications.filter((n) => n.isRead === 0).length;

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Notificações"
          description="Suas notificações e alertas"
        />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-4 rounded-lg border p-4">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Notificações"
        description="Suas notificações e alertas"
      >
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markingAllRead}
          >
            {markingAllRead ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <CheckCheck className="mr-2 size-4" />
            )}
            Marcar todas como lidas
          </Button>
        )}
      </PageHeader>

      {notifications.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Bell}
            title="Nenhuma notificação"
            description="Você não tem notificações no momento. Quando houver alertas sobre seus investimentos, eles aparecerão aqui."
          />
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {notifications.map((notification) => {
            const Icon = getNotificationIcon(notification.type);
            const iconColor = getNotificationIconColor(notification.type);
            const isUnread = notification.isRead === 0;
            const isDeleting = deletingIds.has(notification.id);

            return (
              <div
                key={notification.id}
                role="button"
                tabIndex={0}
                onClick={() => handleMarkAsRead(notification)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleMarkAsRead(notification);
                  }
                }}
                className={cn(
                  "group flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 cursor-pointer",
                  isUnread && "border-l-4 border-l-primary bg-muted/30"
                )}
              >
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full",
                    isUnread ? "bg-primary/10" : "bg-muted"
                  )}
                >
                  <Icon className={cn("size-5", iconColor)} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={cn(
                        "text-sm truncate",
                        isUnread ? "font-semibold" : "font-medium"
                      )}
                    >
                      {notification.title}
                    </p>
                    {isUnread && (
                      <span className="size-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {timeAgo(notification.createdAt)}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => handleDelete(notification.id, e)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <X className="size-4" />
                  )}
                  <span className="sr-only">Remover notificação</span>
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
