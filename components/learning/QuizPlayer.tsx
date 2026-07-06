"use client";

import { useState, useMemo } from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import type { QuizQuestion, QuizAnswer, AssignmentUser } from "@/lib/types/assignments";
import type { ReviewRecord, CodedTag } from "@/lib/types/reviews";
import { getYouTubeId, isDirectVideoUrl } from "@/lib/utils/video";
import { slotName, splitCategory } from "@/components/common/ClipPreview";

interface Props {
  questions: QuizQuestion[];
  assignmentUser: AssignmentUser;
  allowRetakes: boolean;
  canComplete: boolean;
  isCompleted: boolean;
  reviews?: ReviewRecord[];
  tags?: CodedTag[];
  onSaveAnswers: (answers: QuizAnswer[]) => Promise<void>;
  onSubmit: (answers: QuizAnswer[], score: number, total: number) => Promise<void>;
  onClose: () => void;
  onComplete: () => Promise<void>;
}

function pctColor(pct: number) {
  if (pct >= 80) return "#22c55e";
  if (pct >= 50) return "#3b82f6";
  return "#ef4444";
}

export default function QuizPlayer({ questions, assignmentUser, allowRetakes, canComplete, isCompleted, reviews = [], tags = [], onSaveAnswers, onSubmit, onClose, onComplete }: Props) {
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

  function renderQuestionVideo(q: QuizQuestion) {
    if (q.resourceType === "video_url") {
      const url = q.resourceVideoUrl?.trim();
      if (!url) return null;
      const ytId = getYouTubeId(url);
      if (ytId) {
        return (
          <div style={{ marginBottom: 12, borderRadius: 10, overflow: "hidden", background: "#000", aspectRatio: "16/9" }}>
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?rel=0`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ width: "100%", height: "100%", border: "none", display: "block" }}
            />
          </div>
        );
      }
      if (isDirectVideoUrl(url)) {
        return (
          <div style={{ marginBottom: 12, borderRadius: 10, overflow: "hidden", background: "#000" }}>
            <video
              src={url}
              controls
              style={{ width: "100%", display: "block", maxHeight: 280 }}
              onError={e => { (e.currentTarget.parentElement!.style.display = "none"); }}
            />
          </div>
        );
      }
      return null;
    }

    if (q.resourceType === "review_clip") {
      const review = reviews.find(r => r.id === q.resourceReviewId);
      const tag = tags.find(t => t.id === q.resourceTagId);
      if (!review || !tag) return null;

      const refName = slotName(tag.refereeTarget, review);
      const [catGroup, catSub] = splitCategory(tag.category);
      const catLabel = catSub ? `${catGroup} — ${catSub}` : catGroup || "";
      const startSec = Math.max(0, tag.adjustedSeconds - 5);
      const ytId = getYouTubeId(review.videoLink);
      const isDirect = !ytId && isDirectVideoUrl(review.videoLink);

      return (
        <div style={{ marginBottom: 12 }}>
          {ytId ? (
            <div style={{ borderRadius: 10, overflow: "hidden", background: "#000", aspectRatio: "16/9" }}>
              <iframe
                src={`https://www.youtube.com/embed/${ytId}?start=${Math.floor(startSec)}&rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ width: "100%", height: "100%", border: "none", display: "block" }}
              />
            </div>
          ) : isDirect ? (
            <div style={{ borderRadius: 10, overflow: "hidden", background: "#000" }}>
              <video
                src={review.videoLink}
                controls
                style={{ width: "100%", display: "block", maxHeight: 280 }}
                onLoadedMetadata={e => { e.currentTarget.currentTime = startSec; }}
                onError={e => { (e.currentTarget.parentElement!.style.display = "none"); }}
              />
            </div>
          ) : null}
          <div style={{
            marginTop: 6, padding: "7px 10px",
            background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)",
            borderRadius: 8, display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11, color: "var(--muted)",
          }}>
            <span style={{ fontWeight: 600, color: "var(--text)" }}>{review.game}</span>
            <span>{tag.adjustedTime}</span>
            <span>{refName}</span>
            {catLabel && <span>{catLabel}</span>}
            {tag.notes && <span style={{ fontStyle: "italic" }}>{tag.notes}</span>}
          </div>
        </div>
      );
    }

    return null;
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.75)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "var(--panel)", border: "1px solid var(--border)",
          borderRadius: 14, width: "100%", maxWidth: 620,
          maxHeight: "90vh", overflowY: "auto",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Knowledge Quiz</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 22, cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>

        {/* Score banner */}
        {submitted && pct !== null && (
          <div style={{
            margin: "16px 20px 0",
            padding: "14px 16px",
            borderRadius: 10,
            background: `${pctColor(pct)}18`,
            border: `1px solid ${pctColor(pct)}44`,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {pct >= 80
                ? <CheckCircle2 size={20} style={{ color: "#22c55e", flexShrink: 0 }} />
                : <XCircle size={20} style={{ color: pctColor(pct), flexShrink: 0 }} />
              }
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: pctColor(pct) }}>
                  {score}/{total} correct — {pct}%
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 1 }}>
                  {pct >= 80 ? "Great work!" : pct >= 50 ? "Keep studying the explanations below." : "Review the correct answers below."}
                </div>
              </div>
            </div>
            {allowRetakes && (
              <button
                onClick={handleRetake}
                style={{
                  padding: "6px 14px", borderRadius: 7,
                  border: "1px solid var(--border)",
                  background: "var(--panel2)", color: "var(--text)",
                  fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0,
                }}
              >
                Retake
              </button>
            )}
          </div>
        )}

        {/* Questions */}
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 24, flex: 1 }}>
          {sorted.map((q, idx) => {
            const sel = getAnswer(q.id);
            const isCorrect = sel !== null && sel === q.correctAnswerIndex;
            const isWrong = submitted && sel !== null && !isCorrect;
            return (
              <div key={q.id}>
                {/* Video resource */}
                {renderQuestionVideo(q)}

                {/* Question prompt */}
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ color: "var(--muted)", minWidth: 22, fontWeight: 400 }}>{idx + 1}.</span>
                  <span style={{ flex: 1 }}>{q.prompt}</span>
                  {q.required && (
                    <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 999, background: "rgba(239,68,68,.15)", color: "#fca5a5", border: "1px solid rgba(239,68,68,.3)", fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
                      Required
                    </span>
                  )}
                </div>

                {/* Answer options */}
                <div style={{ display: "flex", flexDirection: "column", gap: 7, marginLeft: 30 }}>
                  {q.answers.map((ans, aIdx) => {
                    const isSelected = sel === aIdx;
                    const isThisCorrect = aIdx === q.correctAnswerIndex;

                    // Colours
                    let borderColor = "rgba(255,255,255,.12)";
                    let bg = "transparent";
                    let textColor = "var(--text)";

                    if (submitted) {
                      if (isThisCorrect) {
                        borderColor = "rgba(34,197,94,.55)";
                        bg = "rgba(34,197,94,.10)";
                        textColor = "#bbf7d0";
                      } else if (isSelected && !isCorrect) {
                        borderColor = "rgba(239,68,68,.55)";
                        bg = "rgba(239,68,68,.10)";
                        textColor = "#fca5a5";
                      }
                    } else if (isSelected) {
                      borderColor = "rgba(99,102,241,.7)";
                      bg = "rgba(99,102,241,.13)";
                    }

                    return (
                      <button
                        key={aIdx}
                        disabled={submitted}
                        onClick={() => setAnswer(q.id, aIdx)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 12px", borderRadius: 8,
                          border: `1px solid ${borderColor}`, background: bg,
                          color: textColor, fontSize: 13,
                          cursor: submitted ? "default" : "pointer",
                          textAlign: "left", width: "100%",
                        }}
                      >
                        {/* Radio circle */}
                        <span style={{
                          width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                          border: `2px solid ${submitted
                            ? (isThisCorrect ? "#22c55e" : isSelected ? "#ef4444" : "rgba(255,255,255,.2)")
                            : (isSelected ? "var(--accent)" : "rgba(255,255,255,.3)")}`,
                          background: submitted
                            ? (isThisCorrect ? "#22c55e22" : isSelected ? "#ef444422" : "transparent")
                            : (isSelected ? "var(--accent)" : "transparent"),
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {submitted && isThisCorrect && (
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "block" }} />
                          )}
                        </span>

                        <span style={{ flex: 1 }}>{ans}</span>

                        {/* Result labels */}
                        {submitted && isThisCorrect && isSelected && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#22c55e", whiteSpace: "nowrap", marginLeft: "auto" }}>
                            ✓ Correct
                          </span>
                        )}
                        {submitted && isThisCorrect && !isSelected && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#86efac", whiteSpace: "nowrap", marginLeft: "auto" }}>
                            ✓ Correct answer
                          </span>
                        )}
                        {submitted && !isThisCorrect && isSelected && (
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#fca5a5", whiteSpace: "nowrap", marginLeft: "auto" }}>
                            ✗ Your answer
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation — shown after submission when question was wrong or always if answered */}
                {submitted && q.explanation && (isWrong || isCorrect) && (
                  <div style={{
                    marginTop: 10, marginLeft: 30,
                    padding: "10px 12px",
                    background: isWrong ? "rgba(251,191,36,.07)" : "rgba(34,197,94,.07)",
                    border: isWrong ? "1px solid rgba(251,191,36,.25)" : "1px solid rgba(34,197,94,.2)",
                    borderRadius: 8,
                    display: "flex", gap: 8, alignItems: "flex-start",
                  }}>
                    <Info size={13} style={{ color: isWrong ? "#fbbf24" : "#86efac", flexShrink: 0, marginTop: 1 }} />
                    <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {!submitted && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>
            {requiredUnanswered.length > 0 && (
              <span style={{ fontSize: 12, color: "var(--muted)", alignSelf: "center" }}>
                {requiredUnanswered.length} required question{requiredUnanswered.length !== 1 ? "s" : ""} unanswered
              </span>
            )}
            <button
              onClick={handleSubmit}
              disabled={saving || requiredUnanswered.length > 0}
              className="primary"
              style={{
                padding: "8px 20px", fontSize: 14,
                opacity: (saving || requiredUnanswered.length > 0) ? 0.5 : 1,
                cursor: (saving || requiredUnanswered.length > 0) ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Submitting…" : "Submit Quiz"}
            </button>
          </div>
        )}
        {submitted && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0 }}>
            {canComplete && !isCompleted ? (
              <>
                <button style={{ padding: "8px 16px", fontSize: 14 }} onClick={onClose}>
                  Back
                </button>
                <button
                  className="primary"
                  style={{ padding: "8px 20px", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}
                  onClick={() => onComplete().catch(console.error)}
                >
                  <CheckCircle2 size={14} /> Complete Assignment
                </button>
              </>
            ) : (
              <button className="primary" style={{ padding: "8px 20px", fontSize: 14 }} onClick={onClose}>
                Done
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
