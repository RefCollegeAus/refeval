"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * Loads and manages organisation_user_permissions for an org.
 *
 * permissionMap: userId → Set<permissionKey> for users with stored overrides.
 * If a user has no entry in the map, callers should fall back to role defaults
 * via hasPermission() from lib/utils/permissions.
 */
export function usePermissions(orgId: string) {
  const [permissionMap, setPermissionMap] = useState<Map<string, Set<string>>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: err } = await getSupabaseClient()
        .from("organisation_user_permissions")
        .select("user_id, permission_key, granted")
        .eq("organisation_id", orgId);
      if (err) throw err;

      const map = new Map<string, Set<string>>();
      for (const row of data || []) {
        if (!row.granted) continue;
        if (!map.has(row.user_id)) map.set(row.user_id, new Set());
        map.get(row.user_id)!.add(row.permission_key);
      }
      setPermissionMap(map);
    } catch (e: any) {
      setError(e?.message || "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  /**
   * Returns stored permission overrides for a user, or null if none exist.
   * Callers use null to mean "use role defaults".
   */
  function getUserPerms(userId: string): Set<string> | null {
    return permissionMap.has(userId) ? permissionMap.get(userId)! : null;
  }

  /**
   * Saves the full permission set for a user (replaces all existing rows).
   * Pass an empty Set to clear custom permissions (user reverts to role defaults).
   */
  async function saveUserPerms(userId: string, perms: Set<string>): Promise<void> {
    const supabase = getSupabaseClient();

    // Delete all existing custom permissions for this user/org
    const { error: delErr } = await supabase
      .from("organisation_user_permissions")
      .delete()
      .eq("organisation_id", orgId)
      .eq("user_id", userId);
    if (delErr) throw delErr;

    // Insert new permissions (if any)
    if (perms.size > 0) {
      const rows = Array.from(perms).map(key => ({
        organisation_id: orgId,
        user_id: userId,
        permission_key: key,
        granted: true,
      }));
      const { error: insErr } = await supabase
        .from("organisation_user_permissions")
        .insert(rows);
      if (insErr) throw insErr;
    }

    await load();
  }

  return { permissionMap, loading, error, load, getUserPerms, saveUserPerms };
}
