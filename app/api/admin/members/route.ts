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

  // Step 1: fetch organisation_members without any embedded join.
  const { data: memberRows, error: membersError } = await admin
    .from("organisation_members")
    .select("role, organisation_id, user_id, joined_at")
    .eq("organisation_id", organisationId);

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 });
  }

  if (!memberRows || memberRows.length === 0) {
    return NextResponse.json({ members: [] });
  }

  // Step 2: fetch profiles separately using the collected user_ids.
  const userIds = memberRows.map((m: any) => m.user_id);

  const { data: profileRows, error: profilesError } = await admin
    .from("profiles")
    .select("id, name, email")
    .in("id", userIds);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 });
  }

  const profileMap = new Map(
    (profileRows ?? []).map((p: any) => [p.id, p])
  );

  // Step 3: fetch auth metadata for invitation status and last sign-in.
  // perPage 1000 is sufficient for any realistic org size.
  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const userMap = new Map((authData?.users ?? []).map((u: any) => [u.id, u]));

  // Step 4: merge all three data sources.
  const members: EnrichedMember[] = memberRows.map((m: any) => {
    const profile = profileMap.get(m.user_id);
    const authUser = userMap.get(m.user_id);
    const confirmed = !!(authUser?.email_confirmed_at || authUser?.confirmed_at);
    return {
      id: m.user_id,
      name: profile?.name || profile?.email || "Unknown",
      email: profile?.email || "",
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
