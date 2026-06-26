import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient, getCallerSession, resolveCallerRole } from "@/lib/supabase/adminAuth";
import type { EnrichedMember } from "@/lib/types/members";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const organisationId = searchParams.get("organisationId");

  if (!organisationId) {
    return NextResponse.json({ error: "organisationId is required." }, { status: 400 });
  }

  const caller = await getCallerSession();
  if (!caller) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  const callerRole = await resolveCallerRole(caller.supabase, caller.user.id, organisationId);
  if (callerRole !== "admin" && callerRole !== "super_admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let admin;
  try {
    admin = getServiceRoleClient();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server configuration error.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const { data: memberRows, error: membersError } = await admin
    .from("organisation_members")
    .select("role, organisation_id, user_id, joined_at, profiles(id, name, email)")
    .eq("organisation_id", organisationId)
    .order("joined_at", { ascending: true });

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  if (!memberRows || memberRows.length === 0) {
    return NextResponse.json({ members: [] });
  }

  // Fetch auth metadata for all org members in one call.
  // perPage 1000 is sufficient for any realistic org size.
  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const userMap = new Map((authData?.users ?? []).map((u: any) => [u.id, u]));

  const members: EnrichedMember[] = memberRows.map((m: any) => {
    const authUser = userMap.get(m.user_id);
    const confirmed = !!(authUser?.email_confirmed_at || authUser?.confirmed_at);
    return {
      id: m.user_id,
      name: (m.profiles as any)?.name || (m.profiles as any)?.email || "Unknown",
      email: (m.profiles as any)?.email || "",
      role: m.role,
      organisationId: m.organisation_id,
      joinedAt: m.joined_at ?? null,
      invitedAt: authUser?.invited_at ?? null,
      lastSignInAt: authUser?.last_sign_in_at ?? null,
      invitationStatus: confirmed ? "active" : "pending",
    };
  });

  return NextResponse.json({ members });
}
