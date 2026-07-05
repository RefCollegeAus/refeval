import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient, getCallerSession } from "@/lib/supabase/adminAuth";
import { formatTime } from "@/lib/utils/time";

// GET /api/playlist/learning-clips?playlistId=...&assignmentUserId=...
//
// Returns reviews + clips for a playlist, bypassing RLS.
// Requires the caller to have an active learning_assignment_users row for this playlist.
// Never exposed to unauthenticated callers.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const playlistId       = searchParams.get("playlistId");
  const assignmentUserId = searchParams.get("assignmentUserId");

  if (!playlistId || !assignmentUserId) {
    return NextResponse.json({ error: "playlistId and assignmentUserId are required." }, { status: 400 });
  }

  // 1. Authenticate the caller
  const caller = await getCallerSession();
  if (!caller) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  const admin = getServiceRoleClient();

  // 2. Verify the caller owns the assignmentUserId row AND it links to this playlist
  const { data: auRow, error: auErr } = await admin
    .from("learning_assignment_users")
    .select("id, user_id, assignment_id")
    .eq("id", assignmentUserId)
    .eq("user_id", caller.user.id)
    .single();

  if (auErr || !auRow) {
    return NextResponse.json({ error: "Forbidden: no matching assignment." }, { status: 403 });
  }

  const { data: assignmentRow, error: assignmentErr } = await admin
    .from("learning_assignments")
    .select("playlist_id")
    .eq("id", auRow.assignment_id)
    .single();

  if (assignmentErr || !assignmentRow || assignmentRow.playlist_id !== playlistId) {
    return NextResponse.json({ error: "Forbidden: assignment does not match playlist." }, { status: 403 });
  }

  // 3. Load playlist items to get the review + clip IDs
  const { data: items, error: itemsErr } = await admin
    .from("clip_playlist_items")
    .select("review_id, tag_id")
    .eq("playlist_id", playlistId);

  if (itemsErr) {
    console.error("[learning-clips] items error:", itemsErr);
    return NextResponse.json({ error: "Failed to load playlist items." }, { status: 500 });
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ reviews: [], tags: [] });
  }

  const reviewIds = Array.from(new Set(items.map((i: any) => i.review_id as string)));
  const tagIds    = Array.from(new Set(items.map((i: any) => i.tag_id    as string)));

  // 4. Fetch reviews (service role → bypasses RLS)
  const { data: rawReviews, error: revErr } = await admin
    .from("reviews")
    .select("id, organisation_id, game, educator_name, referee1_id, referee2_id, referee3_id, referee1_name, referee2_name, referee3_name, video_link, timestamp_offset, game_date, created_at")
    .in("id", reviewIds);

  if (revErr) {
    console.error("[learning-clips] reviews error:", revErr);
    return NextResponse.json({ error: "Failed to load reviews." }, { status: 500 });
  }

  // 5. Fetch clips/tags (service role → bypasses RLS)
  const { data: rawClips, error: clipsErr } = await admin
    .from("clips")
    .select("id, review_id, organisation_id, time, seconds, timestamp_seconds, adjusted_seconds, adjusted_time, mode, referee_target, outcome, category, position, coverage, created_at")
    .in("id", tagIds);

  if (clipsErr) {
    console.error("[learning-clips] clips error:", clipsErr);
    return NextResponse.json({ error: "Failed to load clips." }, { status: 500 });
  }

  // 6. Map to ReviewRecord/CodedTag shapes (omit internal fields for learning mode)
  const reviews = (rawReviews || []).map((r: any) => ({
    id:              r.id,
    organisationId:  r.organisation_id || "",
    game:            r.game || "Untitled Review",
    educatorId:      "",        // hidden in learning mode
    educatorName:    "",        // hidden in learning mode — ClipPreview won't show it
    referee1Id:      r.referee1_id  || "",
    referee2Id:      r.referee2_id  || "",
    referee3Id:      r.referee3_id  || "",
    referee1Name:    r.referee1_name || "",
    referee2Name:    r.referee2_name || "",
    referee3Name:    r.referee3_name || "",
    videoLink:       r.video_link || "",
    timestampOffset: r.timestamp_offset || 0,
    status:          "Completed" as const,
    gameDate:        r.game_date || "",
    createdAt:       r.created_at || new Date().toISOString(),
  }));

  const tags = (rawClips || []).map((c: any) => ({
    id:                  c.id,
    reviewId:            c.review_id,
    organisationId:      c.organisation_id || "",
    time:                c.time || formatTime(c.timestamp_seconds || c.seconds || 0),
    seconds:             Number(c.seconds ?? c.timestamp_seconds ?? 0),
    adjustedSeconds:     Number(c.adjusted_seconds ?? c.timestamp_seconds ?? c.seconds ?? 0),
    adjustedTime:        c.adjusted_time || formatTime(c.timestamp_seconds || c.seconds || 0),
    mode:                c.mode || "video",
    refereeTarget:       c.referee_target || "All Referees",
    extraReviewOfficials:[],
    clipOfficials:       [],
    timestampLink:       "",
    outcome:             c.outcome || "",
    category:            c.category || "",
    position:            c.position || "",
    coverage:            c.coverage || "",
    notes:               "",    // hidden in learning mode
    createdAt:           c.created_at || new Date().toISOString(),
  }));

  return NextResponse.json({ reviews, tags });
}
