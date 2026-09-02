"use client";

import { useState } from "react";
import { Plus, Trash2, Edit2, Eye, PlayCircle, X } from "lucide-react";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { useModalA11y } from "@/lib/hooks/useModalA11y";
import type { RefEvalSession, Role } from "@/lib/types/auth";
import type { ViewOnlyGame, LearningCategory } from "@/lib/types/viewOnlyGames";
import { LEARNING_CATEGORIES } from "@/lib/types/viewOnlyGames";
import type { MemberRecord } from "@/lib/types/members";
import { getYouTubeId, isDirectVideoUrl } from "@/lib/utils/video";
import { ROLE_TONE } from "@/lib/utils/roleTone";
import { ViewerGamePlayer } from "@/components/viewer/ViewerGamePlayer";
import {
  Badge, Button, FormField, Input, Select, Spinner,
  Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow,
} from "@/components/ui";
import { cn } from "@/lib/utils/cn";

const ROLE_LABELS: Record<Role, string> = {
  viewer: "Viewer",
  referee: "Referee",
  educator: "Educator",
  admin: "Administrator",
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
  const dialogRef = useModalA11y<HTMLDivElement>(true, onClose);

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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Edit Learning Content" : "New Learning Content"}
        tabIndex={-1}
        className="flex max-h-[92vh] w-full max-w-[580px] flex-col rounded-2xl border border-border bg-panel p-5 shadow-xl focus:outline-none"
      >
        <div className="mb-2.5 flex shrink-0 items-start justify-between gap-3">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-accent">{isEditing ? "Edit" : "New"} Learning Content</p>
            <h1 className="m-0 text-xl">{isEditing ? "Update content details" : "Create learning content"}</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close" className="shrink-0 px-1.5">
            <X size={16} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto pt-1">
          <div className="mt-3 grid gap-3.5">
            <FormField label="Title" htmlFor="game-title" required>
              <Input
                id="game-title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. NBL Round 5 — Wildcats vs Kings"
                autoFocus
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Category" htmlFor="game-category">
                <Select id="game-category" value={category} onChange={e => setCategory(e.target.value as LearningCategory)}>
                  {LEARNING_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Date" htmlFor="game-date" hint="(optional)">
                <Input id="game-date" type="date" value={gameDate} onChange={e => setGameDate(e.target.value)} />
              </FormField>
            </div>

            <div>
              <FormField label="Video URL" htmlFor="game-video" hint="(YouTube or direct MP4)">
                <Input
                  id="game-video"
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or direct .mp4 URL"
                />
              </FormField>
              {urlStatus && (
                <p className={cn("mt-1 text-xs", urlStatus.startsWith("⚠") ? "text-orange-300" : "text-muted")}>
                  {urlStatus}
                </p>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="m-0 text-[13px] font-bold text-text">
                  Assign to members{" "}
                  <span className="font-normal text-muted">({selectedIds.length} selected)</span>
                </p>
                <div className="flex gap-1.5">
                  <Button type="button" variant="secondary" size="sm" onClick={selectAll}>All</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={clearAll}>None</Button>
                </div>
              </div>
              {allMembers.length === 0 ? (
                <p className="text-[13px] text-muted">No other members in this organisation.</p>
              ) : (
                <div className="flex max-h-[220px] flex-col gap-1 overflow-y-auto rounded-lg border border-border px-1 py-2">
                  {sorted.map(m => {
                    const selected = selectedIds.includes(m.id);
                    const tone = ROLE_TONE[m.role] ?? ROLE_TONE.viewer;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMember(m.id)}
                        className={cn(
                          "flex items-center justify-between rounded-md border-none px-2.5 py-1.5 text-left text-[13px] text-text",
                          selected ? "bg-accent" : "bg-transparent"
                        )}
                      >
                        <span className={cn(selected && "font-semibold")}>
                          {m.name || m.email}
                          {m.id === currentUserId && <span className="ml-1.5 text-[11px] text-muted">(you)</span>}
                        </span>
                        <Badge tone="neutral" className={tone.text}>
                          {ROLE_LABELS[m.role]}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {err && <p className="text-[13px] text-red-300">{err}</p>}
          </div>
        </div>

        <div className="mt-4 flex shrink-0 flex-wrap gap-2.5 border-t border-border pt-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : isEditing ? "Save Changes" : "Create"}
          </Button>
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
  const [confirmDeleteGame, setConfirmDeleteGame] = useState<ViewOnlyGame | null>(null);

  if (openGame) {
    return (
      <ViewerGamePlayer
        game={openGame}
        onBack={() => setOpenGame(null)}
      />
    );
  }

  function handleDelete(game: ViewOnlyGame) {
    setConfirmDeleteGame(game);
  }

  return (
    <>
    <div>
      <div className="mb-3 flex items-center justify-between border-t border-border pt-6">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-muted" />
          <h2 className="m-0 text-base">Learning Content</h2>
          <Badge tone="neutral">{games.length}</Badge>
        </div>
        {canManage && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => { setEditingGame(null); setShowModal(true); }}
          >
            <Plus size={13} /> New Content
          </Button>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-3.5 text-[13px] text-muted">
          <Spinner size={14} /> Loading…
        </div>
      )}
      {error && <p className="text-[13px] text-red-300">{error}</p>}

      {!loading && games.length === 0 && (
        <p className="text-[13px] text-muted">
          {canManage
            ? "No learning content yet. Create content and assign it to members."
            : "No learning content has been assigned to you yet."}
        </p>
      )}

      {games.length > 0 && (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Title</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell>Date</TableHeaderCell>
              {canManage && <TableHeaderCell>Video</TableHeaderCell>}
              {canManage && <TableHeaderCell>Assigned</TableHeaderCell>}
              <TableHeaderCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {games.map(g => (
              <TableRow key={g.id}>
                <TableCell data-label="Title" className="font-semibold">{g.title}</TableCell>
                <TableCell data-label="Category">
                  <Badge tone="neutral">{g.category}</Badge>
                </TableCell>
                <TableCell data-label="Date" className="text-muted">
                  {g.gameDate
                    ? new Date(g.gameDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
                    : "—"}
                </TableCell>
                {canManage && (
                  <TableCell data-label="Video" className="text-muted">
                    {videoLabel(g.videoUrl)}
                  </TableCell>
                )}
                {canManage && (
                  <TableCell data-label="Assigned" className="text-muted">
                    {g.assignedViewerIds.length === 0 ? "None" : `${g.assignedViewerIds.length} member${g.assignedViewerIds.length !== 1 ? "s" : ""}`}
                  </TableCell>
                )}
                <TableCell className="whitespace-nowrap text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button variant="secondary" size="sm" className="gap-1" onClick={() => setOpenGame(g)}>
                      <PlayCircle size={12} /> Open
                    </Button>
                    {canManage && (
                      <>
                        <Button variant="secondary" size="sm" className="gap-1" onClick={() => { setEditingGame(g); setShowModal(true); }}>
                          <Edit2 size={12} /> Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(g)}>
                          <Trash2 size={12} />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
    {confirmDeleteGame && (
      <ConfirmModal
        title={`Delete "${confirmDeleteGame.title}"?`}
        message="Assigned users will lose access immediately."
        confirmLabel="Delete"
        busyLabel="Deleting…"
        busy={false}
        onCancel={() => setConfirmDeleteGame(null)}
        onConfirm={() => { onDelete(confirmDeleteGame.id); setConfirmDeleteGame(null); }}
      />
    )}
    </>
  );
}
