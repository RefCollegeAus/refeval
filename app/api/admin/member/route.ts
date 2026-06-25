import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Role } from "@/lib/types/auth";

const ADMIN_ASSIGNABLE_ROLES: Role[] = ["educator", "referee"];
const SUPER_ADMIN_ONLY_ROLES: Role[] = ["admin", "super_admin"];
const ALL_VALID_ROLES: Role[] = [...ADMIN_ASSIGNABLE_ROLES, ...SUPER_ADMIN_ONLY_ROLES];

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured. Add it to .env.local and your deployment environment."
    );
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function getCallerSession() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  return { supabase, user };
}

async function resolveCallerRole(
  supabase: ReturnType<typeof createServerClient>,
  callerId: string,
  organisationId: string
): Promise<Role | null> {
  const { data } = await supabase
    .from("organisation_members")
    .select("role")
    .eq("user_id", callerId)
    .eq("organisation_id", organisationId)
    .single();
  return (data?.role as Role) ?? null;
}

// PATCH /api/admin/member — update a member's role within an organisation
export async function PATCH(request: NextRequest) {
  let body: { userId?: string; organisationId?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { userId, organisationId, role } = body;
  if (!userId || !organisationId || !role) {
    return NextResponse.json({ error: "userId, organisationId, and role are required." }, { status: 400 });
  }
  if (!ALL_VALID_ROLES.includes(role as Role)) {
    return NextResponse.json({ error: `Invalid role: ${role}` }, { status: 400 });
  }

  const caller = await getCallerSession();
  if (!caller) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  // Prevent self-demotion
  if (caller.user.id === userId) {
    return NextResponse.json({ error: "You cannot change your own role." }, { status: 403 });
  }

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
    console.error("[member PATCH] Service role client error:", message);
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const { error } = await admin
    .from("organisation_members")
    .update({ role })
    .eq("user_id", userId)
    .eq("organisation_id", organisationId);

  if (error) {
    console.error("[member PATCH] update error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}

// DELETE /api/admin/member — remove a member from an organisation
export async function DELETE(request: NextRequest) {
  let body: { userId?: string; organisationId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { userId, organisationId } = body;
  if (!userId || !organisationId) {
    return NextResponse.json({ error: "userId and organisationId are required." }, { status: 400 });
  }

  const caller = await getCallerSession();
  if (!caller) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  if (caller.user.id === userId) {
    return NextResponse.json({ error: "You cannot remove yourself from the organisation." }, { status: 403 });
  }

  const callerRole = await resolveCallerRole(caller.supabase, caller.user.id, organisationId);
  if (callerRole !== "admin" && callerRole !== "super_admin") {
    return NextResponse.json({ error: "Forbidden: you are not an admin of this organisation." }, { status: 403 });
  }

  let admin;
  try {
    admin = getServiceRoleClient();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server configuration error.";
    console.error("[member DELETE] Service role client error:", message);
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const { error } = await admin
    .from("organisation_members")
    .delete()
    .eq("user_id", userId)
    .eq("organisation_id", organisationId);

  if (error) {
    console.error("[member DELETE] delete error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
