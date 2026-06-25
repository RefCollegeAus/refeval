import { getSupabaseClient } from "@/lib/supabase/client";
import type { MemberRecord } from "@/lib/types/members";
import type { Role } from "@/lib/types/auth";

// ---------- Admin mutation helpers (call server-side API routes) ----------

type ApiResult = { success: true } | { error: string };

async function adminFetch(method: string, path: string, body: object): Promise<ApiResult> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) return { error: json.error ?? "Unknown error." };
  return { success: true };
}

export async function inviteMember(params: {
  email: string;
  name: string;
  role: Role;
  organisationId: string;
}): Promise<ApiResult> {
  return adminFetch("POST", "/api/admin/invite", params);
}

export async function updateMemberRole(params: {
  userId: string;
  organisationId: string;
  role: Role;
}): Promise<ApiResult> {
  return adminFetch("PATCH", "/api/admin/member", params);
}

export async function removeMember(params: {
  userId: string;
  organisationId: string;
}): Promise<ApiResult> {
  return adminFetch("DELETE", "/api/admin/member", params);
}

// ---------- Read ----------

export async function getMembersForOrganisation(organisationId: string): Promise<MemberRecord[]> {
  const { data, error } = await getSupabaseClient()
    .from("organisation_members")
    .select("role, organisation_id, user_id, profiles(id, name, email)")
    .eq("organisation_id", organisationId);

  if (error) {
    console.error("Failed to load members:", error.message);
    return [];
  }

  return (data || []).map((m: any) => ({
    id: m.user_id,
    name: (m.profiles as any)?.name || (m.profiles as any)?.email || "Unknown",
    email: (m.profiles as any)?.email || "",
    role: m.role as Role,
    organisationId: m.organisation_id,
  }));
}
