import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient, getCallerSession, resolveCallerRole } from "@/lib/supabase/adminAuth";

export async function PATCH(request: NextRequest) {
  let body: { userId?: string; organisationId?: string; name?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { userId, organisationId, name, email } = body;

  if (!userId || !organisationId) {
    return NextResponse.json({ error: "userId and organisationId are required." }, { status: 400 });
  }
  if (!name?.trim() && !email?.trim()) {
    return NextResponse.json({ error: "At least one of name or email is required." }, { status: 400 });
  }

  const caller = await getCallerSession();
  if (!caller) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  const callerRole = await resolveCallerRole(caller.supabase, caller.user.id, organisationId);
  if (callerRole !== "admin" && callerRole !== "super_admin") {
    return NextResponse.json({ error: "Forbidden: admins only." }, { status: 403 });
  }

  // Email changes are super_admin only (sensitive — changes login credential)
  if (email?.trim() && callerRole !== "super_admin") {
    return NextResponse.json({ error: "Forbidden: only a super_admin may change a user's email." }, { status: 403 });
  }

  let admin;
  try {
    admin = getServiceRoleClient();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server configuration error.";
    console.error("[user-profile PATCH] Service role client error:", message);
    return NextResponse.json({ error: message }, { status: 503 });
  }

  // Update Supabase Auth user (email lives here)
  if (email?.trim()) {
    const { error: authError } = await admin.auth.admin.updateUserById(userId, {
      email: email.trim(),
    });
    if (authError) {
      console.error("[user-profile PATCH] auth updateUserById error:", authError.message);
      return NextResponse.json({ error: authError.message }, { status: 500 });
    }
  }

  // Update profiles table (name + email kept in sync)
  const profileUpdate: Record<string, string> = {};
  if (name?.trim()) profileUpdate.name = name.trim();
  if (email?.trim()) profileUpdate.email = email.trim();

  const { error: profileError } = await admin
    .from("profiles")
    .update(profileUpdate)
    .eq("id", userId);

  if (profileError) {
    console.error("[user-profile PATCH] profiles update error:", profileError.message);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
