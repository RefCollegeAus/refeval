import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Role } from "@/lib/types/auth";

// Roles a regular admin is permitted to assign.
const ADMIN_ASSIGNABLE_ROLES: Role[] = ["educator", "referee"];
// Roles only a super_admin may assign.
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

export async function POST(request: NextRequest) {
  // 1. Parse and validate body
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

  // 2. Verify caller identity
  const caller = await getCallerSession();
  if (!caller) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  // 3. Resolve caller's role in the target organisation
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

  // 4. Get service role client — fails safely if env var is missing
  let admin;
  try {
    admin = getServiceRoleClient();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server configuration error.";
    console.error("[invite] Service role client error:", message);
    return NextResponse.json({ error: message }, { status: 503 });
  }

  // 5. Invite the user (creates auth.users row and sends invitation email)
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { name },
  });

  if (inviteError) {
    // Supabase returns an error if the user already exists — surface it clearly
    console.error("[invite] inviteUserByEmail error:", inviteError.message);
    return NextResponse.json({ error: inviteError.message }, { status: 400 });
  }

  const userId = inviteData.user.id;

  // 6. Upsert the profile row (Auth trigger may not fire on invitations)
  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: userId, email, name }, { onConflict: "id" });

  if (profileError) {
    console.error("[invite] profile upsert error:", profileError.message);
    // Non-fatal: the user exists in auth.users; profile can be fixed later
  }

  // 7. Insert the organisation_members row
  const { error: memberError } = await admin
    .from("organisation_members")
    .upsert(
      { user_id: userId, organisation_id: organisationId, role },
      { onConflict: "user_id,organisation_id" }
    );

  if (memberError) {
    console.error("[invite] organisation_members insert error:", memberError.message);
    return NextResponse.json({ error: `User invited but could not be added to organisation: ${memberError.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true, userId }, { status: 200 });
}
