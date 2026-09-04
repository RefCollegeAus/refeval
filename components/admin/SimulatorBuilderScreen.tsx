"use client";

import { useState, useEffect, useId } from "react";
import { Zap, ChevronLeft, Plus, Trash2, Save, Play, BookOpen, CheckCircle2, BarChart2 } from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";
import type { SimulatorSessionWithEvents, SimulatorAttempt } from "@/lib/types/simulator";
import type { CodedTag, ReviewRecord } from "@/lib/types/reviews";
import type { MemberRecord } from "@/lib/types/members";
import type { SessionFormData } from "@/lib/hooks/useSimulatorSessions";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { PageFrame } from "@/components/shell/PageFrame";
import { Badge, Button, Card, EmptyState, FormField, Input, Spinner, Textarea } from "@/components/ui";

// ── Helpers ───────────────────────────────────────────────────────────────────

function clipCountForSession(session: SimulatorSessionWithEvents, tags: CodedTag[]): number {
  if (!session.reviewId) return session.events.length;
  return tags.filter(t => t.reviewId === session.reviewId).length;
}

function reviewForSession(session: SimulatorSessionWithEvents, reviews: ReviewRecord[]): ReviewRecord | undefined {
  if (!session.reviewId) return undefined;
  return reviews.find(r => r.id === session.reviewId);
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  session: RefEvalSession;
  sessions: SimulatorSessionWithEvents[];
  attempts: SimulatorAttempt[];
  members: MemberRecord[];
  loading: boolean;
  reviews: ReviewRecord[];
  tags: CodedTag[];
  onCreate: (data: SessionFormData) => Promise<string>;
  onUpdate: (id: string, data: SessionFormData) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPublish: (reviewId: string) => Promise<void>;
  onBack: () => void;
  onRunSession: (sessionId: string) => void;
  onOpenReview: (reviewId: string) => void;
  onAssignSession?: (sessionId: string) => void;
  onAnalytics?: (sessionId: string) => void;
}

type View = "list" | "edit";

// ── Main component ────────────────────────────────────────────────────────────

export function SimulatorBuilderScreen({
  session, sessions, attempts, members, loading, reviews, tags,
  onCreate, onUpdate, onDelete, onPublish,
  onBack, onRunSession, onOpenReview, onAssignSession, onAnalytics,
}: Props) {
  const uid = useId();
  const [view, setView] = useState<View>("list");
  const [editId, setEditId] = useState<string | null>(null);
  const [editReviewId, setEditReviewId] = useState<string | null>(null);
  const [pendingOpenId, setPendingOpenId] = useState<string | null>(null);

  // Auto-open edit view after create once sessions list refreshes
  useEffect(() => {
    if (!pendingOpenId) return;
    const s = sessions.find(sess => sess.id === pendingOpenId);
    if (s) { setPendingOpenId(null); openEdit(s); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, pendingOpenId]);

  const [fTitle, setFTitle] = useState("");
  const [fDescription, setFDescription] = useState("");
  const [fVideoUrl, setFVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmPublishId, setConfirmPublishId] = useState<string | null>(null);
  const [confirmDeleteSim, setConfirmDeleteSim] = useState<{ id: string; title: string } | null>(null);
  const [deletingSim, setDeletingSim] = useState(false);
  const [formError, setFormError] = useState("");

  function openNew() {
    setEditId(null);
    setEditReviewId(null);
    setFTitle(""); setFDescription(""); setFVideoUrl("");
    setFormError("");
    setView("edit");
  }

  function openEdit(s: SimulatorSessionWithEvents) {
    setEditId(s.id);
    setEditReviewId(s.reviewId ?? null);
    setFTitle(s.title);
    setFDescription(s.description);
    setFVideoUrl(s.videoUrl);
    setFormError("");
    setView("edit");
  }

  async function handleSave() {
    if (!fTitle.trim()) { setFormError("Title is required."); return; }
    if (!fVideoUrl.trim()) { setFormError("Video URL is required."); return; }
    setSaving(true);
    setFormError("");
    try {
      const formData: SessionFormData = {
        title: fTitle.trim(),
        description: fDescription.trim(),
        videoUrl: fVideoUrl.trim(),
      };
      if (editId) {
        await onUpdate(editId, formData);
        setView("list");
      } else {
        const newId = await onCreate(formData);
        setPendingOpenId(newId);
        setView("list"); // briefly shows list; useEffect auto-opens edit once sessions refresh
      }
    } catch {
      setFormError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handlePublish() {
    if (!editReviewId) return;
    setConfirmPublishId(editReviewId);
  }

  async function confirmPublish(reviewId: string) {
    setPublishing(true);
    try {
      await onPublish(reviewId);
      setConfirmPublishId(null);
      setView("list");
    } finally {
      setPublishing(false);
    }
  }

  function handleDelete(id: string, title: string) {
    setConfirmDeleteSim({ id, title });
  }

  async function confirmDelete(id: string) {
    setDeletingSim(true);
    await onDelete(id);
    setDeletingSim(false);
    setConfirmDeleteSim(null);
  }

  // ── Shared confirm modals ────────────────────────────────────────────────────

  const confirmModals = (
    <>
      {confirmPublishId && (
        <ConfirmModal
          title="Publish simulator?"
          message="Once published, referees will be able to run this simulation. You can still update its details but decisions cannot be changed."
          confirmLabel="Publish"
          busyLabel="Publishing…"
          busy={publishing}
          onCancel={() => setConfirmPublishId(null)}
          onConfirm={() => confirmPublish(confirmPublishId)}
        />
      )}
      {confirmDeleteSim && (
        <ConfirmModal
          title={`Delete "${confirmDeleteSim.title}"?`}
          message="This will permanently delete the simulator session and all attempt records. This cannot be undone."
          confirmLabel="Delete"
          busyLabel="Deleting…"
          busy={deletingSim}
          onCancel={() => setConfirmDeleteSim(null)}
          onConfirm={() => confirmDelete(confirmDeleteSim.id)}
        />
      )}
    </>
  );

  // ── List view ───────────────────────────────────────────────────────────────

  if (view === "list") {
    return (
      <PageFrame
        className="!p-0"
        eyebrow="Learning Hub"
        title="Simulator Builder"
        description="Create decision-making simulations from video"
        actions={
          <>
            {onAnalytics && attempts.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5"
                title="View simulator analytics"
                onClick={() => {
                  const firstPublished = sessions.find(s => reviewForSession(s, reviews)?.status === "Completed");
                  if (firstPublished) onAnalytics(firstPublished.id);
                }}
              >
                <BarChart2 size={14} /> Analytics
              </Button>
            )}
            <Button size="sm" className="gap-1.5" onClick={openNew}>
              <Plus size={14} /> New Simulator
            </Button>
            <Button variant="ghost" size="sm" className="gap-1" onClick={onBack}>
              <ChevronLeft size={15} /> Back
            </Button>
          </>
        }
      >
        {loading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-panel p-8 text-sm text-muted">
            <Spinner /> Loading simulators…
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <EmptyState
            icon={<Zap size={36} />}
            title="No simulators yet"
            description="Create your first simulation from a game video."
            action={
              <Button size="sm" className="gap-1.5" onClick={openNew}>
                <Plus size={14} /> Create Simulator
              </Button>
            }
          />
        )}

        {!loading && sessions.length > 0 && (() => {
          const publishedSessions = sessions.filter(s => reviewForSession(s, reviews)?.status === "Completed");
          const draftSessions = sessions.filter(s => reviewForSession(s, reviews)?.status !== "Completed");

          function SimRow({ s }: { s: SimulatorSessionWithEvents }) {
            const clipCount = clipCountForSession(s, tags);
            const isPublished = reviewForSession(s, reviews)?.status === "Completed";
            const dateStr = s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "";

            // Attempt stats for this session
            const sessionAttempts = attempts.filter(a => a.sessionId === s.id);
            const attemptCount = sessionAttempts.length;
            const uniqueRefs = new Set(sessionAttempts.map(a => a.userId)).size;
            const scoredAttempts = sessionAttempts.filter(a => a.score !== null && a.total && a.total > 0);
            const avgPct = scoredAttempts.length > 0
              ? Math.round(scoredAttempts.reduce((sum, a) => sum + (a.score! / a.total!) * 100, 0) / scoredAttempts.length)
              : null;
            const bestPct = scoredAttempts.length > 0
              ? Math.round(Math.max(...scoredAttempts.map(a => (a.score! / a.total!) * 100)))
              : null;
            const latestAttempt = sessionAttempts[0]; // already sorted desc by completed_at
            const latestRef = latestAttempt ? members.find(m => m.id === latestAttempt.userId) : null;
            const fmtDate = (iso: string | null | undefined) => iso
              ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
              : null;

            return (
              <div className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-text">{s.title}</span>
                      <Badge tone={isPublished ? "good" : "warn"}>{isPublished ? "Published" : "Draft"}</Badge>
                      <span className="text-xs text-muted">{clipCount} decision{clipCount !== 1 ? "s" : ""}</span>
                      {dateStr && <span className="text-xs text-muted">· Created {dateStr}</span>}
                    </div>
                    {s.description && (
                      <p className="mb-1.5 truncate text-xs text-muted">{s.description}</p>
                    )}
                    {/* Attempt stats — published sessions only */}
                    {isPublished && attemptCount > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted">
                        <span><strong className="text-text">{uniqueRefs}</strong> referee{uniqueRefs !== 1 ? "s" : ""}</span>
                        <span><strong className="text-text">{attemptCount}</strong> attempt{attemptCount !== 1 ? "s" : ""}</span>
                        {avgPct !== null && <span>Avg <strong className="text-accent">{avgPct}%</strong></span>}
                        {bestPct !== null && <span>Best <strong className="text-good">{bestPct}%</strong></span>}
                        {latestAttempt?.completedAt && (
                          <span>Latest {fmtDate(latestAttempt.completedAt)}{latestRef ? ` · ${latestRef.name || latestRef.email}` : ""}</span>
                        )}
                      </div>
                    )}
                    {isPublished && attemptCount === 0 && (
                      <p className="mt-1 text-xs text-muted">No attempts yet</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {isPublished && onAnalytics && attemptCount > 0 && (
                      <Button variant="secondary" size="sm" className="gap-1" title="View analytics for this simulator" onClick={() => onAnalytics(s.id)}>
                        <BarChart2 size={12} /> Analytics
                      </Button>
                    )}
                    {isPublished && onAssignSession && (
                      <Button variant="secondary" size="sm" title="Assign this simulator to referees" onClick={() => onAssignSession(s.id)}>
                        Assign
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" className="gap-1" title="Preview this simulator" onClick={() => onRunSession(s.id)}>
                      <Play size={12} /> Preview
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => openEdit(s)}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" className="gap-1" onClick={() => handleDelete(s.id, s.title)}>
                      <Trash2 size={12} /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 gap-3">
              {publishedSessions.length > 0 && (
                <Card className="divide-y divide-border p-0">
                  <div className="border-b border-border bg-good/5 px-4 py-2.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-good">
                      Published — {publishedSessions.length}
                    </span>
                  </div>
                  {publishedSessions.map(s => <SimRow key={s.id} s={s} />)}
                </Card>
              )}
              {draftSessions.length > 0 && (
                <Card className="divide-y divide-border p-0">
                  <div className="border-b border-border px-4 py-2.5">
                    <span className="text-xs font-bold uppercase tracking-wide text-muted">
                      Drafts — {draftSessions.length}
                    </span>
                  </div>
                  {draftSessions.map(s => <SimRow key={s.id} s={s} />)}
                </Card>
              )}
            </div>
          );
        })()}
        {confirmModals}
      </PageFrame>
    );
  }

  // ── Edit / Create view ──────────────────────────────────────────────────────

  const editSession = editId ? sessions.find(s => s.id === editId) : undefined;
  const linkedReview = editReviewId ? reviews.find(r => r.id === editReviewId) : undefined;
  const clipCount = editSession ? clipCountForSession(editSession, tags) : 0;
  const isPublished = linkedReview?.status === "Completed";

  return (
    <PageFrame
      className="!p-0"
      eyebrow="Simulator Builder"
      title={editId ? "Edit Simulator" : "New Simulator"}
      actions={
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => setView("list")}>
          <ChevronLeft size={15} /> All Simulators
        </Button>
      }
    >
      {/* Session details */}
      <Card className="grid grid-cols-1 gap-3">
        <h2 className="text-sm font-semibold text-text">Simulator Details</h2>
        <FormField label="Title" htmlFor={`${uid}-title`} required>
          <Input
            id={`${uid}-title`}
            value={fTitle}
            onChange={e => setFTitle(e.target.value)}
            placeholder="e.g. NBL Round 5 — Foul Decisions"
            autoFocus
          />
        </FormField>
        <FormField label="Instructions" htmlFor={`${uid}-desc`} hint="Optional">
          <Textarea
            id={`${uid}-desc`}
            value={fDescription}
            onChange={e => setFDescription(e.target.value)}
            placeholder="Instructions shown to referees before starting…"
            rows={2}
          />
        </FormField>
        <FormField label="Video URL" htmlFor={`${uid}-url`} required>
          <Input
            id={`${uid}-url`}
            value={fVideoUrl}
            onChange={e => setFVideoUrl(e.target.value)}
            placeholder="YouTube or direct MP4/WebM URL"
          />
        </FormField>
      </Card>

      {/* Decision coding (only when editing a saved session with a linked review) */}
      {editId && editReviewId && (
        <Card className="grid grid-cols-1 gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-text">Coded Decisions</h2>
              <p className="mt-0.5 text-xs text-muted">
                Code decisions through the review wizard — each tagged clip becomes a decision point.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={clipCount > 0 ? "good" : "neutral"}>
                {clipCount} decision{clipCount !== 1 ? "s" : ""} coded
              </Badge>
              <Button size="sm" className="gap-1.5" onClick={() => onOpenReview(editReviewId)}>
                <BookOpen size={14} /> Code Decisions
              </Button>
            </div>
          </div>

          {clipCount === 0 && (
            <div className="rounded-lg border border-warn/25 bg-warn/5 px-3.5 py-3 text-sm text-muted">
              No decisions coded yet. Click <strong>Code Decisions</strong> to open the review wizard and tag decision moments in the video.
            </div>
          )}
        </Card>
      )}

      {/* Save / Publish */}
      {formError && <p className="text-sm font-medium text-red-400">{formError}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={() => setView("list")}>Cancel</Button>
        <Button className="gap-1.5" onClick={handleSave} disabled={saving}>
          <Save size={14} /> {saving ? "Saving…" : editId ? "Save Changes" : "Create Simulator"}
        </Button>
        {editId && editReviewId && !isPublished && clipCount > 0 && (
          <Button variant="good" className="ml-auto gap-1.5" onClick={handlePublish} disabled={publishing}>
            <CheckCircle2 size={14} /> {publishing ? "Publishing…" : "Publish Simulator"}
          </Button>
        )}
        {editId && isPublished && (
          <span className="ml-auto flex items-center gap-1.5 text-sm text-good">
            <CheckCircle2 size={14} /> Published
          </span>
        )}
      </div>
      {confirmModals}
    </PageFrame>
  );
}
