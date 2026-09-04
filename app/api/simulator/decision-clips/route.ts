import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient, getCallerSession, resolveCallerRole } from "@/lib/supabase/adminAuth";
import { formatTime } from "@/lib/utils/time";

const MANAGEMENT_ROLES = ["educator", "admin", "super_admin"];
const SIMULATOR_ROLES = ["referee", ...MANAGEMENT_ROLES];

// GET /api/simulator/decision-clips?sessionId=...
//
// Returns the coded decision clips for a review-linked Referee Simulator
// session, bypassing RLS (handled server-side below).
//
// Entitlement model: mirrors the existing sim_sessions_select /
// sim_events_select RLS policies (020_referee_simulator.sql) — any
// authenticated member of the session's organisation with role
// referee/educator/admin/super_admin may run or preview a simulator; there
// is no separate per-referee assignment relationship for simulator sessions
// (they are org-wide training content, reachable either via an assignment
// card or by directly browsing the Learning Hub — see docs/SIMULATOR_V1.md).
// Non-management callers additionally require the linked review to be
// published (status = 'completed'), matching the existing client-side
// runnableSimulatorSessions filter in app/page.tsx — now also enforced
// here so a referee cannot fetch an unpublished draft's clips by guessing
// its session id. Management callers (who use this for the Builder's
// "Preview" action) are not subject to that gate.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  // 1. Authenticate the caller
  const caller = await getCallerSession();
  if (!caller) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  const admin = getServiceRoleClient();

  // 2. Load the session (service role — this is the one row this route is
  // allowed to look up before entitlement is established, purely to learn
  // which organisation it belongs to; no session content is returned yet).
  const { data: sessionRow, error: sessionErr } = await admin
    .from("simulator_sessions")
    .select("id, organisation_id, review_id")
    .eq("id", sessionId)
    .single();

  if (sessionErr || !sessionRow) {
    return NextResponse.json({ error: "Simulator session not found." }, { status: 404 });
  }

  // 3. Verify the caller is a member of that organisation with a role
  // permitted to use the simulator (mirrors sim_sessions_select exactly).
  const callerRole = await resolveCallerRole(caller.supabase, caller.user.id, sessionRow.organisation_id);
  if (!callerRole || !SIMULATOR_ROLES.includes(callerRole)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  const isManagement = MANAGEMENT_ROLES.includes(callerRole);

  // 4. This endpoint only serves the review-linked (clip-based) flow —
  // legacy sessions carry their decisions in simulator_events, which
  // referees can already read directly via existing RLS.
  if (!sessionRow.review_id) {
    return NextResponse.json({ error: "This simulator session has no linked review." }, { status: 404 });
  }

  // 5. Load the linked review and confirm it is genuinely a simulator
  // review in the same organisation — refuses to ever serve an ordinary
  // review's clips through this route, even if simulator_sessions.review_id
  // were ever pointed at one by mistake or tampering.
  const { data: reviewRow, error: reviewErr } = await admin
    .from("reviews")
    .select("id, organisation_id, is_simulator, status")
    .eq("id", sessionRow.review_id)
    .single();

  if (reviewErr || !reviewRow || !reviewRow.is_simulator || reviewRow.organisation_id !== sessionRow.organisation_id) {
    return NextResponse.json({ error: "Simulator session has no valid linked review." }, { status: 404 });
  }

  // 6. Non-management callers may only run published simulators — matches
  // the existing client-side filter, enforced here so it can't be bypassed
  // by calling this endpoint directly with a draft session's id.
  if (!isManagement && reviewRow.status !== "completed") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  // 7. Fetch only the clips for that review, ordered the same way the
  // client already orders them (by adjusted timestamp).
  const { data: rawClips, error: clipsErr } = await admin
    .from("clips")
    .select("id, review_id, adjusted_seconds, adjusted_time, seconds, timestamp_seconds, outcome, category, position, coverage, notes")
    .eq("review_id", reviewRow.id)
    .order("adjusted_seconds", { ascending: true });

  if (clipsErr) {
    console.error("[simulator/decision-clips] clips error:", clipsErr);
    return NextResponse.json({ error: "Failed to load decision clips." }, { status: 500 });
  }

  // 8. Map to the minimal CodedTag-shaped fields SimulatorRunnerScreen
  // actually uses (id, reviewId, timing, and the four decision fields it
  // checks answers against). Fields the runner never reads are omitted /
  // defaulted, same convention as /api/playlist/learning-clips.
  const clips = (rawClips || []).map((c: any) => ({
    id:               c.id,
    reviewId:         c.review_id,
    organisationId:   reviewRow.organisation_id || "",
    time:             c.time || formatTime(c.timestamp_seconds || c.seconds || 0),
    seconds:          Number(c.seconds ?? c.timestamp_seconds ?? 0),
    adjustedSeconds:  Number(c.adjusted_seconds ?? c.timestamp_seconds ?? c.seconds ?? 0),
    adjustedTime:     c.adjusted_time || formatTime(c.timestamp_seconds || c.seconds || 0),
    mode:             "video" as const,
    refereeTarget:    "All Referees" as const,
    extraReviewOfficials: [] as string[],
    clipOfficials:    [] as unknown[],
    outcome:          c.outcome || "",
    category:         c.category || "",
    position:         c.position || "",
    coverage:         c.coverage || "",
    notes:            c.notes || "",
    createdAt:        new Date().toISOString(),
  }));

  return NextResponse.json({ clips });
}
