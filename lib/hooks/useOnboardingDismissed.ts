"use client";

import { useState, useCallback } from "react";

function storageKey(userId: string) {
  return `refcoach_onboarding_dismissed_${userId}`;
}

export function useOnboardingDismissed(userId: string | null) {
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    if (!userId) return true;
    try {
      return localStorage.getItem(storageKey(userId)) === "true";
    } catch {
      return false;
    }
  });

  const dismiss = useCallback(() => {
    if (!userId) return;
    try {
      localStorage.setItem(storageKey(userId), "true");
    } catch {}
    setIsDismissed(true);
  }, [userId]);

  return { isDismissed, dismiss };
}
