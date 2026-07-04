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

function buildSampleNotifications(userId: string, organisationId: string): Notification[] {
  const now = new Date();
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60 * 1000).toISOString();

  return [
    {
      id: "sample_1",
      organisationId,
      userId,
      type: "review_assigned",
      title: "New Review Assigned",
      message: "You have been assigned a review for the NBL1 South Round 12 game.",
      relatedEntityType: "review",
      relatedEntityId: null,
      createdAt: ago(5),
      createdBy: null,
      isRead: false,
      readAt: null,
      priority: "high",
      actionLabel: "View Review",
      actionRoute: "reviewer",
      metadata: null,
    },
    {
      id: "sample_2",
      organisationId,
      userId,
      type: "comment_received",
      title: "New Comment on Your Review",
      message: "An educator has left feedback on your Q3 positioning in the recent review.",
      relatedEntityType: "comment",
      relatedEntityId: null,
      createdAt: ago(42),
      createdBy: null,
      isRead: false,
      readAt: null,
      priority: "normal",
      actionLabel: "View Comments",
      actionRoute: "referee-comments",
      metadata: null,
    },
    {
      id: "sample_3",
      organisationId,
      userId,
      type: "assignment_due",
      title: "Assignment Due Soon",
      message: "\"Foul Recognition Fundamentals\" playlist is due in 2 days.",
      relatedEntityType: "assignment",
      relatedEntityId: null,
      createdAt: ago(120),
      createdBy: null,
      isRead: false,
      readAt: null,
      priority: "high",
      actionLabel: "Start Learning",
      actionRoute: "my-learning",
      metadata: null,
    },
    {
      id: "sample_4",
      organisationId,
      userId,
      type: "playlist_shared",
      title: "Playlist Shared With You",
      message: "\"Advanced Mechanics — Block/Charge\" has been shared with your group.",
      relatedEntityType: "playlist",
      relatedEntityId: null,
      createdAt: ago(300),
      createdBy: null,
      isRead: true,
      readAt: ago(250),
      priority: "normal",
      actionLabel: "View Playlist",
      actionRoute: "playlists",
      metadata: null,
    },
    {
      id: "sample_5",
      organisationId,
      userId,
      type: "goal_updated",
      title: "Development Goal Updated",
      message: "Your educator has updated notes on your defensive positioning goal.",
      relatedEntityType: "development_goal",
      relatedEntityId: null,
      createdAt: ago(1440),
      createdBy: null,
      isRead: true,
      readAt: ago(1300),
      priority: "normal",
      actionLabel: "View Goals",
      actionRoute: "referee-development",
      metadata: null,
    },
    {
      id: "sample_6",
      organisationId,
      userId,
      type: "organisation_announcement",
      title: "Season Schedule Updated",
      message: "The upcoming season schedule has been updated. Please review your assigned games.",
      relatedEntityType: "organisation",
      relatedEntityId: null,
      createdAt: ago(2880),
      createdBy: null,
      isRead: true,
      readAt: ago(2500),
      priority: "low",
      actionLabel: null,
      actionRoute: null,
      metadata: null,
    },
  ];
}

export function useNotifications(userId: string | null, organisationId: string | null) {
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    if (!userId || !organisationId) return [];
    return buildSampleNotifications(userId, organisationId);
  });

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
