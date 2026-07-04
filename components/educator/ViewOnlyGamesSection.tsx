"use client";

import { useState } from "react";
import { Plus, Trash2, Edit2, Eye, PlayCircle } from "lucide-react";
import type { RefEvalSession, Role } from "@/lib/types/auth";
import type { ViewOnlyGame, LearningCategory } from "@/lib/types/viewOnlyGames";
import { LEARNING_CATEGORIES } from "@/lib/types/viewOnlyGames";
import type { MemberRecord } from "@/lib/types/members";
import { getYouTubeId, isDirectVideoUrl } from "@/lib/utils/video";
import { ViewerGamePlayer } from "@/components/viewer/ViewerGamePlayer";

const ROLE_LABELS: Record<Role, string> = {
  viewer: "Viewer",
  referee: "Referee",
  educator: "Educator",
  admin: "Admin",
  super_admin: "Super Admin",
};

interface Props {
  session: RefEvalSession;
  games: ViewOnlyGame[];
  loading: boolean;
  error: string;
  allMembers: MemberRecord[];
  canManage: boolean;
  onCreate: (title: string, category: LearningCategory, gameDate: string, videoUrl: string, assignedIds: string[]) => Promise<unknown>;
  onUpdate: (id: string, title: string, category: LearningCategory, gameDate: string, videoUrl: string, assignedIds: string[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function videoLabel(url: string) {
  if (!url) return "No video";
  if (getYouTubeId(url)) return "YouTube";
  if (isDirectVideoUrl(url)) return "Direct video";
  return "Unsupported URL";
}

function GameModal({
  initial,
  allMembers,
  currentUserId,
  onSave,
  onClose,
}: {
  initial: Partial<ViewOnlyGame> | null;
  allMembers: MemberRecord[];
  currentUserId: string;
  onSave: (title: string, category: LearningCategory, gameDate: string, videoUrl: string, assignedIds: string[]) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title || "");
  const [category, setCategory] = useState<LearningCategory>(initial?.category || "Game");
  const [gameDate, setGameDate] = useState(initial?.gameDate || "");
  const [videoUrl, setVideoUrl] = useState(initial?.videoUrl || "");
  const [selectedIds, setSelectedIds] = useState<string[]>(initial?.assignedViewerIds || []);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function toggleMember(id: string) {
    setSelectedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  }

  function selectAll() { setSelectedIds(allMembers.map(m => m.id)); }
  function clearAll() { setSelectedIds([]); }

  async function handleSave() {
    if (!title.trim()) { setErr("Title is required."); return; }
    setSaving(true);
    setErr("");
    try {
      await onSave(title.trim(), category, gameDate, videoUrl.trim(), selectedIds);
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  const isEditing = !!initial?.id;
  const urlStatus = videoUrl.trim()
    ? getYouTubeId(videoUrl) ? "✓ YouTube" : isDirectVideoUrl(videoUrl) ? "✓ Direct video" : "⚠ Unsupported URL — users will see a compatibility notice"
    : "";

  // Sort: non-self first, then by name
  const sorted = [...allMembers].sort((a, b) => {
    if (a.id === currentUserId) return 1;
    if (b.id === currentUserId) return -1;
    return (a.name || a.email).localeCompare(b.name || b.email);
  });

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ maxWidth: 580 }}>
        <div className="modal-title">
          <div>
            <p className="eyebrow">{isEditing ? "Edit" : "New"} Learning Content</p>
            <h1 style={{ fontSize: 20, margin: 0 }}>
              {isEditing ? "Update content details" : "Create learning content"}
            </h1>
          </div>
          <button onClick={onClose}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
          <label>
            Title *
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. NBL Round 5 — Wildcats vs Kings"
              autoFocus
            />
          </label>

          <div style={{ display: "flex", gap: 12 }}>
            <label style={{ flex: 1 }}>
              Category
              <select
                value={category}
                onChange={e => setCategory(e.target.value as LearningCategory)}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13 }}
              >
                {LEARNING_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label style={{ flex: 1 }}>
              Date <span className="hint">(optional)</span>
              <input type="date" value={gameDate} onChange={e => setGameDate(e.target.value)} />
            </label>
          </div>

          <div>
            <label>
              Video URL <span className="hint">(YouTube or direct MP4)</span>
              <input
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... or direct .mp4 URL"
              />
            </label>
            {urlStatus && (
              <p className="hint" style={{ margin: "4px 0 0", fontSize: 12, color: urlStatus.startsWith("⚠") ? "rgba(253,186,116,.9)" : undefined }}>
                {urlStatus}
              </p>
            )}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13 }}>
                Assign to members{" "}
                <span className="hint" style={{ fontWeight: 400 }}>
                  ({selectedIds.length} selected)
                </span>
              </p>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" style={{ fontSize: 11, padding: "2px 8px" }} onClick={selectAll}>All</button>
                <button type="button" style={{ fontSize: 11, padding: "2px 8px" }} onClick={clearAll}>None</button>
              </div>
            </div>
            {allMembers.length === 0 ? (
              <p className="hint" style={{ fontSize: 13 }}>No other members in this organisation.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 220, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 4px" }}>
                {sorted.map(m => {
                  const selected = selectedIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMember(m.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "none",
                        background: selected ? "var(--accent)" : "transparent",
                        color: "var(--text)",
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: 13,
                      }}
                    >
                      <span style={{ fontWeight: selected ? 600 : 400 }}>
                        {m.name || m.email}
                        {m.id === currentUserId && <span className="hint" style={{ marginLeft: 6, fontSize: 11 }}>(you)</span>}
                      </span>
                      <span className={`role-badge role-${m.role}`} style={{ fontSize: 10 }}>
                        {ROLE_LABELS[m.role]}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {err && <p className="danger-text">{err}</p>}
        </div>

        <div className="action-row" style={{ marginTop: 20 }}>
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : isEditing ? "Save Changes" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ViewOnlyGamesSection({
  session,
  games,
  loading,
  error,
  allMembers,
  canManage,
  onCreate,
  onUpdate,
  onDelete,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [editingGame, setEditingGame] = useState<ViewOnlyGame | null>(null);
  const [openGame, setOpenGame] = useState<ViewOnlyGame | null>(null);

  if (openGame) {
    return (
      <ViewerGamePlayer
        game={openGame}
        onBack={() => setOpenGame(null)}
      />
    );
  }

  function handleDelete(game: ViewOnlyGame) {
    if (!confirm(`Delete "${game.title}"? Assigned users will lose access immediately.`)) return;
    onDelete(game.id);
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Eye size={16} style={{ color: "var(--muted)" }} />
          <h2 style={{ margin: 0, fontSize: 16 }}>Learning Content</h2>
          <span className="chip" style={{ fontSize: 11 }}>{games.length}</span>
        </div>
        {canManage && (
          <button
            className="primary"
            style={{ fontSize: 12, padding: "5px 12px" }}
            onClick={() => { setEditingGame(null); setShowModal(true); }}
          >
            <Plus size={13} /> New Content
          </button>
        )}
      </div>

      {loading && <div className="loading-state"><span className="loading-spinner" />Loading…</div>}
      {error && <p className="danger-text" style={{ fontSize: 13 }}>{error}</p>}

      {!loading && games.length === 0 && (
        <p className="hint" style={{ fontSize: 13 }}>
          {canManage
            ? "No learning content yet. Create content and assign it to members."
            : "No learning content has been assigned to you yet."}
        </p>
      )}

      {games.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600 }}>Title</th>
              <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600 }}>Category</th>
              <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600 }}>Date</th>
              {canManage && <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600 }}>Video</th>}
              {canManage && <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600 }}>Assigned</th>}
              <th style={{ padding: "6px 8px" }} />
            </tr>
          </thead>
          <tbody>
            {games.map(g => (
              <tr key={g.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "8px 8px", fontWeight: 600 }}>{g.title}</td>
                <td style={{ padding: "8px 8px" }}>
                  <span className="chip" style={{ fontSize: 11 }}>{g.category}</span>
                </td>
                <td style={{ padding: "8px 8px", color: "var(--muted)" }}>
                  {g.gameDate
                    ? new Date(g.gameDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
                    : "—"}
                </td>
                {canManage && (
                  <td style={{ padding: "8px 8px", color: "var(--muted)" }}>
                    {videoLabel(g.videoUrl)}
                  </td>
                )}
                {canManage && (
                  <td style={{ padding: "8px 8px", color: "var(--muted)" }}>
                    {g.assignedViewerIds.length === 0 ? "None" : `${g.assignedViewerIds.length} member${g.assignedViewerIds.length !== 1 ? "s" : ""}`}
                  </td>
                )}
                <td style={{ padding: "8px 8px", textAlign: "right", whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <button
                      style={{ fontSize: 12, padding: "3px 10px" }}
                      onClick={() => setOpenGame(g)}
                    >
                      <PlayCircle size={12} /> Open
                    </button>
                    {canManage && (
                      <>
                        <button
                          style={{ fontSize: 12, padding: "3px 10px" }}
                          onClick={() => { setEditingGame(g); setShowModal(true); }}
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          className="danger"
                          style={{ fontSize: 12, padding: "3px 10px" }}
                          onClick={() => handleDelete(g)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showModal && (
        <GameModal
          initial={editingGame}
          allMembers={allMembers}
          currentUserId={session.user.id}
          onClose={() => { setShowModal(false); setEditingGame(null); }}
          onSave={async (title, category, gameDate, videoUrl, assignedIds) => {
            if (editingGame) {
              await onUpdate(editingGame.id, title, category, gameDate, videoUrl, assignedIds);
            } else {
              await onCreate(title, category, gameDate, videoUrl, assignedIds);
            }
          }}
        />
      )}
    </div>
  );
}
