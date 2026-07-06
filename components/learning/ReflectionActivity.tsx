"use client";

import { useState, useEffect } from "react";
import type { AssignmentUser, ReflectionQuestion, ReflectionResponse } from "@/lib/types/assignments";

interface Props {
  questions: ReflectionQuestion[];
  assignmentUser: AssignmentUser;
  open: boolean;
  onClose: () => void;
  onSaveDraft: (responses: ReflectionResponse[]) => Promise<void>;
  onSubmit: (responses: ReflectionResponse[]) => Promise<void>;
}

export function ReflectionActivity({ questions, assignmentUser, open, onClose, onSaveDraft, onSubmit }: Props) {
  const isSubmitted = !!assignmentUser.reflectionSubmittedAt;

  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const saved = assignmentUser.reflectionResponses;
    if (!saved) return {};
    return Object.fromEntries(saved.map(r => [r.questionId, r.response]));
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  // Sync draft when assignmentUser is refreshed (e.g. after load())
  useEffect(() => {
    const saved = assignmentUser.reflectionResponses;
    setDraft(saved ? Object.fromEntries(saved.map(r => [r.questionId, r.response])) : {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignmentUser.id]);

  if (!open) return null;

  const requiredAnswered = questions
    .filter(q => q.required)
    .every(q => (draft[q.id] ?? "").trim().length > 0);

  async function handleSaveDraft() {
    setSaving(true); setErr("");
    try {
      await onSaveDraft(questions.map(q => ({ questionId: q.id, response: draft[q.id] ?? "" })));
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    if (!requiredAnswered) { setErr("Please answer all required questions before submitting."); return; }
    setSaving(true); setErr("");
    try {
      await onSubmit(questions.map(q => ({ questionId: q.id, response: draft[q.id] ?? "" })));
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Failed to submit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 560, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-title" style={{ flexShrink: 0 }}>
          <div>
            <p className="eyebrow">Reflection</p>
            <h1 style={{ fontSize: 20, margin: 0 }}>Assignment Reflection</h1>
            {isSubmitted && (
              <p className="hint" style={{ margin: "2px 0 0" }}>
                Submitted {new Date(assignmentUser.reflectionSubmittedAt!).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            )}
          </div>
          <button onClick={() => { setErr(""); onClose(); }} aria-label="Close">✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 18, marginTop: 16 }}>
          {questions.map((q, i) => (
            <div key={q.id}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                {i + 1}. {q.text}
                {q.required && <span style={{ color: "#fca5a5", marginLeft: 4 }} title="Required">*</span>}
              </div>
              <textarea
                value={draft[q.id] ?? ""}
                onChange={e => setDraft(prev => ({ ...prev, [q.id]: e.target.value }))}
                rows={4}
                readOnly={isSubmitted}
                placeholder={isSubmitted ? "" : "Type your response here…"}
                style={{ width: "100%", boxSizing: "border-box", fontSize: 13, resize: "vertical", opacity: isSubmitted ? 0.7 : 1 }}
              />
            </div>
          ))}
        </div>

        {err && <p className="danger-text" style={{ margin: "10px 0 0" }}>{err}</p>}

        <div className="action-row" style={{ flexShrink: 0, marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <button onClick={() => { setErr(""); onClose(); }}>{isSubmitted ? "Close" : "Cancel"}</button>
          {!isSubmitted && (
            <>
              <button onClick={handleSaveDraft} disabled={saving} style={{ fontSize: 13 }}>
                {saving ? "Saving…" : "Save Draft"}
              </button>
              <button
                className="primary"
                onClick={handleSubmit}
                disabled={saving || !requiredAnswered}
                style={{ opacity: requiredAnswered ? 1 : 0.6 }}
                title={!requiredAnswered ? "Answer all required questions to submit" : undefined}
              >
                {saving ? "Submitting…" : "Submit Reflection"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
