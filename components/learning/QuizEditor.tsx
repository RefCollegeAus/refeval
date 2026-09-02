"use client";

import { useState, useCallback } from "react";
function uuidv4() { return crypto.randomUUID(); }
import type { QuizQuestion } from "@/lib/types/assignments";
import type { ReviewRecord, CodedTag } from "@/lib/types/reviews";
import { ClipPickerModal } from "@/components/learning/ClipPickerModal";
import { slotName, splitCategory } from "@/components/common/ClipPreview";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

interface Props {
  questions: QuizQuestion[];
  onChange: (questions: QuizQuestion[]) => void;
  reviews?: ReviewRecord[];
  tags?: CodedTag[];
}

export default function QuizEditor({ questions, onChange, reviews = [], tags = [] }: Props) {
  const [pickerForQuestionId, setPickerForQuestionId] = useState<string | null>(null);
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
    <div className="flex flex-col gap-3">
      {sorted.map((q, idx) => (
        <div key={q.id} className="rounded-lg border border-border bg-panel-2 p-3.5">
          <div className="mb-2.5 flex items-center gap-2">
            <span className="min-w-5 text-xs text-muted">Q{idx + 1}</span>
            <Input
              type="text"
              value={q.prompt}
              onChange={e => update(q.id, { prompt: e.target.value })}
              placeholder="Question prompt…"
              className="flex-1 text-[13px]"
            />
            <Button variant="secondary" size="sm" onClick={() => moveQuestion(q.id, -1)} disabled={idx === 0} title="Move up">↑</Button>
            <Button variant="secondary" size="sm" onClick={() => moveQuestion(q.id, 1)} disabled={idx === sorted.length - 1} title="Move down">↓</Button>
            <Button variant="danger" size="sm" onClick={() => removeQuestion(q.id)}>Remove</Button>
          </div>

          <div className="ml-7 flex flex-col gap-1.5">
            {q.answers.map((ans, aIdx) => (
              <div key={aIdx} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${q.id}`}
                  checked={q.correctAnswerIndex === aIdx}
                  onChange={() => update(q.id, { correctAnswerIndex: aIdx })}
                  title="Mark as correct answer"
                  className="w-auto shrink-0 cursor-pointer"
                  style={{ accentColor: "var(--good)" }}
                />
                <Input
                  type="text"
                  value={ans}
                  onChange={e => updateAnswer(q.id, aIdx, e.target.value)}
                  placeholder={`Answer ${aIdx + 1}…`}
                  className={cn("flex-1 text-[13px]", q.correctAnswerIndex === aIdx && "border-good/50")}
                />
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => removeAnswer(q.id, aIdx)}
                  disabled={q.answers.length <= 2}
                  title="Remove answer"
                >×</Button>
              </div>
            ))}
            <div className="mt-1 flex items-center gap-4">
              <Button variant="secondary" size="sm" onClick={() => addAnswer(q.id)}>+ Answer</Button>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted">
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
            <div className="mt-2.5 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">Video resource:</span>
                <Select
                  value={q.resourceType ?? "none"}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === "none") {
                      update(q.id, { resourceType: null, resourceVideoUrl: null, resourceReviewId: null, resourceTagId: null });
                    } else if (val === "video_url") {
                      update(q.id, { resourceType: "video_url", resourceReviewId: null, resourceTagId: null });
                    } else if (val === "review_clip") {
                      update(q.id, { resourceType: "review_clip", resourceVideoUrl: null });
                    }
                  }}
                  className="w-auto text-xs"
                >
                  <option value="none">None</option>
                  <option value="video_url">Video URL</option>
                  <option value="review_clip">RefCoach Clip</option>
                </Select>
              </div>

              {q.resourceType === "video_url" && (
                <Input
                  type="url"
                  value={q.resourceVideoUrl ?? ""}
                  onChange={e => update(q.id, { resourceVideoUrl: e.target.value || null })}
                  placeholder="https://youtube.com/watch?v=… or direct .mp4 URL"
                  className="text-xs"
                />
              )}

              {q.resourceType === "review_clip" && (
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted">
                    Clip duration
                    <Input
                      type="number"
                      min={3}
                      max={60}
                      value={q.resourceClipDurationSeconds ?? 10}
                      onChange={e => update(q.id, { resourceClipDurationSeconds: Math.min(60, Math.max(3, Number(e.target.value) || 10)) })}
                      className="w-14 text-center text-xs"
                    />
                    <span className="text-[11px] text-muted">seconds (3–60)</span>
                  </label>
                </div>
              )}

              {q.resourceType === "review_clip" && (() => {
                const review = reviews.find(r => r.id === q.resourceReviewId);
                const tag = tags.find(t => t.id === q.resourceTagId);
                if (review && tag) {
                  const refName = slotName(tag.refereeTarget, review);
                  const [catGroup, catSub] = splitCategory(tag.category);
                  const catLabel = catSub ? `${catGroup} — ${catSub}` : catGroup || "";
                  return (
                    <div className="flex items-center gap-2 rounded-lg border border-info/25 bg-info/10 px-2.5 py-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold">
                          {review.game}
                        </div>
                        <div className="text-[11px] text-muted">
                          {tag.adjustedTime} · {refName}{catLabel ? ` · ${catLabel}` : ""}
                        </div>
                      </div>
                      <Button variant="secondary" size="sm" onClick={() => setPickerForQuestionId(q.id)}>Change</Button>
                      <Button variant="danger" size="sm" onClick={() => update(q.id, { resourceReviewId: null, resourceTagId: null })}>Remove</Button>
                    </div>
                  );
                }
                return (
                  <Button variant="secondary" size="sm" className="self-start" onClick={() => setPickerForQuestionId(q.id)}>
                    Choose Clip…
                  </Button>
                );
              })()}
            </div>

            <div className="mt-2.5">
              <label className="mb-1 block text-xs text-muted">
                Explanation <span className="opacity-60">(shown after submission)</span>
              </label>
              <Textarea
                value={q.explanation ?? ""}
                onChange={e => update(q.id, { explanation: e.target.value || undefined })}
                placeholder="Explain why the correct answer is right…"
                rows={2}
                className="text-xs"
              />
            </div>
          </div>
        </div>
      ))}

      <Button variant="secondary" size="sm" className="self-start" onClick={addQuestion}>
        + Add Question
      </Button>

      {pickerForQuestionId && (
        <ClipPickerModal
          reviews={reviews}
          tags={tags}
          onSelect={(reviewId, tagId) => {
            update(pickerForQuestionId, { resourceReviewId: reviewId, resourceTagId: tagId });
            setPickerForQuestionId(null);
          }}
          onClose={() => setPickerForQuestionId(null)}
        />
      )}
    </div>
  );
}
