import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient, getCallerSession, resolveCallerRole } from "@/lib/supabase/adminAuth";
import type { Role } from "@/lib/types/auth";

const ADMIN_ASSIGNABLE_ROLES: Role[] = ["educator", "referee"];
const SUPER_ADMIN_ONLY_ROLES: Role[] = ["admin", "super_admin"];
const ALL_VALID_ROLES: Role[] = [...ADMIN_ASSIGNABLE_ROLES, ...SUPER_ADMIN_ONLY_ROLES];

export async function POST(request: NextRequest) {
  let body: { email?: string; name?: string; role?: string; organisationId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, name, role, organisationId } = body;
  if (!email || !name || !role || !organisationId) {
    return NextResponse.json({ error: "email, name, role, and organisationId are required." }, { status: 400 });
  }
  if (!ALL_VALID_ROLES.includes(role as Role)) {
    return NextResponse.json({ error: `Invalid role: ${role}` }, { status: 400 });
  }

  const caller = await getCallerSession();
  if (!caller) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  const callerRole = await resolveCallerRole(caller.supabase, caller.user.id, organisationId);
  if (callerRole !== "admin" && callerRole !== "super_admin") {
    return NextResponse.json({ error: "Forbidden: you are not an admin of this organisation." }, { status: 403 });
  }
  if (SUPER_ADMIN_ONLY_ROLES.includes(role as Role) && callerRole !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: only a super_admin may assign admin or super_admin roles." },
      { status: 403 }
    );
  }

  let admin;
  try {
    admin = getServiceRoleClient();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server configuration error.";
    console.error("[invite] Service role client error:", message);
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name },
  });

  if (inviteError) {
    console.error("[invite] inviteUserByEmail error:", inviteError.message);
    return NextResponse.json({ error: inviteError.message }, { status: 400 });
  }

  const userId = inviteData.user.id;

  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: userId, email, name }, { onConflict: "id" });

  if (profileError) {
    console.error("[invite] profile upsert error:", profileError.message);
  }

  const { error: memberError } = await admin
    .from("organisation_members")
    .upsert(
      { user_id: userId, organisation_id: organisationId, role, joined_at: new Date().toISOString() },
      { onConflict: "user_id,organisation_id" }
    );

  if (memberError) {
    console.error("[invite] organisation_members insert error:", memberError.message);
    return NextResponse.json(
      { error: `User invited but could not be added to organisation: ${memberError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, userId }, { status: 200 });
}
