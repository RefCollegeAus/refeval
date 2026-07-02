import { getSupabaseClient } from "@/lib/supabase/client";
import type { MemberRecord, EnrichedMember } from "@/lib/types/members";
import type { Role } from "@/lib/types/auth";

// ---------- Shared fetch helper ----------

type ApiResult = { success: true } | { error: string };

async function adminFetch(method: string, path: string, body: object): Promise<ApiResult> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) return { error: (json as any).error ?? "Unknown error." };
  return { success: true };
}

// ---------- Member mutations (server-side API routes) ----------

export async function inviteMember(params: {
  email: string;
  name: string;
  role: Role;
  organisationId: string;
}): Promise<ApiResult> {
  return adminFetch("POST", "/api/admin/invite", params);
}

export async function resendInvitation(params: {
  email: string;
  organisationId: string;
}): Promise<ApiResult> {
  return adminFetch("POST", "/api/admin/invite/resend", params);
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

export async function updateProfileName(name: string): Promise<ApiResult> {
  return adminFetch("PATCH", "/api/admin/profile", { name });
}

export async function adminUpdateUserProfile(params: {
  userId: string;
  organisationId: string;
  name?: string;
  email?: string;
}): Promise<ApiResult> {
  return adminFetch("PATCH", "/api/admin/user-profile", params);
}

export async function adminUpdateUserPassword(params: {
  userId: string;
  organisationId: string;
  newPassword: string;
}): Promise<ApiResult> {
  return adminFetch("POST", "/api/admin/user-password", params);
}

// ---------- Read ----------

export async function getMembersForOrganisation(organisationId: string): Promise<MemberRecord[]> {
  const client = getSupabaseClient();

  const { data: memberRows, error: membersError } = await client
    .from("organisation_members")
    .select("role, organisation_id, user_id")
    .eq("organisation_id", organisationId);

  if (membersError) {
    console.error("Failed to load members:", membersError.message);
    return [];
  }
  if (!memberRows || memberRows.length === 0) return [];

  const userIds = memberRows.map((m: any) => m.user_id);

  const { data: profileRows, error: profilesError } = await client
    .from("profiles")
    .select("id, name, email")
    .in("id", userIds);

  if (profilesError) {
    console.error("Failed to load profiles:", profilesError.message);
    return [];
  }

  const profileMap = new Map<string, { id: string; name: string | null; email: string | null }>(
    (profileRows ?? []).map((p: any) => [p.id, p])
  );

  return memberRows.map((m: any) => {
    const p = profileMap.get(m.user_id);
    return {
      id: m.user_id,
      name: p?.name || p?.email || "Unknown",
      email: p?.email || "",
      role: m.role as Role,
      organisationId: m.organisation_id,
    };
  });
}

export async function getEnrichedMembers(organisationId: string): Promise<EnrichedMember[]> {
  const res = await fetch(
    `/api/admin/members?organisationId=${encodeURIComponent(organisationId)}`
  );
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    const msg = (json as any).error ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  const json = await res.json();
  return (json as any).members || [];
}
