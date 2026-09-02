import { randomInt } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient, getCallerSession, resolveCallerRole } from "@/lib/supabase/adminAuth";
import type { Role } from "@/lib/types/auth";

const ADMIN_ASSIGNABLE_ROLES: Role[] = ["educator", "referee"];
const SUPER_ADMIN_ONLY_ROLES: Role[] = ["admin", "super_admin"];
const ALL_VALID_ROLES: Role[] = [...ADMIN_ASSIGNABLE_ROLES, ...SUPER_ADMIN_ONLY_ROLES];

// Excludes visually ambiguous characters (0/O, 1/l/I) since this is read off
// a screen and retyped or copy-pasted by an admin handing it to someone else.
const PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function generateTempPassword(length = 14): string {
  let out = "";
  for (let i = 0; i < length; i++) out += PASSWORD_ALPHABET[randomInt(PASSWORD_ALPHABET.length)];
  return out;
}

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
    console.error("[create-account] Service role client error:", message);
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const tempPassword = generateTempPassword();

  // email_confirm: true marks the account as already verified — there is no
  // invite email in this flow, so there is nothing for the user to click.
  const { data: createData, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name },
  });

  if (createError) {
    console.error("[create-account] createUser error:", createError.message);
    const msg = createError.message.toLowerCase();
    if (msg.includes("already registered") || msg.includes("already been registered")) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
    }
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  const userId = createData.user.id;

  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: userId, email, name, must_change_password: true }, { onConflict: "id" });

  if (profileError) {
    console.error("[create-account] profile upsert error:", profileError.message);
  }

  const { error: memberError } = await admin
    .from("organisation_members")
    .upsert(
      { user_id: userId, organisation_id: organisationId, role, joined_at: new Date().toISOString() },
      { onConflict: "user_id,organisation_id" }
    );

  if (memberError) {
    console.error("[create-account] organisation_members insert error:", memberError.message);
    return NextResponse.json(
      { error: `Account created but could not be added to organisation: ${memberError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, userId, tempPassword }, { status: 200 });
}
