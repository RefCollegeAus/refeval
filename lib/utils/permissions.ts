import type { Role } from "@/lib/types/auth";
import type { PermissionKey } from "@/lib/types/permissions";
import { ROLE_DEFAULT_PERMISSIONS } from "@/lib/types/permissions";

/**
 * Returns true if the user has the given permission.
 *
 * Two-layer model:
 *   1. If `customPerms` is non-null, the user has custom overrides stored in
 *      organisation_user_permissions — use those exclusively.
 *   2. If `customPerms` is null, no overrides exist → fall back to the role's
 *      default permission set defined in ROLE_DEFAULT_PERMISSIONS.
 *
 * Usage in future screens:
 *
 *   const userPerms = permissionMap.get(session.user.id) ?? null;
 *   if (!hasPermission(userPerms, session.activeRole, PERMISSIONS.LEARNING_CLIP_LIBRARY)) {
 *     return <AccessDenied />;
 *   }
 */
export function hasPermission(
  customPerms: Set<string> | null | undefined,
  role: Role | null | undefined,
  key: PermissionKey
): boolean {
  // Super admins always have every permission regardless of any stored overrides
  if (role === "super_admin") return true;
  if (customPerms != null) {
    return customPerms.has(key);
  }
  if (!role) return false;
  const defaults = ROLE_DEFAULT_PERMISSIONS[role];
  return defaults ? (defaults as string[]).includes(key) : false;
}

/**
 * Returns the default permission set for a role as a Set<string>.
 */
export function defaultPermsForRole(role: Role): Set<string> {
  return new Set(ROLE_DEFAULT_PERMISSIONS[role] ?? []);
}
