"use client";

import { useState, useCallback } from "react";
import type { NotificationPreferences } from "@/lib/types/notifications";

const DEFAULTS: Omit<NotificationPreferences, "userId"> = {
  inAppEnabled: true,
  reviewNotifications: true,
  assignmentNotifications: true,
  learningNotifications: true,
  developmentGoalNotifications: true,
  organisationNotifications: true,
  systemNotifications: true,
};

function storageKey(userId: string) {
  return `refcoach_notif_prefs_${userId}`;
}

function loadPrefs(userId: string): NotificationPreferences {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw), userId };
  } catch {}
  return { ...DEFAULTS, userId };
}

export function useNotificationPreferences(userId: string | null) {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(() =>
    userId ? loadPrefs(userId) : null,
  );

  const updatePreferences = useCallback(
    (patch: Partial<NotificationPreferences>) => {
      if (!userId) return;
      setPreferences(prev => {
        const next = { ...(prev ?? { ...DEFAULTS, userId }), ...patch };
        try { localStorage.setItem(storageKey(userId), JSON.stringify(next)); } catch {}
        return next;
      });
    },
    [userId],
  );

  const resetPreferences = useCallback(() => {
    if (!userId) return;
    const defaults = { ...DEFAULTS, userId };
    try { localStorage.removeItem(storageKey(userId)); } catch {}
    setPreferences(defaults);
  }, [userId]);

  return { preferences, updatePreferences, resetPreferences };
}
