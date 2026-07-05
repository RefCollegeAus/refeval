"use client";

import { useState, useMemo } from "react";
import type { QuizQuestion, QuizAnswer, AssignmentUser } from "@/lib/types/assignments";

interface Props {
  questions: QuizQuestion[];
  assignmentUser: AssignmentUser;
  onSaveAnswers: (answers: QuizAnswer[]) => Promise<void>;
  onSubmit: (answers: QuizAnswer[], score: number, total: number) => Promise<void>;
  onClose: () => void;
}

function pctColor(pct: number) {
  if (pct >= 80) return "#22c55e";
  if (pct >= 50) return "#3b82f6";
  return "#ef4444";
}

export default function QuizPlayer({ questions, assignmentUser, onSaveAnswers, onSubmit, onClose }: Props) {
  const sorted = useMemo(
    () => [...questions].sort((a, b) => a.displayOrder - b.displayOrder),
    [questions],
  );

  const [answers, setAnswers] = useState<QuizAnswer[]>(() => {
    if (Array.isArray(assignmentUser.quizAnswers) && assignmentUser.quizAnswers.length > 0) {
      return assignmentUser.quizAnswers;
    }
    return sorted.map(q => ({ questionId: q.id, selectedAnswerIndex: null }));
  });

  const [submitted, setSubmitted] = useState(!!assignmentUser.quizSubmittedAt);
  const [score, setScore] = useState<number | null>(assignmentUser.quizScore);
  const [total, setTotal] = useState<number | null>(assignmentUser.quizTotal);
  const [saving, setSaving] = useState(false);

  const getAnswer = (qId: string) =>
    answers.find(a => a.questionId === qId)?.selectedAnswerIndex ?? null;

  const setAnswer = async (qId: string, idx: number) => {
    const next = answers.map(a => a.questionId === qId ? { ...a, selectedAnswerIndex: idx } : a);
    // ensure question exists in answers
    const exists = next.some(a => a.questionId === qId);
    const final = exists ? next : [...next, { questionId: qId, selectedAnswerIndex: idx }];
    setAnswers(final);
    try { await onSaveAnswers(final); } catch { /* silent draft save */ }
  };

  const requiredUnanswered = sorted
    .filter(q => q.required)
    .filter(q => getAnswer(q.id) === null);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const sc = sorted.filter(q => getAnswer(q.id) === q.correctAnswerIndex).length;
      const tot = sorted.length;
      await onSubmit(answers, sc, tot);
      setScore(sc);
      setTotal(tot);
      setSubmitted(true);
    } finally {
      setSaving(false);
    }
  };

  const handleRetake = () => {
    setAnswers(sorted.map(q => ({ questionId: q.id, selectedAnswerIndex: null })));
    setSubmitted(false);
    setScore(null);
    setTotal(null);
  };

  const pct = score !== null && total ? Math.round((score / total) * 100) : null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "var(--card)", border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 12, width: "100%", maxWidth: 600,
          maxHeight: "90vh", overflowY: "auto",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>Knowledge Quiz</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {/* Score banner */}
        {submitted && pct !== null && (
          <div style={{
            margin: "16px 20px 0",
            padding: "12px 16px",
            borderRadius: 8,
            background: `${pctColor(pct)}22`,
            border: `1px solid ${pctColor(pct)}55`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontWeight: 600, color: pctColor(pct) }}>
              {score}/{total} correct — {pct}%
            </span>
            <button
              onClick={handleRetake}
              style={{
                padding: "4px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,.15)",
                background: "rgba(255,255,255,.08)", color: "var(--foreground)", fontSize: 12, cursor: "pointer",
              }}
            >
              Retake
            </button>
          </div>
        )}

        {/* Questions */}
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
          {sorted.map((q, idx) => {
            const sel = getAnswer(q.id);
            const isCorrect = sel === q.correctAnswerIndex;
            return (
              <div key={q.id}>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: "var(--muted)", minWidth: 20 }}>{idx + 1}.</span>
                  <span>{q.prompt}</span>
                  {q.required && (
                    <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 999, background: "rgba(239,68,68,.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,.3)", fontWeight: 700, whiteSpace: "nowrap" }}>
                      Req
                    </span>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginLeft: 28 }}>
                  {q.answers.map((ans, aIdx) => {
                    const isSelected = sel === aIdx;
                    let borderColor = "rgba(255,255,255,.10)";
                    let bg = "rgba(255,255,255,.04)";
                    if (submitted) {
                      if (aIdx === q.correctAnswerIndex) { borderColor = "rgba(34,197,94,.5)"; bg = "rgba(34,197,94,.1)"; }
                      else if (isSelected && !isCorrect) { borderColor = "rgba(239,68,68,.5)"; bg = "rgba(239,68,68,.1)"; }
                    } else if (isSelected) {
                      borderColor = "rgba(99,102,241,.6)"; bg = "rgba(99,102,241,.12)";
                    }
                    return (
                      <button
                        key={aIdx}
                        disabled={submitted}
                        onClick={() => setAnswer(q.id, aIdx)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "8px 12px", borderRadius: 7,
                          border: `1px solid ${borderColor}`, background: bg,
                          color: "var(--foreground)", fontSize: 13, cursor: submitted ? "default" : "pointer",
                          textAlign: "left",
                        }}
                      >
                        <span style={{
                          width: 18, height: 18, borderRadius: "50%", border: `2px solid ${isSelected ? "var(--accent)" : "rgba(255,255,255,.25)"}`,
                          background: isSelected ? "var(--accent)" : "transparent", flexShrink: 0,
                        }} />
                        {ans}
                        {submitted && aIdx === q.correctAnswerIndex && (
                          <span style={{ marginLeft: "auto", color: "#22c55e", fontSize: 16 }}>✓</span>
                        )}
                        {submitted && isSelected && !isCorrect && aIdx !== q.correctAnswerIndex && (
                          <span style={{ marginLeft: "auto", color: "#ef4444", fontSize: 16 }}>✗</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {!submitted && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,.08)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
            {requiredUnanswered.length > 0 && (
              <span style={{ fontSize: 12, color: "var(--muted)", alignSelf: "center" }}>
                {requiredUnanswered.length} required question{requiredUnanswered.length > 1 ? "s" : ""} unanswered
              </span>
            )}
            <button
              onClick={handleSubmit}
              disabled={saving || requiredUnanswered.length > 0}
              style={{
                padding: "8px 20px", borderRadius: 8,
                background: requiredUnanswered.length > 0 ? "rgba(99,102,241,.3)" : "var(--accent)",
                border: "none", color: "#fff", fontWeight: 600, fontSize: 14,
                cursor: requiredUnanswered.length > 0 ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "Submitting…" : "Submit Quiz"}
            </button>
          </div>
        )}
        {submitted && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(255,255,255,.08)", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={onClose}
              style={{ padding: "8px 20px", borderRadius: 8, background: "var(--accent)", border: "none", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
