"use client";

import { useState, useId } from "react";
import { Zap, ChevronLeft, Plus, Trash2, Save, Edit2, Play } from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";
import {
  SimulatorSessionWithEvents,
  SimulatorLevel,
  SIMULATOR_LEVELS,
  LEVEL_LABELS,
  LEVEL_COLORS,
  SIMULATOR_OUTCOMES,
  SIMULATOR_CALL_OPTIONS,
} from "@/lib/types/simulator";
import type { SessionFormData, EventFormData } from "@/lib/hooks/useSimulatorSessions";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseTimestamp(s: string): number {
  const clean = s.trim();
  if (clean.includes(":")) {
    const [m, sec] = clean.split(":").map(n => parseInt(n) || 0);
    return m * 60 + sec;
  }
  return Math.max(0, parseInt(clean) || 0);
}

function fmtTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function LevelBadge({ level }: { level: SimulatorLevel }) {
  const c = LEVEL_COLORS[level];
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, color: c.color, background: c.bg, border: `1px solid ${c.border}`, whiteSpace: "nowrap" }}>
      {LEVEL_LABELS[level]}
    </span>
  );
}

// ── Event row editor ──────────────────────────────────────────────────────────

interface EventRowProps {
  event: EventFormData;
  index: number;
  showCallField: boolean;
  onChange: (idx: number, patch: Partial<EventFormData>) => void;
  onDelete: (idx: number) => void;
}

function EventRow({ event, index, showCallField, onChange, onDelete }: EventRowProps) {
  const [tsInput, setTsInput] = useState(fmtTimestamp(event.timestampSeconds));

  const callOptions = SIMULATOR_CALL_OPTIONS[event.correctOutcome] ?? [];
  const hasCallOptions = callOptions.length > 0;

  return (
    <tr style={{ verticalAlign: "top" }}>
      <td style={{ padding: "6px 6px 6px 0", width: 72 }}>
        <input
          value={tsInput}
          onChange={e => {
            setTsInput(e.target.value);
            onChange(index, { timestampSeconds: parseTimestamp(e.target.value) });
          }}
          onBlur={() => setTsInput(fmtTimestamp(event.timestampSeconds))}
          placeholder="m:ss"
          style={{ width: "100%", fontFamily: "monospace", fontSize: 13 }}
        />
      </td>
      <td style={{ padding: "6px 4px", width: 60 }}>
        <input
          type="number"
          value={event.windowSeconds}
          onChange={e => onChange(index, { windowSeconds: Math.max(3, parseInt(e.target.value) || 10) })}
          min={3}
          max={60}
          style={{ width: "100%" }}
        />
      </td>
      <td style={{ padding: "6px 4px" }}>
        <select
          value={event.correctOutcome}
          onChange={e => onChange(index, { correctOutcome: e.target.value, correctCall: "" })}
          style={{ width: "100%" }}
        >
          <option value="">— Select —</option>
          {SIMULATOR_OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </td>
      {showCallField && (
        <td style={{ padding: "6px 4px" }}>
          {hasCallOptions ? (
            <select
              value={event.correctCall}
              onChange={e => onChange(index, { correctCall: e.target.value })}
              style={{ width: "100%" }}
            >
              <option value="">— Select —</option>
              {callOptions.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          ) : (
            <span style={{ fontSize: 12, color: "var(--muted)", padding: "6px 4px", display: "block" }}>—</span>
          )}
        </td>
      )}
      <td style={{ padding: "6px 4px" }}>
        <input
          value={event.notes}
          onChange={e => onChange(index, { notes: e.target.value })}
          placeholder="Explanation for referees…"
          style={{ width: "100%", fontSize: 12 }}
        />
      </td>
      <td style={{ padding: "6px 0 6px 4px", width: 36, textAlign: "center" }}>
        <button
          onClick={() => onDelete(index)}
          style={{ padding: "4px 6px", color: "#fca5a5", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 6 }}
          title="Remove event"
        >
          <Trash2 size={12} />
        </button>
      </td>
    </tr>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  session: RefEvalSession;
  sessions: SimulatorSessionWithEvents[];
  loading: boolean;
  onCreate: (data: SessionFormData, events: EventFormData[]) => Promise<string>;
  onUpdate: (id: string, data: SessionFormData, events: EventFormData[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onBack: () => void;
  onRunSession: (sessionId: string) => void;
}

type View = "list" | "edit";

// ── Main component ────────────────────────────────────────────────────────────

export function SimulatorBuilderScreen({
  session, sessions, loading,
  onCreate, onUpdate, onDelete,
  onBack, onRunSession,
}: Props) {
  const uid = useId();
  const [view, setView] = useState<View>("list");
  const [editId, setEditId] = useState<string | null>(null);

  // Form state
  const [fTitle, setFTitle] = useState("");
  const [fDescription, setFDescription] = useState("");
  const [fVideoUrl, setFVideoUrl] = useState("");
  const [fLevel, setFLevel] = useState<SimulatorLevel>("beginner");
  const [draftEvents, setDraftEvents] = useState<EventFormData[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const showCallField = fLevel === "intermediate" || fLevel === "advanced" || fLevel === "elite";

  function openNew() {
    setEditId(null);
    setFTitle(""); setFDescription(""); setFVideoUrl(""); setFLevel("beginner");
    setDraftEvents([]);
    setFormError("");
    setView("edit");
  }

  function openEdit(s: SimulatorSessionWithEvents) {
    setEditId(s.id);
    setFTitle(s.title);
    setFDescription(s.description);
    setFVideoUrl(s.videoUrl);
    setFLevel(s.level);
    setDraftEvents(
      s.events.map(e => ({
        tempId: e.id,
        timestampSeconds: e.timestampSeconds,
        windowSeconds: e.windowSeconds,
        correctOutcome: e.correctOutcome,
        correctCall: e.correctCall,
        category: e.category,
        notes: e.notes,
      }))
    );
    setFormError("");
    setView("edit");
  }

  function addEvent() {
    const maxTs = draftEvents.length > 0
      ? Math.max(...draftEvents.map(e => e.timestampSeconds)) + 30
      : 60;
    setDraftEvents(prev => [...prev, {
      tempId: `new-${Date.now()}-${Math.random()}`,
      timestampSeconds: maxTs,
      windowSeconds: 10,
      correctOutcome: "",
      correctCall: "",
      category: "",
      notes: "",
    }]);
  }

  function updateEventAt(idx: number, patch: Partial<EventFormData>) {
    setDraftEvents(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e));
  }

  function deleteEventAt(idx: number) {
    setDraftEvents(prev => prev.filter((_, i) => i !== idx));
  }

  // Sort events by timestamp before saving
  function sortedEvents() {
    return [...draftEvents].sort((a, b) => a.timestampSeconds - b.timestampSeconds);
  }

  async function handleSave() {
    if (!fTitle.trim()) { setFormError("Title is required."); return; }
    if (!fVideoUrl.trim()) { setFormError("Video URL is required."); return; }
    const incomplete = draftEvents.find(e => !e.correctOutcome);
    if (incomplete) { setFormError("All events must have a correct outcome selected."); return; }
    setSaving(true);
    setFormError("");
    try {
      const formData: SessionFormData = {
        title: fTitle.trim(),
        description: fDescription.trim(),
        videoUrl: fVideoUrl.trim(),
        level: fLevel,
      };
      if (editId) {
        await onUpdate(editId, formData, sortedEvents());
      } else {
        await onCreate(formData, sortedEvents());
      }
      setView("list");
    } catch {
      setFormError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
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

        {!loading && sessions.length > 0 && (
          <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
            {sessions.map((s, idx) => (
              <div
                key={s.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 16px",
                  borderBottom: idx < sessions.length - 1 ? "1px solid var(--border)" : "none",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{s.title}</span>
                    <LevelBadge level={s.level} />
                    <span className="hint" style={{ fontSize: 12 }}>
                      {s.events.length} event{s.events.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {s.description && (
                    <p className="hint" style={{ margin: 0, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.description}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => onRunSession(s.id)}
                    style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "5px 11px" }}
                    title="Preview / Run this simulator"
                  >
                    <Play size={12} /> Preview
                  </button>
                  <button
                    onClick={() => openEdit(s)}
                    style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "5px 11px" }}
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s.id, s.title)}
                    style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "5px 11px", color: "#fca5a5", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 7 }}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Edit / Create view ──────────────────────────────────────────────────────

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
        <h2 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700 }}>Session Details</h2>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
            <label htmlFor={`${uid}-url`}>
              Video URL *
              <input
                id={`${uid}-url`}
                value={fVideoUrl}
                onChange={e => setFVideoUrl(e.target.value)}
                placeholder="YouTube or direct MP4/WebM URL"
              />
            </label>
            <label htmlFor={`${uid}-level`}>
              Level
              <select
                id={`${uid}-level`}
                value={fLevel}
                onChange={e => setFLevel(e.target.value as SimulatorLevel)}
              >
                {SIMULATOR_LEVELS.map(l => (
                  <option key={l} value={l}>{LEVEL_LABELS[l]}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="hint" style={{ margin: 0, fontSize: 12 }}>
            <strong>Beginner</strong> — referee selects outcome only.{" "}
            <strong>Intermediate / Advanced</strong> — referee selects outcome + call type.
          </p>
        </div>
      </div>

      {/* Events */}
      <div className="panel" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
            Decision Events
            <span className="hint" style={{ fontWeight: 400, marginLeft: 8 }}>
              {draftEvents.length} event{draftEvents.length !== 1 ? "s" : ""}
            </span>
          </h2>
          <button onClick={addEvent} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}>
            <Plus size={13} /> Add Event
          </button>
        </div>

        {draftEvents.length === 0 && (
          <p className="hint" style={{ fontSize: 13, margin: 0 }}>
            No decision events yet. Add at least one event where referees must make a call.
          </p>
        )}

        {draftEvents.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: "var(--muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  <th style={{ textAlign: "left", padding: "0 6px 8px 0", fontWeight: 700 }}>Time</th>
                  <th style={{ textAlign: "left", padding: "0 4px 8px", fontWeight: 700 }}>Window (s)</th>
                  <th style={{ textAlign: "left", padding: "0 4px 8px", fontWeight: 700 }}>Correct Outcome</th>
                  {showCallField && <th style={{ textAlign: "left", padding: "0 4px 8px", fontWeight: 700 }}>Correct Call</th>}
                  <th style={{ textAlign: "left", padding: "0 4px 8px", fontWeight: 700 }}>Explanation / Notes</th>
                  <th style={{ width: 36 }} />
                </tr>
              </thead>
              <tbody>
                {draftEvents.map((ev, i) => (
                  <EventRow
                    key={ev.tempId}
                    event={ev}
                    index={i}
                    showCallField={showCallField}
                    onChange={updateEventAt}
                    onDelete={deleteEventAt}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Save */}
      {formError && (
        <p className="danger-text" style={{ marginBottom: 10 }}>{formError}</p>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setView("list")}>Cancel</button>
        <button className="primary" onClick={handleSave} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Save size={14} /> {saving ? "Saving…" : editId ? "Save Changes" : "Create Simulator"}
        </button>
      </div>
    </div>
  );
}
