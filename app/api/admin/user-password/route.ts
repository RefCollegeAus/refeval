import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient, getCallerSession, resolveCallerRole } from "@/lib/supabase/adminAuth";

export async function POST(request: NextRequest) {
  let body: { userId?: string; organisationId?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { userId, organisationId, newPassword } = body;

  if (!userId || !organisationId || !newPassword) {
    return NextResponse.json({ error: "userId, organisationId, and newPassword are required." }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const caller = await getCallerSession();
  if (!caller) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  // Password changes are super_admin only
  const callerRole = await resolveCallerRole(caller.supabase, caller.user.id, organisationId);
  if (callerRole !== "super_admin") {
    return NextResponse.json({ error: "Forbidden: only a super_admin may change user passwords." }, { status: 403 });
  }

  let admin;
  try {
    admin = getServiceRoleClient();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server configuration error.";
    console.error("[user-password POST] Service role client error:", message);
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });

  if (error) {
    console.error("[user-password POST] updateUserById error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
