"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getReviewsWithClips } from "@/lib/services/reviews";
import { formatTime } from "@/lib/utils/time";
import type { RefEvalSession } from "@/lib/types/auth";
import type { MemberRecord } from "@/lib/types/members";
import type { ReviewRecord, CodedTag, Status, OfficialSummaries } from "@/lib/types/reviews";
import { showToast } from "@/lib/toast";

export function useReviews(session: RefEvalSession | null, members: MemberRecord[]) {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [tags, setTags] = useState<CodedTag[]>([]);
  const [activeReviewId, setActiveReviewId] = useState("");
  const [reviewGame, setReviewGame] = useState("");
  const [reviewGameDate, setReviewGameDate] = useState("");
  const [reviewRef1, setReviewRef1] = useState("");
  const [reviewRef2, setReviewRef2] = useState("");
  const [reviewRef3, setReviewRef3] = useState("");
  const [reviewVideoLink, setReviewVideoLink] = useState("");
  const [reviewOffset, setReviewOffset] = useState(-10);

  const activeReview = reviews.find(r => r.id === activeReviewId);

  const reloadReviews = useCallback(async () => {
    const supabaseReviews = await getReviewsWithClips();
    const mappedReviews: ReviewRecord[] = supabaseReviews.map((r: any) => ({
      id: r.id,
      organisationId: r.organisation_id || "",
      game: r.game || "Untitled Review",
      educatorId: r.educator_id || "",
      educatorName: r.educator_name || "",
      referee1Id: r.referee1_id || "",
      referee2Id: r.referee2_id || "",
      referee3Id: r.referee3_id || "",
      referee1Name: r.referee1_name || "",
      referee2Name: r.referee2_name || "",
      referee3Name: r.referee3_name || "",
      videoLink: r.video_link || r.video_url || "",
      timestampOffset: r.timestamp_offset || 0,
      status: r.status === "completed" ? "Completed" : "In Review",
      gameDate: r.game_date || "",
      createdAt: r.created_at || new Date().toISOString(),
      submittedAt: r.submitted_at || undefined,
      officialSummaries: r.official_summaries || undefined,
      isSimulator: r.is_simulator ?? false,
    }));
    const mappedTags: CodedTag[] = supabaseReviews.flatMap((r: any) =>
      (r.clips || []).map((c: any) => ({
        id: c.id,
        reviewId: r.id,
        organisationId: c.organisation_id || r.organisation_id || "",
        time: c.time || formatTime(c.timestamp_seconds || c.seconds || 0),
        seconds: Number(c.seconds ?? c.timestamp_seconds ?? 0),
        adjustedSeconds: Number(c.adjusted_seconds ?? c.timestamp_seconds ?? c.seconds ?? 0),
        adjustedTime: c.adjusted_time || formatTime(c.timestamp_seconds || c.seconds || 0),
        mode: c.mode || "video",
        refereeTarget: c.referee_target || "All Referees",
        extraReviewOfficials: c.extra_review_officials || [],
        clipOfficials: c.clip_officials || [],
        timestampLink: c.timestamp_link || "",
        outcome: c.outcome || "",
        category: c.category || "",
        position: c.position || "",
        coverage: c.coverage || "",
        notes: c.notes || "",
        isLearningClip: c.is_learning_clip ?? false,
        createdAt: c.created_at || new Date().toISOString(),
      }))
    );
    setReviews(mappedReviews);
    setTags(mappedTags);
  }, []);

  useEffect(() => { reloadReviews(); }, [reloadReviews]);

  function openForEdit(review: ReviewRecord, alreadyCreated = false) {
    if (!alreadyCreated) {
      setReviews(items => items.map(r => r.id === review.id ? { ...r, status: r.status || "In Review" } : r));
    }
    setActiveReviewId(review.id);
    setReviewGame(review.game);
    setReviewGameDate(review.gameDate || "");
    setReviewRef1(review.referee1Id);
    setReviewRef2(review.referee2Id);
    setReviewRef3(review.referee3Id);
    setReviewVideoLink(review.videoLink);
    setReviewOffset(-Math.abs(Math.trunc(Number(review.timestampOffset) || 0)));
  }

  async function startNewReview(): Promise<ReviewRecord | null> {
    if (!session) return null;
    const now = new Date().toISOString();
    const orgId = session.activeOrganisation?.id || "";

    const { data, error } = await getSupabaseClient()
      .from("reviews")
      .insert({
        game: "New Review",
        organisation_id: orgId,
        educator_id: session.user.id,
        educator_name: session.profile.name,
        referee1_name: "", referee2_name: "", referee3_name: "",
        video_link: "", timestamp_offset: -10, status: "in_review",
      })
      .select()
      .single();

    if (error) { console.error("Create review error:", error); showToast(error.message, "error"); return null; }

    const savedReview: ReviewRecord = {
      id: data.id,
      organisationId: data.organisation_id || orgId,
      game: "New Review",
      educatorId: session.user.id,
      educatorName: session.profile.name,
      referee1Id: "", referee2Id: "", referee3Id: "",
      referee1Name: "", referee2Name: "", referee3Name: "",
      videoLink: "", timestampOffset: -10,
      status: "In Review",
      createdAt: data.created_at || now,
    };

    setReviews(items => [savedReview, ...items]);
    return savedReview;
  }

  async function saveReviewMeta(status?: Status, officialSummaries?: OfficialSummaries) {
    if (!activeReviewId) return;
    // Name lookups resolve member IDs against the Supabase-loaded members list
    const r1 = members.find(m => m.id === reviewRef1);
    const r2 = members.find(m => m.id === reviewRef2);
    const r3 = members.find(m => m.id === reviewRef3);
    const nextStatus = status || activeReview?.status || "In Review";
    const submittedAt = nextStatus === "Completed" ? new Date().toISOString() : activeReview?.submittedAt;
    const patch = {
      game: reviewGame,
      game_date: reviewGameDate || null,
      referee1_id: reviewRef1 || null, referee2_id: reviewRef2 || null, referee3_id: reviewRef3 || null,
      referee1_name: r1?.name || "", referee2_name: r2?.name || "", referee3_name: r3?.name || "",
      video_link: reviewVideoLink,
      timestamp_offset: -Math.abs(Math.trunc(Number(reviewOffset) || 0)),
      status: nextStatus === "Completed" ? "completed" : "in_review",
      submitted_at: submittedAt || null,
      ...(officialSummaries !== undefined ? { official_summaries: officialSummaries } : {}),
    };
    const { error } = await getSupabaseClient().from("reviews").update(patch).eq("id", activeReviewId);
    if (error) { console.error("Save review meta error:", error); showToast(error.message, "error"); return; }
    setReviews(items => items.map(r => {
      if (r.id !== activeReviewId) return r;
      return {
        ...r, game: reviewGame, gameDate: reviewGameDate || "",
        referee1Id: reviewRef1, referee2Id: reviewRef2, referee3Id: reviewRef3,
        referee1Name: r1?.name || "", referee2Name: r2?.name || "", referee3Name: r3?.name || "",
        videoLink: reviewVideoLink,
        timestampOffset: -Math.abs(Math.trunc(Number(reviewOffset) || 0)),
        status: nextStatus, submittedAt,
        ...(officialSummaries !== undefined ? { officialSummaries } : {}),
      };
    }));
  }

  // confirm() removed — callers are responsible for showing a confirmation UI before calling this.
  async function deleteReview(id: string) {
    const { error: clipError } = await getSupabaseClient().from("clips").delete().eq("review_id", id);
    if (clipError) { console.error("Delete clips error:", clipError); showToast(clipError.message, "error"); return; }
    const { error: reviewError } = await getSupabaseClient().from("reviews").delete().eq("id", id);
    if (reviewError) { console.error("Delete review error:", reviewError); showToast(reviewError.message, "error"); return; }
    setReviews(items => items.filter(r => r.id !== id));
    setTags(items => items.filter(t => t.reviewId !== id));
  }

  async function upsertClip(tag: CodedTag) {
    const dbClip = {
      id: tag.id,
      review_id: tag.reviewId,
      organisation_id: tag.organisationId || null,
      time: tag.time,
      seconds: Math.round(tag.seconds),
      timestamp_seconds: Math.round(tag.seconds),
      adjusted_seconds: Math.round(tag.adjustedSeconds),
      adjusted_time: tag.adjustedTime,
      mode: tag.mode,
      referee_target: tag.refereeTarget,
      extra_review_officials: tag.extraReviewOfficials,
      clip_officials: tag.clipOfficials,
      timestamp_link: tag.timestampLink,
      outcome: tag.outcome,
      category: tag.category,
      position: tag.position,
      coverage: tag.coverage,
      notes: tag.notes,
      is_learning_clip: tag.isLearningClip ?? false,
      created_at: tag.createdAt,
    };
    const { error } = await getSupabaseClient().from("clips").upsert(dbClip);
    if (error) { console.error("Save clip error:", error); showToast(error.message, "error"); throw error; }
  }

  async function removeFromLearningLibrary(tagId: string) {
    const { error } = await getSupabaseClient()
      .from("clips")
      .update({ is_learning_clip: false })
      .eq("id", tagId);
    if (error) { console.error("Remove from learning library error:", error); showToast(error.message, "error"); throw error; }
    setTags(items => items.map(t => t.id === tagId ? { ...t, isLearningClip: false } : t));
  }

  async function deleteClip(id: string) {
    const { error } = await getSupabaseClient().from("clips").delete().eq("id", id);
    if (error) { console.error("Delete clip error:", error); showToast(error.message, "error"); throw error; }
    setTags(items => items.filter(t => t.id !== id));
  }

  async function clearReviewClips(reviewId: string) {
    const { error } = await getSupabaseClient().from("clips").delete().eq("review_id", reviewId);
    if (error) { console.error("Clear clips error:", error); showToast(error.message, "error"); throw error; }
    setTags(items => items.filter(t => t.reviewId !== reviewId));
  }

  function assignedReviewsForReferee(refereeId: string) {
    return reviews.filter(r =>
      r.status === "Completed" &&
      !r.isSimulator &&
      [r.referee1Id, r.referee2Id, r.referee3Id].includes(refereeId)
    );
  }

  return {
    reviews, tags, setTags, reloadReviews,
    activeReviewId, setActiveReviewId,
    activeReview,
    reviewGame, setReviewGame,
    reviewGameDate, setReviewGameDate,
    reviewRef1, setReviewRef1,
    reviewRef2, setReviewRef2,
    reviewRef3, setReviewRef3,
    reviewVideoLink, setReviewVideoLink,
    reviewOffset, setReviewOffset,
    openForEdit,
    startNewReview,
    saveReviewMeta,
    deleteReview,
    upsertClip,
    deleteClip,
    removeFromLearningLibrary,
    clearReviewClips,
    assignedReviewsForReferee,
  };
}
