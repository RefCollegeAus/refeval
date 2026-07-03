"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  ReviewGoalLink, ClipGoalLink,
  CreateReviewGoalLinkInput, CreateClipGoalLinkInput,
} from "@/lib/types/reviewGoalLinks";

const RGL_KEY = (orgId: string) => `refcoach_review_goal_links_${orgId}`;
const CGL_KEY = (orgId: string) => `refcoach_clip_goal_links_${orgId}`;

function loadJSON<T>(key: string): T[] {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T[]) : []; }
  catch { return []; }
}
function saveJSON<T>(key: string, data: T[]) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}
function newId() { return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }

export function useReviewGoalLinks(
  orgId: string | undefined,
  currentUserId: string | undefined,
) {
  const [reviewGoalLinks, setReviewGoalLinks] = useState<ReviewGoalLink[]>([]);
  const [clipGoalLinks, setClipGoalLinks]     = useState<ClipGoalLink[]>([]);

  useEffect(() => {
    if (!orgId) return;
    setReviewGoalLinks(loadJSON<ReviewGoalLink>(RGL_KEY(orgId)));
    setClipGoalLinks(loadJSON<ClipGoalLink>(CGL_KEY(orgId)));
  }, [orgId]);

  // ── Review ↔ Goal links ────────────────────────────────────────────────────

  const persistRGL = useCallback((next: ReviewGoalLink[]) => {
    setReviewGoalLinks(next);
    if (orgId) saveJSON(RGL_KEY(orgId), next);
  }, [orgId]);

  const createReviewGoalLink = useCallback((input: CreateReviewGoalLinkInput): ReviewGoalLink => {
    const link: ReviewGoalLink = {
      id: `rgl_${newId()}`,
      organisationId: orgId ?? "",
      reviewId: input.reviewId,
      goalDefId: input.goalDefId,
      refereeId: input.refereeId,
      linkedAt: new Date().toISOString(),
      linkedBy: currentUserId ?? "",
      createdGoalFromReview: input.createdGoalFromReview ?? false,
    };
    persistRGL([...reviewGoalLinks, link]);
    return link;
  }, [reviewGoalLinks, persistRGL, orgId, currentUserId]);

  const removeReviewGoalLink = useCallback((id: string) => {
    persistRGL(reviewGoalLinks.filter(l => l.id !== id));
  }, [reviewGoalLinks, persistRGL]);

  const isReviewLinkedToGoal = useCallback(
    (reviewId: string, goalDefId: string, refereeId: string) =>
      reviewGoalLinks.some(l => l.reviewId === reviewId && l.goalDefId === goalDefId && l.refereeId === refereeId),
    [reviewGoalLinks],
  );

  const reviewGoalLinkFor = useCallback(
    (reviewId: string, goalDefId: string, refereeId: string) =>
      reviewGoalLinks.find(l => l.reviewId === reviewId && l.goalDefId === goalDefId && l.refereeId === refereeId),
    [reviewGoalLinks],
  );

  const linksForGoal = useCallback(
    (goalDefId: string, refereeId: string) =>
      reviewGoalLinks.filter(l => l.goalDefId === goalDefId && l.refereeId === refereeId),
    [reviewGoalLinks],
  );

  // ── Clip ↔ Goal links ─────────────────────────────────────────────────────

  const persistCGL = useCallback((next: ClipGoalLink[]) => {
    setClipGoalLinks(next);
    if (orgId) saveJSON(CGL_KEY(orgId), next);
  }, [orgId]);

  const setClipGoalLink = useCallback((input: CreateClipGoalLinkInput) => {
    const existing = clipGoalLinks.find(l => l.clipId === input.clipId);
    if (existing) {
      persistCGL(clipGoalLinks.map(l => l.clipId === input.clipId ? { ...l, goalDefId: input.goalDefId, refereeId: input.refereeId } : l));
    } else {
      const link: ClipGoalLink = {
        id: `cgl_${newId()}`,
        organisationId: orgId ?? "",
        ...input,
      };
      persistCGL([...clipGoalLinks, link]);
    }
  }, [clipGoalLinks, persistCGL, orgId]);

  const clearClipGoalLink = useCallback((clipId: string) => {
    persistCGL(clipGoalLinks.filter(l => l.clipId !== clipId));
  }, [clipGoalLinks, persistCGL]);

  const clipGoalLinkForClip = useCallback(
    (clipId: string) => clipGoalLinks.find(l => l.clipId === clipId),
    [clipGoalLinks],
  );

  return {
    reviewGoalLinks, clipGoalLinks,
    createReviewGoalLink, removeReviewGoalLink,
    isReviewLinkedToGoal, reviewGoalLinkFor, linksForGoal,
    setClipGoalLink, clearClipGoalLink, clipGoalLinkForClip,
  };
}
