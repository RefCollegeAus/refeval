import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient, getCallerSession, resolveCallerRole } from "@/lib/supabase/adminAuth";

export async function PATCH(request: NextRequest) {
  let body: {
    organisationId?: string;
    name?: string;
    timezone?: string;
    brandColour?: string;
    logoUrl?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { organisationId, name, timezone, brandColour, logoUrl } = body;
  if (!organisationId) {
    return NextResponse.json({ error: "organisationId is required." }, { status: 400 });
  }

  const caller = await getCallerSession();
  if (!caller) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  const callerRole = await resolveCallerRole(caller.supabase, caller.user.id, organisationId);
  if (callerRole !== "admin" && callerRole !== "super_admin") {
    return NextResponse.json(
      { error: "Forbidden: only admins can update organisation settings." },
      { status: 403 }
    );
  }

  let admin;
  try {
    admin = getServiceRoleClient();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server configuration error.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const patch: Record<string, unknown> = {};
  if (name !== undefined) patch.name = name;
  if (timezone !== undefined) patch.timezone = timezone;
  if (brandColour !== undefined) patch.brand_colour = brandColour;
  if (logoUrl !== undefined) patch.logo_url = logoUrl;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No fields to update." }, { status: 400 });
  }

  const { error } = await admin
    .from("organisations")
    .update(patch)
    .eq("id", organisationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
