"use client";

import { useState, useEffect, useId } from "react";
import { Zap, ChevronLeft, Plus, Trash2, Save, Play, BookOpen, CheckCircle2 } from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";
import type { SimulatorSessionWithEvents } from "@/lib/types/simulator";
import type { CodedTag, ReviewRecord } from "@/lib/types/reviews";
import type { SessionFormData } from "@/lib/hooks/useSimulatorSessions";

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
}

type View = "list" | "edit";

// ── Main component ────────────────────────────────────────────────────────────

export function SimulatorBuilderScreen({
  session, sessions, loading, reviews, tags,
  onCreate, onUpdate, onDelete, onPublish,
  onBack, onRunSession, onOpenReview, onAssignSession,
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

  async function handlePublish() {
    if (!editReviewId) return;
    if (!confirm("Publish this simulator? Referees will be able to run it.")) return;
    setPublishing(true);
    try {
      await onPublish(editReviewId);
      setView("list");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    await onDelete(id);
  }

  // ── List view ───────────────────────────────────────────────────────────────

  if (view === "list") {
    return (
      <div style={{ padding: "20px 20px 60px", boxSizing: "border-box" }}>
        <div className="panel" style={{ marginBottom: 16 }}>
          <div className="table-head">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Zap size={20} style={{ color: "#fbbf24", flexShrink: 0 }} />
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>Learning Hub</p>
                <h1 style={{ margin: 0, fontSize: 22 }}>Simulator Builder</h1>
                <p className="hint" style={{ margin: "2px 0 0" }}>Create decision-making simulations from video</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="primary" onClick={openNew} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Plus size={14} /> New Simulator
              </button>
              <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <ChevronLeft size={15} /> Back
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="panel" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
            Loading simulators…
          </div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="panel" style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
            <Zap size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ margin: 0, fontWeight: 700 }}>No simulators yet</p>
            <p className="hint" style={{ margin: "6px 0 16px" }}>Create your first simulation from a game video.</p>
            <button className="primary" onClick={openNew} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Plus size={14} /> Create Simulator
            </button>
          </div>
        )}

        {!loading && sessions.length > 0 && (() => {
          const publishedSessions = sessions.filter(s => reviewForSession(s, reviews)?.status === "Completed");
          const draftSessions = sessions.filter(s => reviewForSession(s, reviews)?.status !== "Completed");

          function SimRow({ s, isLast }: { s: SimulatorSessionWithEvents; isLast: boolean }) {
            const clipCount = clipCountForSession(s, tags);
            const isPublished = reviewForSession(s, reviews)?.status === "Completed";
            const dateStr = s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "";
            return (
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 16px",
                  borderBottom: !isLast ? "1px solid var(--border)" : "none",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{s.title}</span>
                    {isPublished
                      ? <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, color: "#22c55e", background: "rgba(34,197,94,.12)", border: "1px solid rgba(34,197,94,.35)" }}>Published</span>
                      : <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, color: "#f59e0b", background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.35)" }}>Draft</span>
                    }
                    <span className="hint" style={{ fontSize: 12 }}>{clipCount} decision{clipCount !== 1 ? "s" : ""}</span>
                    {dateStr && <span className="hint" style={{ fontSize: 12 }}>· Created {dateStr}</span>}
                  </div>
                  {s.description && (
                    <p className="hint" style={{ margin: 0, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.description}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {isPublished && onAssignSession && (
                    <button onClick={() => onAssignSession(s.id)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "5px 11px" }} title="Assign this simulator to referees">
                      Assign
                    </button>
                  )}
                  <button onClick={() => onRunSession(s.id)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "5px 11px" }} title="Preview this simulator">
                    <Play size={12} /> Preview
                  </button>
                  <button onClick={() => openEdit(s)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "5px 11px" }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(s.id, s.title)} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "5px 11px", color: "#fca5a5", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 7 }}>
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            );
          }

          return (
            <>
              {publishedSessions.length > 0 && (
                <div className="panel" style={{ padding: 0, overflow: "hidden", marginBottom: 12 }}>
                  <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "rgba(34,197,94,.04)" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", textTransform: "uppercase", letterSpacing: ".07em" }}>
                      Published — {publishedSessions.length}
                    </span>
                  </div>
                  {publishedSessions.map((s, idx) => (
                    <SimRow key={s.id} s={s} isLast={idx === publishedSessions.length - 1} />
                  ))}
                </div>
              )}
              {draftSessions.length > 0 && (
                <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".07em" }}>
                      Drafts — {draftSessions.length}
                    </span>
                  </div>
                  {draftSessions.map((s, idx) => (
                    <SimRow key={s.id} s={s} isLast={idx === draftSessions.length - 1} />
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </div>
    );
  }

  // ── Edit / Create view ──────────────────────────────────────────────────────

  const editSession = editId ? sessions.find(s => s.id === editId) : undefined;
  const linkedReview = editReviewId ? reviews.find(r => r.id === editReviewId) : undefined;
  const clipCount = editSession ? clipCountForSession(editSession, tags) : 0;
  const isPublished = linkedReview?.status === "Completed";

  return (
    <div style={{ padding: "20px 20px 80px", boxSizing: "border-box" }}>
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="table-head">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Zap size={20} style={{ color: "#fbbf24", flexShrink: 0 }} />
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Simulator Builder</p>
              <h1 style={{ margin: 0, fontSize: 22 }}>{editId ? "Edit Simulator" : "New Simulator"}</h1>
            </div>
          </div>
          <button onClick={() => setView("list")} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <ChevronLeft size={15} /> All Simulators
          </button>
        </div>
      </div>

      {/* Session details */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>Simulator Details</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label htmlFor={`${uid}-title`}>
            Title *
            <input
              id={`${uid}-title`}
              value={fTitle}
              onChange={e => setFTitle(e.target.value)}
              placeholder="e.g. NBL Round 5 — Foul Decisions"
              autoFocus
            />
          </label>
          <label htmlFor={`${uid}-desc`}>
            Instructions <span className="hint">(optional)</span>
            <textarea
              id={`${uid}-desc`}
              value={fDescription}
              onChange={e => setFDescription(e.target.value)}
              placeholder="Instructions shown to referees before starting…"
              rows={2}
              style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
            />
          </label>
          <label htmlFor={`${uid}-url`}>
            Video URL *
            <input
              id={`${uid}-url`}
              value={fVideoUrl}
              onChange={e => setFVideoUrl(e.target.value)}
              placeholder="YouTube or direct MP4/WebM URL"
            />
          </label>
        </div>
      </div>

      {/* Decision coding (only when editing a saved session with a linked review) */}
      {editId && editReviewId && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div>
              <h2 style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700 }}>Coded Decisions</h2>
              <p className="hint" style={{ margin: 0, fontSize: 12 }}>
                Code decisions through the review wizard — each tagged clip becomes a decision point.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontSize: 13, fontWeight: 700,
                padding: "4px 12px", borderRadius: 999,
                background: clipCount > 0 ? "rgba(34,197,94,.12)" : "var(--panel2)",
                color: clipCount > 0 ? "#22c55e" : "var(--muted)",
                border: `1px solid ${clipCount > 0 ? "rgba(34,197,94,.35)" : "var(--border)"}`,
              }}>
                {clipCount} decision{clipCount !== 1 ? "s" : ""} coded
              </span>
              <button
                className="primary"
                onClick={() => onOpenReview(editReviewId)}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <BookOpen size={14} /> Code Decisions
              </button>
            </div>
          </div>

          {clipCount === 0 && (
            <div style={{ padding: "12px 14px", background: "rgba(251,191,36,.06)", border: "1px solid rgba(251,191,36,.2)", borderRadius: 8, fontSize: 13, color: "var(--muted)" }}>
              No decisions coded yet. Click <strong>Code Decisions</strong> to open the review wizard and tag decision moments in the video.
            </div>
          )}
        </div>
      )}

      {/* Save / Publish */}
      {formError && (
        <p className="danger-text" style={{ marginBottom: 10 }}>{formError}</p>
      )}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button onClick={() => setView("list")}>Cancel</button>
        <button className="primary" onClick={handleSave} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Save size={14} /> {saving ? "Saving…" : editId ? "Save Changes" : "Create Simulator"}
        </button>
        {editId && editReviewId && !isPublished && clipCount > 0 && (
          <button
            onClick={handlePublish}
            disabled={publishing}
            style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", color: "#22c55e", background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.35)", borderRadius: 8, padding: "7px 16px" }}
          >
            <CheckCircle2 size={14} /> {publishing ? "Publishing…" : "Publish Simulator"}
          </button>
        )}
        {editId && isPublished && (
          <span style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: "auto", fontSize: 13, color: "#22c55e" }}>
            <CheckCircle2 size={14} /> Published
          </span>
        )}
      </div>
    </div>
  );
}
