"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, CheckCircle2, AlertCircle, MessageSquare, HelpCircle } from "lucide-react";
import type { Assignment, AssignmentUser, ReflectionResponse, QuizAnswer } from "@/lib/types/assignments";
import { STATUS_COLORS } from "@/lib/types/assignments";
import type { ReviewRecord, CodedTag } from "@/lib/types/reviews";
import type { Playlist } from "@/lib/types/playlists";
import { splitCategory, slotName } from "@/components/common/ClipPreview";
import { PlaylistActivity } from "./PlaylistActivity";
import type { PlaylistClipRow } from "./PlaylistActivity";
import { ReflectionActivity } from "./ReflectionActivity";
import { QuizActivity } from "./QuizActivity";

interface Props {
  assignment: Assignment;
  assignmentUser: AssignmentUser;
  assignedByName: string | null;
  // null for standalone quiz assignments
  playlist: Playlist | null;
  reviews: ReviewRecord[];
  tags: CodedTag[];
  clipsLoading: boolean;
  clipsError: string;
  onToggleWatched: (itemId: string, nextIds: string[]) => Promise<void>;
  onSaveReflectionDraft: (responses: ReflectionResponse[]) => Promise<void>;
  onSubmitReflection: (responses: ReflectionResponse[]) => Promise<void>;
  onSaveQuizAnswers: (answers: QuizAnswer[]) => Promise<void>;
  onSubmitQuiz: (answers: QuizAnswer[], score: number, total: number) => Promise<void>;
  onMarkComplete: () => Promise<void>;
  onOpenReview: (reviewId: string) => void;
  onBack: () => void;
}

export function LearningAssignmentRunner({
  assignment,
  assignmentUser,
  assignedByName,
  playlist,
  reviews,
  tags,
  clipsLoading,
  clipsError,
  onToggleWatched,
  onSaveReflectionDraft,
  onSubmitReflection,
  onSaveQuizAnswers,
  onSubmitQuiz,
  onMarkComplete,
  onOpenReview,
  onBack,
}: Props) {
  const [watchedItemIds, setWatchedItemIds] = useState<Set<string>>(
    () => new Set(assignmentUser.watchedClipIds),
  );
  const [reflectionOpen,  setReflectionOpen]  = useState(false);
  const [quizOpen,         setQuizOpen]         = useState(
    () => assignment.quizQuestions.length > 0 && !!assignmentUser.quizSubmittedAt,
  );
  const [confirmComplete,  setConfirmComplete]  = useState(false);
  const [completing,       setCompleting]       = useState(false);

  // Sync watched IDs when assignmentUser is refreshed after load()
  useEffect(() => {
    setWatchedItemIds(new Set(assignmentUser.watchedClipIds));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentUser.id]);

  // Build clip rows from playlist items + reviews/tags
  const reviewMap = useMemo(() => {
    const m = new Map<string, ReviewRecord>();
    for (const r of reviews) m.set(r.id, r);
    return m;
  }, [reviews]);

  const tagMap = useMemo(() => {
    const m = new Map<string, CodedTag>();
    for (const t of tags) m.set(t.id, t);
    return m;
  }, [tags]);

  const clipRows = useMemo<PlaylistClipRow[]>(() => {
    if (!playlist) return [];
    const rows: PlaylistClipRow[] = [];
    for (const item of playlist.items) {
      const review = reviewMap.get(item.reviewId);
      const tag    = tagMap.get(item.tagId);
      if (!review || !tag) continue;
      const refName = tag.refereeTarget !== "All Referees"
        ? slotName(tag.refereeTarget, review)
        : [review.referee1Name, review.referee2Name, review.referee3Name].filter(Boolean).join(", ") || "All Officials";
      const [categoryGroup, subtype] = splitCategory(tag.category);
      rows.push({ tag, review, refereeName: refName, categoryGroup, subtype, itemId: item.id, creatorNote: item.creatorNote ?? null });
    }
    return rows;
  }, [playlist, reviewMap, tagMap]);

  // Activity detection
  const hasPlaylist   = !!assignment.playlistId;
  const hasReflection = assignment.questions.length > 0;
  const hasQuiz       = assignment.quizQuestions.length > 0;

  const isCompleted    = assignmentUser.status === "Completed";
  const totalClips     = clipRows.length;
  const watchedCount   = isCompleted ? totalClips : watchedItemIds.size;
  // Treat clips as "all watched" while still loading to avoid premature unlock
  const allWatched     = !hasPlaylist
    ? true
    : totalClips === 0
      ? !clipsLoading
      : watchedCount >= totalClips;
  const reflectionDone = !!assignmentUser.reflectionSubmittedAt;
  const quizDone       = !hasQuiz || !!assignmentUser.quizSubmittedAt;
  const canComplete    = allWatched && (!hasReflection || reflectionDone) && quizDone;

  const isOverdue   = !!assignment.dueDate && !isCompleted && new Date(assignment.dueDate).getTime() < Date.now();
  const progressPct = totalClips > 0 ? Math.round((watchedCount / totalClips) * 100) : 100;

  function handleToggleWatched(itemId: string) {
    setWatchedItemIds(prev => {
      const next = new Set(prev);
      next.has(itemId) ? next.delete(itemId) : next.add(itemId);
      const nextArr = Array.from(next);
      // Optimistic local update; fire-and-forget persistence
      onToggleWatched(itemId, nextArr).catch(err =>
        console.error("[LearningAssignmentRunner] toggleWatched error:", err),
      );
      return next;
    });
  }

  return (
    <div style={{ padding: "20px 20px 60px", boxSizing: "border-box" }}>

      {/* Header panel */}
      <div
        className="panel"
        style={{
          marginBottom: 16,
          padding: "16px 18px",
          borderLeft: isCompleted
            ? "4px solid rgba(34,197,94,.5)"
            : isOverdue
            ? "4px solid rgba(239,68,68,.5)"
            : "4px solid var(--accent)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="eyebrow" style={{ margin: "0 0 4px" }}>My Learning</p>
            <h1 style={{ margin: "0 0 6px", fontSize: 20 }}>{assignment.title}</h1>

            {assignment.instructions && (
              <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--muted)", whiteSpace: "pre-wrap" }}>
                {assignment.instructions}
              </p>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12, color: "var(--muted)", alignItems: "center" }}>
              {assignedByName && <span>Assigned by {assignedByName}</span>}
              {assignment.dueDate && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, color: isOverdue ? "#fca5a5" : "var(--muted)" }}>
                  {isOverdue && <AlertCircle size={12} />}
                  Due {new Date(assignment.dueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  {isOverdue && " — Overdue"}
                </span>
              )}
              <span style={{ fontWeight: 700, color: STATUS_COLORS[assignmentUser.status] }}>
                {assignmentUser.status}
              </span>
            </div>

            {/* Playlist progress bar */}
            {!isCompleted && hasPlaylist && totalClips > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
                  <span>{watchedCount} of {totalClips} clips watched</span>
                  <span style={{ fontWeight: 700, color: allWatched ? "#30d158" : "var(--accent)" }}>{progressPct}%</span>
                </div>
                <div style={{ height: 6, background: "var(--panel3)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progressPct}%`, background: allWatched ? "#30d158" : "var(--accent)", borderRadius: 999, transition: "width .3s" }} />
                </div>
                {!allWatched && (
                  <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted)" }}>
                    Watch all {totalClips} clips to unlock the Complete button.
                  </p>
                )}
              </div>
            )}

            {/* Activity prompts — shown once clips are all watched (or no playlist) */}
            {!isCompleted && allWatched && (hasReflection || hasQuiz) && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {hasReflection && (
                  reflectionDone ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#22c55e" }}>
                      <CheckCircle2 size={13} /> Reflection submitted.
                    </div>
                  ) : (
                    <button
                      style={{ fontSize: 13, padding: "7px 16px", display: "flex", alignItems: "center", gap: 6, alignSelf: "flex-start" }}
                      onClick={() => setReflectionOpen(true)}
                    >
                      <MessageSquare size={13} />
                      {assignmentUser.reflectionResponses ? "Continue Reflection" : "Answer Reflection Questions"}
                    </button>
                  )
                )}
                {hasQuiz && (!hasReflection || reflectionDone) && (
                  quizDone ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#22c55e" }}>
                        <CheckCircle2 size={13} />
                        Quiz submitted{assignmentUser.quizScore !== null && assignmentUser.quizTotal
                          ? ` — ${assignmentUser.quizScore}/${assignmentUser.quizTotal}`
                          : ""}.
                      </div>
                      <button
                        style={{ fontSize: 12, padding: "4px 12px", display: "flex", alignItems: "center", gap: 5 }}
                        onClick={() => setQuizOpen(true)}
                      >
                        <HelpCircle size={12} />
                        Review Results
                      </button>
                    </div>
                  ) : (
                    <button
                      style={{ fontSize: 13, padding: "7px 16px", display: "flex", alignItems: "center", gap: 6, alignSelf: "flex-start" }}
                      onClick={() => setQuizOpen(true)}
                    >
                      <HelpCircle size={13} />
                      {assignmentUser.quizAnswers ? "Continue Quiz" : "Take Knowledge Quiz"}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Complete / Completed state */}
          {isCompleted ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 15, color: STATUS_COLORS.Completed, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
                <CheckCircle2 size={15} /> Completed
              </span>
              {assignmentUser.completedAt && (
                <span style={{ fontSize: 11, color: "var(--muted)" }}>
                  {new Date(assignmentUser.completedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              )}
              {hasQuiz && (
                <button
                  style={{ fontSize: 12, padding: "5px 12px", display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}
                  onClick={() => setQuizOpen(true)}
                >
                  <HelpCircle size={12} /> Review Quiz Results
                </button>
              )}
            </div>
          ) : confirmComplete ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Mark this assignment as complete?</span>
              <div style={{ display: "flex", gap: 6 }}>
                <button style={{ fontSize: 13, padding: "6px 14px" }} onClick={() => setConfirmComplete(false)}>Cancel</button>
                <button
                  className="primary"
                  style={{ fontSize: 13, padding: "6px 14px" }}
                  disabled={completing}
                  onClick={async () => {
                    setCompleting(true);
                    try { await onMarkComplete(); } finally { setCompleting(false); setConfirmComplete(false); }
                  }}
                >
                  {completing ? "Saving…" : "Yes, Mark Complete"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
              <button
                className="primary"
                style={{ fontSize: 14, padding: "9px 20px", whiteSpace: "nowrap", opacity: canComplete ? 1 : 0.45, cursor: canComplete ? "pointer" : "not-allowed" }}
                disabled={!canComplete}
                onClick={() => canComplete && setConfirmComplete(true)}
                title={
                  !allWatched
                    ? `Watch all ${totalClips} clips first`
                    : hasReflection && !reflectionDone
                    ? "Submit your reflection first"
                    : hasQuiz && !quizDone
                    ? "Complete the knowledge quiz first"
                    : "Mark assignment as complete"
                }
              >
                <CheckCircle2 size={14} style={{ flexShrink: 0 }} /> Complete Assignment
              </button>
              {!allWatched && (
                <span style={{ fontSize: 11, color: "var(--muted)" }}>
                  {totalClips - watchedCount} clip{totalClips - watchedCount !== 1 ? "s" : ""} remaining
                </span>
              )}
              {allWatched && hasReflection && !reflectionDone && (
                <span style={{ fontSize: 11, color: "var(--muted)" }}>Submit reflection to complete</span>
              )}
              {allWatched && (!hasReflection || reflectionDone) && hasQuiz && !quizDone && (
                <span style={{ fontSize: 11, color: "var(--muted)" }}>Complete quiz to finish</span>
              )}
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13 }}>
            <ChevronLeft size={14} /> Back to My Learning
          </button>
        </div>
      </div>

      {/* Playlist activity */}
      {hasPlaylist && (
        <PlaylistActivity
          clipRows={clipRows}
          watchedItemIds={watchedItemIds}
          isCompleted={isCompleted}
          clipsLoading={clipsLoading}
          clipsError={clipsError}
          onToggleWatched={handleToggleWatched}
          onOpenReview={onOpenReview}
        />
      )}

      {/* Reflection modal */}
      {hasReflection && (
        <ReflectionActivity
          questions={assignment.questions}
          assignmentUser={assignmentUser}
          open={reflectionOpen}
          onClose={() => setReflectionOpen(false)}
          onSaveDraft={onSaveReflectionDraft}
          onSubmit={onSubmitReflection}
        />
      )}

      {/* Quiz modal */}
      {hasQuiz && (
        <QuizActivity
          questions={assignment.quizQuestions}
          assignmentUser={assignmentUser}
          allowRetakes={assignment.quizAllowRetakes}
          open={quizOpen}
          canComplete={canComplete}
          isCompleted={isCompleted}
          reviews={reviews}
          tags={tags}
          onClose={() => setQuizOpen(false)}
          onSaveAnswers={onSaveQuizAnswers}
          onSubmit={onSubmitQuiz}
          onComplete={onMarkComplete}
        />
      )}
    </div>
  );
}
