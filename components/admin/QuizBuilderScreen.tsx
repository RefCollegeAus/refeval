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

interface Props {
  session: RefEvalSession;
  members: MemberRecord[];
  groups: Group[];
  onCreate: (input: CreateAssignmentInput) => Promise<void>;
  onBack: () => void;
}

export function QuizBuilderScreen({ members, groups, onCreate, onBack }: Props) {
  const [title, setTitle]               = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate]           = useState("");
  const [required, setRequired]         = useState(false);
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
        title: title.trim(),
        instructions: instructions.trim(),
        dueDate: dueDate || null,
        required,
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
    <div style={{ padding: "20px 20px 60px", boxSizing: "border-box", maxWidth: 1100, margin: "0 auto" }}>

      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <HelpCircle size={22} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>New Assignment</p>
            <h1 style={{ margin: 0, fontSize: 22 }}>Build a Knowledge Quiz</h1>
          </div>
        </div>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <ChevronLeft size={15} /> Back
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>

        {/* Left column: details + question builder */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Assignment metadata */}
          <div className="panel" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Assignment Details</h2>
            <label>
              Title *
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Offside Rule Quiz"
                autoFocus
              />
            </label>
            <label>
              Instructions <span className="hint">(optional)</span>
              <textarea
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={3}
                placeholder="What should the referee focus on?"
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 14, alignItems: "end" }}>
              <label>
                Due Date <span className="hint">(optional)</span>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", paddingBottom: 10 }}>
                <input
                  type="checkbox"
                  checked={required}
                  onChange={e => setRequired(e.target.checked)}
                  style={{ width: 14, height: 14, accentColor: "var(--accent)", cursor: "pointer" }}
                />
                <span style={{ fontSize: 13, whiteSpace: "nowrap" }}>Required</span>
              </label>
            </div>
          </div>

          {/* Quiz question builder */}
          <div className="panel" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <HelpCircle size={15} style={{ color: "var(--muted)" }} />
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>
                Quiz Questions
                {quizQuestions.length > 0 && (
                  <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400, marginLeft: 6 }}>
                    ({quizQuestions.length})
                  </span>
                )}
              </h2>
            </div>
            {quizQuestions.length === 0 && (
              <p className="hint" style={{ fontSize: 13, margin: "0 0 12px" }}>
                Add questions below. Each question needs a prompt, at least two answers, and a correct answer selected.
              </p>
            )}
            <QuizEditor questions={quizQuestions} onChange={setQuizQuestions} />
          </div>
        </div>

        {/* Right column: recipients + save — sticky */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 20 }}>
          <div className="panel" style={{ padding: 18 }}>
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
          </div>

          <div className="panel" style={{ padding: 18 }}>
            {err && (
              <p className="danger-text" style={{ marginTop: 0, marginBottom: 10, fontSize: 13 }}>
                {err}
              </p>
            )}
            <button
              className="primary"
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
              disabled={saving}
              onClick={handleSave}
            >
              <Save size={14} />
              {saving
                ? "Creating…"
                : resolvedCount > 0
                  ? `Assign to ${resolvedCount} referee${resolvedCount !== 1 ? "s" : ""}`
                  : "Assign to referees"
              }
            </button>
            <button
              style={{ width: "100%", marginTop: 8, fontSize: 13 }}
              onClick={onBack}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
