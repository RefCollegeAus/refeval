"use client";

import { useCallback } from "react";
function uuidv4() { return crypto.randomUUID(); }
import type { QuizQuestion } from "@/lib/types/assignments";

interface Props {
  questions: QuizQuestion[];
  onChange: (questions: QuizQuestion[]) => void;
}

const btn: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,.2)",
  background: "rgba(255,255,255,.08)",
  color: "var(--text)",
  fontSize: 12,
  cursor: "pointer",
  flexShrink: 0,
  whiteSpace: "nowrap",
};

const dangerBtn: React.CSSProperties = {
  ...btn,
  border: "1px solid rgba(239,68,68,.3)",
  background: "rgba(239,68,68,.08)",
  color: "#fca5a5",
};

export default function QuizEditor({ questions, onChange }: Props) {
  const sorted = [...questions].sort((a, b) => a.displayOrder - b.displayOrder);

  const update = useCallback(
    (id: string, patch: Partial<QuizQuestion>) => {
      onChange(questions.map(q => (q.id === id ? { ...q, ...patch } : q)));
    },
    [questions, onChange],
  );

  const addQuestion = () => {
    const next: QuizQuestion = {
      id: uuidv4(),
      prompt: "",
      answers: ["", ""],
      correctAnswerIndex: 0,
      required: false,
      displayOrder: questions.length,
    };
    onChange([...questions, next]);
  };

  const removeQuestion = (id: string) => {
    const remaining = questions.filter(q => q.id !== id);
    onChange(remaining.map((q, i) => ({ ...q, displayOrder: i })));
  };

  const moveQuestion = (id: string, dir: -1 | 1) => {
    const s = [...sorted];
    const idx = s.findIndex(q => q.id === id);
    const swap = idx + dir;
    if (swap < 0 || swap >= s.length) return;
    [s[idx], s[swap]] = [s[swap], s[idx]];
    onChange(s.map((q, i) => ({ ...q, displayOrder: i })));
  };

  const updateAnswer = (qId: string, aIdx: number, text: string) => {
    const q = questions.find(q => q.id === qId);
    if (!q) return;
    const answers = [...q.answers];
    answers[aIdx] = text;
    update(qId, { answers });
  };

  const addAnswer = (qId: string) => {
    const q = questions.find(q => q.id === qId);
    if (!q) return;
    update(qId, { answers: [...q.answers, ""] });
  };

  const removeAnswer = (qId: string, aIdx: number) => {
    const q = questions.find(q => q.id === qId);
    if (!q || q.answers.length <= 2) return;
    const answers = q.answers.filter((_, i) => i !== aIdx);
    const correctAnswerIndex = q.correctAnswerIndex >= answers.length
      ? answers.length - 1
      : q.correctAnswerIndex === aIdx
        ? 0
        : q.correctAnswerIndex > aIdx
          ? q.correctAnswerIndex - 1
          : q.correctAnswerIndex;
    update(qId, { answers, correctAnswerIndex });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {sorted.map((q, idx) => (
        <div
          key={q.id}
          style={{
            border: "1px solid rgba(255,255,255,.12)",
            borderRadius: 8,
            padding: 14,
            background: "rgba(255,255,255,.03)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "var(--muted)", minWidth: 20 }}>Q{idx + 1}</span>
            <input
              type="text"
              value={q.prompt}
              onChange={e => update(q.id, { prompt: e.target.value })}
              placeholder="Question prompt…"
              style={{
                flex: 1,
                width: "auto",
                minWidth: 0,
                background: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.2)",
                borderRadius: 6,
                padding: "6px 10px",
                color: "var(--text)",
                fontSize: 13,
              }}
            />
            <button style={btn} onClick={() => moveQuestion(q.id, -1)} disabled={idx === 0} title="Move up">↑</button>
            <button style={btn} onClick={() => moveQuestion(q.id, 1)} disabled={idx === sorted.length - 1} title="Move down">↓</button>
            <button style={dangerBtn} onClick={() => removeQuestion(q.id)}>Remove</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginLeft: 28 }}>
            {q.answers.map((ans, aIdx) => (
              <div key={aIdx} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="radio"
                  name={`correct-${q.id}`}
                  checked={q.correctAnswerIndex === aIdx}
                  onChange={() => update(q.id, { correctAnswerIndex: aIdx })}
                  title="Mark as correct answer"
                  style={{ width: "auto", flexShrink: 0, accentColor: "#22c55e", cursor: "pointer" }}
                />
                <input
                  type="text"
                  value={ans}
                  onChange={e => updateAnswer(q.id, aIdx, e.target.value)}
                  placeholder={`Answer ${aIdx + 1}…`}
                  style={{
                    flex: 1,
                    width: "auto",
                    minWidth: 0,
                    background: "rgba(255,255,255,.08)",
                    border: q.correctAnswerIndex === aIdx
                      ? "1px solid rgba(34,197,94,.5)"
                      : "1px solid rgba(255,255,255,.2)",
                    borderRadius: 6,
                    padding: "5px 9px",
                    color: "var(--text)",
                    fontSize: 13,
                  }}
                />
                <button
                  style={dangerBtn}
                  onClick={() => removeAnswer(q.id, aIdx)}
                  disabled={q.answers.length <= 2}
                  title="Remove answer"
                >×</button>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 4 }}>
              <button style={btn} onClick={() => addAnswer(q.id)}>+ Answer</button>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--muted)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={q.required}
                  onChange={e => update(q.id, { required: e.target.checked })}
                  style={{ accentColor: "var(--accent)" }}
                />
                Required
              </label>
            </div>

            {/* Resource section */}
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>Video resource:</span>
                <select
                  value={q.resourceType ?? "none"}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === "none") {
                      update(q.id, { resourceType: null, resourceVideoUrl: null });
                    } else if (val === "video_url") {
                      update(q.id, { resourceType: "video_url", resourceVideoUrl: q.resourceVideoUrl ?? "" });
                    }
                  }}
                  style={{
                    fontSize: 12, padding: "3px 7px", borderRadius: 6,
                    background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.15)",
                    color: "var(--text)", cursor: "pointer", width: "auto",
                  }}
                >
                  <option value="none">None</option>
                  <option value="video_url">Video URL</option>
                  <option value="clip" disabled>Attach Clip (coming soon)</option>
                </select>
              </div>
              {q.resourceType === "video_url" && (
                <input
                  type="url"
                  value={q.resourceVideoUrl ?? ""}
                  onChange={e => update(q.id, { resourceVideoUrl: e.target.value || null })}
                  placeholder="https://youtube.com/watch?v=… or direct .mp4 URL"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.15)",
                    borderRadius: 6, padding: "6px 9px", color: "var(--text)", fontSize: 12,
                  }}
                />
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 12, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                Explanation <span style={{ opacity: 0.6 }}>(shown after submission)</span>
              </label>
              <textarea
                value={q.explanation ?? ""}
                onChange={e => update(q.id, { explanation: e.target.value || undefined })}
                placeholder="Explain why the correct answer is right…"
                rows={2}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "rgba(255,255,255,.05)",
                  border: "1px solid rgba(255,255,255,.15)",
                  borderRadius: 6,
                  padding: "6px 9px",
                  color: "var(--text)",
                  fontSize: 12,
                  resize: "vertical",
                }}
              />
            </div>
          </div>
        </div>
      ))}

      <button
        style={{ ...btn, alignSelf: "flex-start", padding: "6px 14px" }}
        onClick={addQuestion}
      >
        + Add Question
      </button>
    </div>
  );
}
