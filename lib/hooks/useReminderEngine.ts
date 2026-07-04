"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Notification } from "@/lib/types/notifications";
import type { Assignment } from "@/lib/types/assignments";
import type { RefereeGoalView } from "@/lib/types/developmentGoals";
import { checkAssignmentReminders, checkGoalReminders } from "@/lib/services/reminders";

function storageKey(userId: string) {
  return `refcoach_reminder_keys_${userId}`;
}

function loadSeenKeys(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function persistSeenKeys(userId: string, keys: Set<string>) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(Array.from(keys)));
  } catch {}
}

export function useReminderEngine({
  userId,
  orgId,
  myAssignments,
  allRefereeGoalViews,
  addNotification,
}: {
  userId: string | null;
  orgId: string | null;
  myAssignments: Assignment[];
  allRefereeGoalViews: RefereeGoalView[];
  addNotification: (draft: Omit<Notification, "id" | "isRead" | "readAt">) => void;
}) {
  // In-memory cache of seen keys so we don't hit localStorage on every run.
  // Reset when userId changes so a new user never inherits a previous user's cache.
  const seenKeysRef = useRef<Set<string> | null>(null);
  const cachedUserIdRef = useRef<string | null>(null);

  const getSeenKeys = useCallback((): Set<string> => {
    if (!userId) return new Set();
    if (userId !== cachedUserIdRef.current) {
      seenKeysRef.current = null;
      cachedUserIdRef.current = userId;
    }
    if (!seenKeysRef.current) {
      seenKeysRef.current = loadSeenKeys(userId);
    }
    return seenKeysRef.current;
  }, [userId]);

  useEffect(() => {
    if (!userId || !orgId) return;
    // Skip until at least one data source has loaded (avoids false negatives on empty initial state)
    if (myAssignments.length === 0 && allRefereeGoalViews.length === 0) return;

    const seenKeys = getSeenKeys();

    const reminders = [
      ...checkAssignmentReminders(myAssignments, userId, orgId, seenKeys),
      ...checkGoalReminders(allRefereeGoalViews, userId, orgId, seenKeys),
    ];

    if (reminders.length === 0) return;

    for (const { key, draft } of reminders) {
      addNotification(draft);
      seenKeys.add(key);
    }

    persistSeenKeys(userId, seenKeys);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, orgId, myAssignments, allRefereeGoalViews]);
}
