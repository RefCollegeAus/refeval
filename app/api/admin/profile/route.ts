import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient, getCallerSession } from "@/lib/supabase/adminAuth";

export async function PATCH(request: NextRequest) {
  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name } = body;
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  const caller = await getCallerSession();
  if (!caller) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  let admin;
  try {
    admin = getServiceRoleClient();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server configuration error.";
    return NextResponse.json({ error: message }, { status: 503 });
  }

  const { error } = await admin
    .from("profiles")
    .update({ name: name.trim() })
    .eq("id", caller.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
