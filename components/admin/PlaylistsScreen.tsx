"use client";

import { useState, useMemo } from "react";
import { ListVideo, Trash2, Eye, Search, ArrowUpDown, ChevronLeft, X } from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";
import type { Playlist } from "@/lib/types/playlists";
import type { MemberRecord } from "@/lib/types/members";
import type { Assignment } from "@/lib/types/assignments";

interface Props {
  session: RefEvalSession;
  playlists: Playlist[];
  loading: boolean;
  error: string;
  members: MemberRecord[];
  assignments?: Assignment[];
  onViewPlaylist: (id: string) => void;
  onDeletePlaylist: (id: string) => Promise<void>;
  onBack: () => void;
  canDelete?: boolean;
}

type SortKey = "title" | "creator" | "clips" | "assignments" | "created";

function creatorName(userId: string | null, members: MemberRecord[]): string {
  if (!userId) return "—";
  const m = members.find(m => m.id === userId);
  return m?.name || m?.email || "Unknown";
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export function PlaylistsScreen({
  session, playlists, loading, error, members, assignments = [],
  onViewPlaylist, onDeletePlaylist, onBack, canDelete = true,
}: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [query, setQuery]       = useState("");
  const [sort, setSort]         = useState<SortKey>("created");
  const [sortAsc, setSortAsc]   = useState(false);

  async function handleDelete(pl: Playlist) {
    if (!confirm(`Delete "${pl.title}"? This cannot be undone.`)) return;
    setDeleting(pl.id);
    try { await onDeletePlaylist(pl.id); } finally { setDeleting(null); }
  }

  // Assignment count per playlist
  const assignmentCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assignments) {
      map.set(a.playlistId, (map.get(a.playlistId) ?? 0) + 1);
    }
    return map;
  }, [assignments]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = q
      ? playlists.filter(pl =>
          pl.title.toLowerCase().includes(q) ||
          (pl.description ?? "").toLowerCase().includes(q) ||
          creatorName(pl.createdBy, members).toLowerCase().includes(q)
        )
      : [...playlists];

    out.sort((a, b) => {
      let cmp = 0;
      if      (sort === "title")       cmp = a.title.localeCompare(b.title);
      else if (sort === "creator")     cmp = creatorName(a.createdBy, members).localeCompare(creatorName(b.createdBy, members));
      else if (sort === "clips")       cmp = a.items.length - b.items.length;
      else if (sort === "assignments") cmp = (assignmentCounts.get(a.id) ?? 0) - (assignmentCounts.get(b.id) ?? 0);
      else if (sort === "created")     cmp = a.createdAt.localeCompare(b.createdAt);
      return sortAsc ? cmp : -cmp;
    });
    return out;
  }, [playlists, query, members, sort, sortAsc, assignmentCounts]);

  function handleSort(key: SortKey) {
    if (sort === key) { setSortAsc(v => !v); return; }
    setSort(key);
    setSortAsc(key === "title" || key === "creator");
  }

  function SortTh({ col, label, center }: { col: SortKey; label: string; center?: boolean }) {
    const active = sort === col;
    return (
      <th
        style={{ textAlign: center ? "center" : "left", padding: "8px 10px", fontWeight: 600, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
        onClick={() => handleSort(col)}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {label}
          <ArrowUpDown size={11} style={{ opacity: active ? 1 : 0.3, color: active ? "var(--accent)" : undefined }} />
        </span>
      </th>
    );
  }

  return (
    <div style={{ padding: "20px 20px 60px", boxSizing: "border-box" }}>
      <div className="panel">

        {/* Header */}
        <div className="table-head" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ListVideo size={20} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Organisation</p>
              <h1 style={{ margin: 0, fontSize: 22 }}>Playlists</h1>
              <p className="hint" style={{ margin: "2px 0 0" }}>
                Curated clip playlists for {session.activeOrganisation?.name}
              </p>
            </div>
          </div>
          <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <ChevronLeft size={15} /> Back
          </button>
        </div>

        {loading && <p className="hint">Loading playlists…</p>}
        {error && <p className="danger-text">{error}</p>}

        {/* Empty state — no playlists at all */}
        {!loading && playlists.length === 0 && (
          <div className="empty-state">
            <ListVideo size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
            <p style={{ margin: 0, fontWeight: 700 }}>No playlists yet</p>
            <p className="hint" style={{ margin: "6px 0 0", fontSize: 13 }}>
              Select clips in the Clip Library and create your first playlist.
            </p>
          </div>
        )}

        {/* Search bar */}
        {!loading && playlists.length > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
            <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 380 }}>
              <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by title, description or creator…"
                style={{ paddingLeft: 28, width: "100%", boxSizing: "border-box", fontSize: 13 }}
              />
            </div>
            {query && (
              <button onClick={() => setQuery("")} style={{ border: "none", background: "none", padding: "4px 6px", cursor: "pointer" }}>
                <X size={13} />
              </button>
            )}
            <span style={{ fontSize: 12, color: "var(--muted)", whiteSpace: "nowrap", marginLeft: "auto" }}>
              {filtered.length} of {playlists.length} playlist{playlists.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Empty state — search returns nothing */}
        {!loading && playlists.length > 0 && filtered.length === 0 && (
          <div className="empty-state">
            <Search size={28} style={{ opacity: 0.3, marginBottom: 10 }} />
            <p style={{ margin: 0, fontWeight: 700 }}>No playlists match your search</p>
            <button style={{ marginTop: 10, fontSize: 13 }} onClick={() => setQuery("")}>Clear search</button>
          </div>
        )}

        {/* Table */}
        {filtered.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <SortTh col="title"       label="Title" />
                  <th style={{ textAlign: "left", padding: "8px 10px", fontWeight: 600 }}>Description</th>
                  <SortTh col="clips"       label="Clips"       center />
                  <SortTh col="assignments" label="Assignments" center />
                  <SortTh col="creator"     label="Created by" />
                  <SortTh col="created"     label="Created" />
                  <th style={{ padding: "8px 10px" }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map(pl => {
                  const aCount = assignmentCounts.get(pl.id) ?? 0;
                  return (
                    <tr key={pl.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 10px", maxWidth: 220 }}>
                        <button
                          onClick={() => onViewPlaylist(pl.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--accent)", fontWeight: 700, textAlign: "left", fontSize: 13 }}
                        >
                          {pl.title}
                        </button>
                      </td>
                      <td style={{ padding: "10px 10px", color: "var(--muted)", maxWidth: 240 }}>
                        {pl.description ? (
                          <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={pl.description}>
                            {pl.description}
                          </span>
                        ) : <span className="hint">—</span>}
                      </td>
                      <td style={{ padding: "10px 10px", textAlign: "center" }}>
                        <span className="chip" style={{ fontSize: 11 }}>{pl.items.length}</span>
                      </td>
                      <td style={{ padding: "10px 10px", textAlign: "center" }}>
                        {aCount > 0 ? (
                          <span className="chip" style={{ fontSize: 11 }}>{aCount}</span>
                        ) : <span className="hint">—</span>}
                      </td>
                      <td style={{ padding: "10px 10px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {creatorName(pl.createdBy, members)}
                      </td>
                      <td style={{ padding: "10px 10px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                        {fmt(pl.createdAt)}
                      </td>
                      <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                          <button
                            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "4px 10px" }}
                            onClick={() => onViewPlaylist(pl.id)}
                          >
                            <Eye size={12} /> View
                          </button>
                          {canDelete && (
                            <button
                              className="danger"
                              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "4px 10px" }}
                              onClick={() => handleDelete(pl)}
                              disabled={deleting === pl.id}
                            >
                              <Trash2 size={12} /> {deleting === pl.id ? "…" : "Delete"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
