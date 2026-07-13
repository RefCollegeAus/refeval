"use client";

import { useState, useCallback, useMemo } from "react";
import type { Notification } from "@/lib/types/notifications";
import {
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  getUnreadNotificationCount,
} from "@/lib/services/notifications";

export function useNotifications(
  userId: string | null,
  organisationId: string | null,
) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = useMemo(
    () => getUnreadNotificationCount(notifications),
    [notifications]
  );

  const create = useCallback(
    (draft: Omit<Notification, "id" | "isRead" | "readAt">) => {
      setNotifications(prev => createNotification(prev, draft));
    },
    []
  );

  const markRead = useCallback((id: string) => {
    setNotifications(prev => markNotificationRead(prev, id));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => markAllNotificationsRead(prev));
  }, []);

  const remove = useCallback((id: string) => {
    setNotifications(prev => deleteNotification(prev, id));
  }, []);

  return {
    notifications,
    unreadCount,
    createNotification: create,
    markRead,
    markAllRead,
    deleteNotification: remove,
  };
}
