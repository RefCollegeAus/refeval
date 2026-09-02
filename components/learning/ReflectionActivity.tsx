"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { AssignmentUser, ReflectionQuestion, ReflectionResponse } from "@/lib/types/assignments";
import { Button, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4">
      <div className="flex max-h-[90vh] w-full max-w-[560px] flex-col rounded-2xl border border-border bg-panel p-5 shadow-xl">
        <div className="mb-4 flex shrink-0 items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-accent">Reflection</p>
            <h1 className="m-0 text-xl">Assignment Reflection</h1>
            {isSubmitted && (
              <p className="mt-0.5 text-xs text-muted">
                Submitted {new Date(assignmentUser.reflectionSubmittedAt!).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setErr(""); onClose(); }}
            aria-label="Close"
            className="shrink-0 px-1.5"
          >
            <X size={16} />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          {questions.map((q, i) => (
            <div key={q.id}>
              <div className="mb-1.5 text-[13px] font-semibold">
                {i + 1}. {q.text}
                {q.required && <span className="ml-1 text-red-300" title="Required">*</span>}
              </div>
              <Textarea
                value={draft[q.id] ?? ""}
                onChange={e => setDraft(prev => ({ ...prev, [q.id]: e.target.value }))}
                rows={4}
                readOnly={isSubmitted}
                placeholder={isSubmitted ? "" : "Type your response here…"}
                className={cn("text-[13px]", isSubmitted && "opacity-70")}
              />
            </div>
          ))}
        </div>

        {err && (
          <p className="mt-2.5 rounded-xl border border-danger/45 bg-danger/[.14] p-2.5 text-[13px] text-red-200">{err}</p>
        )}

        <div className="mt-4 flex shrink-0 flex-wrap gap-2.5 border-t border-border pt-3">
          <Button variant="secondary" onClick={() => { setErr(""); onClose(); }}>
            {isSubmitted ? "Close" : "Cancel"}
          </Button>
          {!isSubmitted && (
            <>
              <Button variant="secondary" onClick={handleSaveDraft} disabled={saving}>
                {saving ? "Saving…" : "Save Draft"}
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={saving || !requiredAnswered}
                title={!requiredAnswered ? "Answer all required questions to submit" : undefined}
              >
                {saving ? "Submitting…" : "Submit Reflection"}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
