"use client";

import { useState, useEffect, useCallback } from "react";
import type { OrganisationSettings } from "@/lib/types/organisationSettings";
import { makeDefaultSettings } from "@/lib/types/organisationSettings";

function storageKey(orgId: string) {
  return `refcoach_org_settings_${orgId}`;
}

function loadFromStorage(orgId: string, orgName: string): OrganisationSettings {
  try {
    const raw = localStorage.getItem(storageKey(orgId));
    if (raw) return JSON.parse(raw) as OrganisationSettings;
  } catch {}
  return makeDefaultSettings(orgName);
}

export function useOrganisationSettings(
  orgId: string | undefined,
  orgName: string,
) {
  const [settings, setSettings] = useState<OrganisationSettings>(() =>
    makeDefaultSettings(orgName),
  );

  useEffect(() => {
    if (!orgId) return;
    setSettings(loadFromStorage(orgId, orgName));
  }, [orgId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSettings = useCallback(
    (patch: Partial<OrganisationSettings>) => {
      if (!orgId) return;
      setSettings((prev) => {
        const next = { ...prev, ...patch };
        try {
          localStorage.setItem(storageKey(orgId), JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [orgId],
  );

  const resetDefaults = useCallback(() => {
    if (!orgId) return;
    const defaults = makeDefaultSettings(orgName);
    setSettings(defaults);
    try {
      localStorage.removeItem(storageKey(orgId));
    } catch {}
  }, [orgId, orgName]);

  return { settings, updateSettings, resetDefaults };
}
