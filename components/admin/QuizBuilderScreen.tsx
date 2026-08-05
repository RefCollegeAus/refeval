"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, HelpCircle, Save } from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";
import type { CreateAssignmentInput, QuizQuestion } from "@/lib/types/assignments";
import type { MemberRecord } from "@/lib/types/members";
import type { Group } from "@/lib/types/groups";
import { RecipientPicker } from "@/components/common/RecipientPicker";
import type { AssignTab } from "@/components/common/RecipientPicker";
import QuizEditor from "@/components/learning/QuizEditor";
import type { ReviewRecord, CodedTag } from "@/lib/types/reviews";
import { PageFrame } from "@/components/shell/PageFrame";
import { Button, Card, CardTitle, FormField, Input, Textarea } from "@/components/ui";

interface Props {
  session: RefEvalSession;
  members: MemberRecord[];
  groups: Group[];
  reviews?: ReviewRecord[];
  tags?: CodedTag[];
  onCreate: (input: CreateAssignmentInput) => Promise<void>;
  onBack: () => void;
}

export function QuizBuilderScreen({ members, groups, reviews = [], tags = [], onCreate, onBack }: Props) {
  const [title, setTitle]               = useState("");
  const [instructions, setInstructions]   = useState("");
  const [dueDate, setDueDate]             = useState("");
  const [required, setRequired]           = useState(false);
  const [allowRetakes, setAllowRetakes]   = useState(true);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);

  const [tab, setTab]             = useState<AssignTab>("users");
  const [selected, setSelected]   = useState<Set<string>>(new Set());
  const [selGroups, setSelGroups] = useState<Set<string>>(new Set());

  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  const referees = useMemo(() => members.filter(m => m.role === "referee"), [members]);

  function resolveUserIds(): string[] {
    const ids = new Set<string>();
    selected.forEach(id => ids.add(id));
    groups
      .filter(g => selGroups.has(g.id))
      .forEach(g => g.members.forEach(m => ids.add(m.userId)));
    if (tab === "org") referees.forEach(m => ids.add(m.id));
    return Array.from(ids);
  }

  async function handleSave() {
    setErr("");
    if (!title.trim()) { setErr("Assignment title is required."); return; }
    if (quizQuestions.length === 0) { setErr("Add at least one question."); return; }
    const emptyPrompt = quizQuestions.find(q => !q.prompt.trim());
    if (emptyPrompt) { setErr("All questions need a prompt."); return; }
    const emptyAnswer = quizQuestions.find(q => q.answers.some(a => !a.trim()));
    if (emptyAnswer) { setErr("All answer fields must be filled in."); return; }
    const userIds = resolveUserIds();
    if (userIds.length === 0) { setErr("Select at least one referee."); return; }
    setSaving(true);
    try {
      await onCreate({
        playlistId: null,
        simulatorSessionId: null,
        title: title.trim(),
        instructions: instructions.trim(),
        dueDate: dueDate || null,
        required,
        quizAllowRetakes: allowRetakes,
        questions: [],
        quizQuestions,
        userIds,
      });
      onBack();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create quiz assignment.";
      setErr(msg);
      setSaving(false);
    }
  }

  const resolvedCount = resolveUserIds().length;

  return (
    <PageFrame
      className="p-0 mx-auto max-w-[1100px]"
      eyebrow="New Assignment"
      title="Build a Knowledge Quiz"
      actions={
        <Button variant="ghost" size="sm" className="gap-1" onClick={onBack} disabled={saving}>
          <ChevronLeft size={15} /> Back
        </Button>
      }
    >
      <div className="grid items-start gap-4 lg:grid-cols-[1fr_320px]">

        {/* Left column: details + question builder */}
        <div className="grid grid-cols-1 gap-3.5">

          {/* Assignment metadata */}
          <Card className="grid grid-cols-1 gap-3.5">
            <CardTitle>Assignment Details</CardTitle>
            <FormField label="Title" required>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Offside Rule Quiz"
                autoFocus
              />
            </FormField>
            <FormField label="Instructions" hint="Optional">
              <Textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={3}
                placeholder="What should the referee focus on?"
              />
            </FormField>
            <div className="grid grid-cols-[1fr_auto] items-end gap-3.5">
              <FormField label="Due Date" hint="Optional">
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </FormField>
              <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm text-text">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={e => setRequired(e.target.checked)}
                  className="h-3.5 w-3.5 cursor-pointer accent-accent"
                />
                <span className="whitespace-nowrap">Required</span>
              </label>
            </div>

            {/* Quiz settings */}
            <label className="flex flex-wrap items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={allowRetakes}
                onChange={e => setAllowRetakes(e.target.checked)}
                className="h-3.5 w-3.5 cursor-pointer accent-accent"
              />
              <span>Allow retakes</span>
              <span className="text-xs text-muted">(referee can retry after submission)</span>
            </label>
          </Card>

          {/* Quiz question builder */}
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <HelpCircle size={15} className="text-muted" />
              <CardTitle>
                Quiz Questions
                {quizQuestions.length > 0 && (
                  <span className="ml-1.5 font-normal text-muted">({quizQuestions.length})</span>
                )}
              </CardTitle>
            </div>
            {quizQuestions.length === 0 && (
              <p className="mb-3 text-xs text-muted">
                Add questions below. Each question needs a prompt, at least two answers, and a correct answer selected.
              </p>
            )}
            <QuizEditor questions={quizQuestions} onChange={setQuizQuestions} reviews={reviews} tags={tags} />
          </Card>
        </div>

        {/* Right column: recipients + save — sticky */}
        <div className="sticky top-5 grid gap-3.5">
          <Card>
            <RecipientPicker
              members={members}
              groups={groups}
              tab={tab}
              setTab={setTab}
              selected={selected}
              setSelected={setSelected}
              selGroups={selGroups}
              setSelGroups={setSelGroups}
            />
          </Card>

          <Card className="grid grid-cols-1 gap-2">
            {err && <p className="text-xs font-medium text-red-400">{err}</p>}
            <Button className="w-full gap-1.5" disabled={saving} onClick={handleSave}>
              <Save size={14} />
              {saving
                ? "Creating…"
                : resolvedCount > 0
                  ? `Assign to ${resolvedCount} referee${resolvedCount !== 1 ? "s" : ""}`
                  : "Assign to referees"
              }
            </Button>
            <Button variant="ghost" size="sm" className="w-full" onClick={onBack} disabled={saving}>
              Cancel
            </Button>
          </Card>
        </div>
      </div>
    </PageFrame>
  );
}
