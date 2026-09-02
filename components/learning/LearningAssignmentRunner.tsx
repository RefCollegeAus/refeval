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
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

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
    <div>

      {/* Header panel */}
      <Card
        className={cn(
          "mb-4 border-l-4",
          isCompleted ? "border-l-good/50" : isOverdue ? "border-l-danger/50" : "border-l-accent",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-accent">My Learning</p>
            <h1 className="mb-1.5 text-xl">{assignment.title}</h1>

            {assignment.instructions && (
              <p className="mb-2.5 whitespace-pre-wrap text-[13px] text-muted">
                {assignment.instructions}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3.5 text-xs text-muted">
              {assignedByName && <span>Assigned by {assignedByName}</span>}
              {assignment.dueDate && (
                <span className={cn("flex items-center gap-1", isOverdue ? "text-red-300" : "text-muted")}>
                  {isOverdue && <AlertCircle size={12} />}
                  Due {new Date(assignment.dueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                  {isOverdue && " — Overdue"}
                </span>
              )}
              <span className="font-bold" style={{ color: STATUS_COLORS[assignmentUser.status] }}>
                {assignmentUser.status}
              </span>
            </div>

            {/* Playlist progress bar */}
            {!isCompleted && hasPlaylist && totalClips > 0 && (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-muted">
                  <span>{watchedCount} of {totalClips} clips watched</span>
                  {/* allWatched uses #30d158 (iOS-style green) — distinct from the --good
                      token (#22c55e), so it's left as a literal rather than forced onto
                      a token that would shift the hue. */}
                  <span className="font-bold" style={{ color: allWatched ? "#30d158" : "var(--accent)" }}>{progressPct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-panel-3">
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{ width: `${progressPct}%`, background: allWatched ? "#30d158" : "var(--accent)" }}
                  />
                </div>
                {!allWatched && (
                  <p className="mt-1.5 text-xs text-muted">
                    Watch all {totalClips} clips to unlock the Complete button.
                  </p>
                )}
              </div>
            )}

            {/* Activity prompts — shown once clips are all watched (or no playlist) */}
            {!isCompleted && allWatched && (hasReflection || hasQuiz) && (
              <div className="mt-2.5 flex flex-col gap-2">
                {hasReflection && (
                  reflectionDone ? (
                    <div className="flex items-center gap-1.5 text-xs text-good">
                      <CheckCircle2 size={13} /> Reflection submitted.
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1.5 self-start"
                      onClick={() => setReflectionOpen(true)}
                    >
                      <MessageSquare size={13} />
                      {assignmentUser.reflectionResponses ? "Continue Reflection" : "Answer Reflection Questions"}
                    </Button>
                  )
                )}
                {hasQuiz && (!hasReflection || reflectionDone) && (
                  quizDone ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-good">
                        <CheckCircle2 size={13} />
                        Quiz submitted{assignmentUser.quizScore !== null && assignmentUser.quizTotal
                          ? ` — ${assignmentUser.quizScore}/${assignmentUser.quizTotal}`
                          : ""}.
                      </div>
                      <Button variant="secondary" size="sm" className="gap-1.5" onClick={() => setQuizOpen(true)}>
                        <HelpCircle size={12} />
                        Review Results
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-1.5 self-start"
                      onClick={() => setQuizOpen(true)}
                    >
                      <HelpCircle size={13} />
                      {assignmentUser.quizAnswers ? "Continue Quiz" : "Take Knowledge Quiz"}
                    </Button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Complete / Completed state */}
          {isCompleted ? (
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="flex items-center gap-1 text-[15px] font-bold" style={{ color: STATUS_COLORS.Completed }}>
                <CheckCircle2 size={15} /> Completed
              </span>
              {assignmentUser.completedAt && (
                <span className="text-[11px] text-muted">
                  {new Date(assignmentUser.completedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              )}
              {hasQuiz && (
                <Button variant="secondary" size="sm" className="mt-0.5 gap-1.5" onClick={() => setQuizOpen(true)}>
                  <HelpCircle size={12} /> Review Quiz Results
                </Button>
              )}
            </div>
          ) : confirmComplete ? (
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="text-[13px] font-semibold">Mark this assignment as complete?</span>
              <div className="flex gap-1.5">
                <Button variant="secondary" size="sm" onClick={() => setConfirmComplete(false)}>Cancel</Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={completing}
                  onClick={async () => {
                    setCompleting(true);
                    try { await onMarkComplete(); } finally { setCompleting(false); setConfirmComplete(false); }
                  }}
                >
                  {completing ? "Saving…" : "Yes, Mark Complete"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Button
                variant="primary"
                className="gap-1.5 whitespace-nowrap"
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
                <CheckCircle2 size={14} className="shrink-0" /> Complete Assignment
              </Button>
              {!allWatched && (
                <span className="text-[11px] text-muted">
                  {totalClips - watchedCount} clip{totalClips - watchedCount !== 1 ? "s" : ""} remaining
                </span>
              )}
              {allWatched && hasReflection && !reflectionDone && (
                <span className="text-[11px] text-muted">Submit reflection to complete</span>
              )}
              {allWatched && (!hasReflection || reflectionDone) && hasQuiz && !quizDone && (
                <span className="text-[11px] text-muted">Complete quiz to finish</span>
              )}
            </div>
          )}
        </div>

        <div className="mt-3 border-t border-border pt-2.5">
          <Button variant="secondary" size="sm" className="gap-1" onClick={onBack}>
            <ChevronLeft size={14} /> Back to My Learning
          </Button>
        </div>
      </Card>

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
