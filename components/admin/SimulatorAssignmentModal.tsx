"use client";

import { useState, useMemo } from "react";
import { Zap } from "lucide-react";
import type { CreateAssignmentInput } from "@/lib/types/assignments";
import type { MemberRecord } from "@/lib/types/members";
import type { Group } from "@/lib/types/groups";
import { RecipientPicker } from "@/components/common/RecipientPicker";
import type { AssignTab } from "@/components/common/RecipientPicker";

interface SimulatorSession {
  id: string;
  title: string;
}

interface Props {
  sessions: SimulatorSession[];
  members: MemberRecord[];
  groups: Group[];
  initialSessionId?: string | null;
  onCreate: (input: CreateAssignmentInput) => Promise<void>;
  onClose: () => void;
}

export function SimulatorAssignmentModal({ sessions, members, groups, initialSessionId, onCreate, onClose }: Props) {
  const [sessionId, setSessionId] = useState(initialSessionId && initialSessionId !== "__pick__" ? initialSessionId : (sessions[0]?.id ?? ""));
  const [title, setTitle]         = useState(() => {
    const s = sessions.find(s => s.id === (initialSessionId && initialSessionId !== "__pick__" ? initialSessionId : sessions[0]?.id));
    return s ? s.title : "";
  });
  const [instructions, setInstr]  = useState("");
  const [dueDate, setDueDate]     = useState("");
  const [required, setRequired]   = useState(false);

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

  function handleSessionChange(id: string) {
    setSessionId(id);
    const s = sessions.find(s => s.id === id);
    if (s && !title) setTitle(s.title);
    else if (s) setTitle(s.title);
  }

  async function handleCreate() {
    if (!sessionId) { setErr("Select a simulator session."); return; }
    if (!title.trim()) { setErr("Title is required."); return; }
    const userIds = resolveUserIds();
    if (userIds.length === 0) { setErr("Select at least one recipient."); return; }
    setSaving(true); setErr("");
    try {
      await onCreate({
        playlistId: null,
        simulatorSessionId: sessionId,
        title: title.trim(),
        instructions,
        dueDate: dueDate || null,
        required,
        quizAllowRetakes: false,
        userIds,
        questions: [],
        quizQuestions: [],
      });
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Failed to create assignment.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 520, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="modal-title" style={{ flexShrink: 0 }}>
          <div>
            <p className="eyebrow">New Assignment</p>
            <h1 style={{ fontSize: 20, margin: 0, display: "flex", alignItems: "center", gap: 7 }}>
              <Zap size={18} style={{ color: "#fde68a" }} /> Assign Simulator
            </h1>
          </div>
          <button onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
          <label>
            Simulator Session *
            <select value={sessionId} onChange={e => handleSessionChange(e.target.value)}>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </label>

          <label>
            Assignment Title *
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Simulator Practice — March" />
          </label>

          <label>
            Instructions <span className="hint">(optional)</span>
            <textarea
              value={instructions}
              onChange={e => setInstr(e.target.value)}
              rows={3}
              style={{ width: "100%", boxSizing: "border-box", resize: "vertical" }}
            />
          </label>

          <label>
            Due Date <span className="hint">(optional)</span>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={required}
              onChange={e => setRequired(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: "var(--accent)", cursor: "pointer" }}
            />
            <span style={{ fontSize: 13 }}>Required assignment</span>
          </label>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Recipients *</div>
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

          {err && <p className="danger-text">{err}</p>}
        </div>

        <div className="action-row" style={{ flexShrink: 0, marginTop: 20, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleCreate} disabled={saving}>
            {saving ? "Creating…" : "Create Assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}
