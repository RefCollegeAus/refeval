import type { Notification } from "@/lib/types/notifications";

export function createNotification(
  notifications: Notification[],
  draft: Omit<Notification, "id" | "isRead" | "readAt">
): Notification[] {
  const newNotif: Notification = {
    ...draft,
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    isRead: false,
    readAt: null,
  };
  return [newNotif, ...notifications];
}

export function markNotificationRead(
  notifications: Notification[],
  id: string
): Notification[] {
  const now = new Date().toISOString();
  return notifications.map(n =>
    n.id === id ? { ...n, isRead: true, readAt: now } : n
  );
}

export function markAllNotificationsRead(notifications: Notification[]): Notification[] {
  const now = new Date().toISOString();
  return notifications.map(n =>
    n.isRead ? n : { ...n, isRead: true, readAt: now }
  );
}

export function deleteNotification(
  notifications: Notification[],
  id: string
): Notification[] {
  return notifications.filter(n => n.id !== id);
}

export function getUnreadNotificationCount(notifications: Notification[]): number {
  return notifications.filter(n => !n.isRead).length;
}
