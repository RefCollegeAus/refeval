"use client";

import { useState } from "react";
import { ListVideo, Trash2, Eye } from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";
import type { Playlist } from "@/lib/types/playlists";
import type { MemberRecord } from "@/lib/types/members";

interface Props {
  session: RefEvalSession;
  playlists: Playlist[];
  loading: boolean;
  error: string;
  members: MemberRecord[];
  onViewPlaylist: (id: string) => void;
  onDeletePlaylist: (id: string) => Promise<void>;
  onBack: () => void;
  canDelete?: boolean;
}

function creatorName(userId: string | null, members: MemberRecord[]): string {
  if (!userId) return "—";
  const m = members.find(m => m.id === userId);
  return m?.name || m?.email || "Unknown";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export function PlaylistsScreen({ session, playlists, loading, error, members, onViewPlaylist, onDeletePlaylist, onBack, canDelete = true }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(pl: Playlist) {
    if (!confirm(`Delete "${pl.title}"? This cannot be undone.`)) return;
    setDeleting(pl.id);
    try {
      await onDeletePlaylist(pl.id);
    } finally {
      setDeleting(null);
    }
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
          <button onClick={onBack}>← Back</button>
        </div>

        {/* States */}
        {loading && <p className="hint">Loading playlists…</p>}
        {error && <p className="danger-text">{error}</p>}

        {!loading && playlists.length === 0 && (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--muted)" }}>
            <ListVideo size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ margin: 0, fontWeight: 700 }}>No playlists yet</p>
            <p className="hint" style={{ margin: "6px 0 0" }}>
              Select clips in the Clip Library and create your first playlist.
            </p>
          </div>
        )}

        {/* Playlist table */}
        {playlists.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Title</th>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Description</th>
                  <th style={{ textAlign: "center", padding: "6px 10px", fontWeight: 600 }}>Clips</th>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Created by</th>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Created</th>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600 }}>Updated</th>
                  <th style={{ padding: "6px 10px" }} />
                </tr>
              </thead>
              <tbody>
                {playlists.map(pl => (
                  <tr key={pl.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "10px 10px", fontWeight: 700, maxWidth: 220 }}>
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
                      ) : "—"}
                    </td>
                    <td style={{ padding: "10px 10px", textAlign: "center" }}>
                      <span className="chip" style={{ fontSize: 11 }}>{pl.items.length}</span>
                    </td>
                    <td style={{ padding: "10px 10px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {creatorName(pl.createdBy, members)}
                    </td>
                    <td style={{ padding: "10px 10px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {formatDate(pl.createdAt)}
                    </td>
                    <td style={{ padding: "10px 10px", color: "var(--muted)", whiteSpace: "nowrap" }}>
                      {formatDate(pl.updatedAt)}
                    </td>
                    <td style={{ padding: "10px 10px", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "3px 10px" }}
                          onClick={() => onViewPlaylist(pl.id)}
                        >
                          <Eye size={12} /> View
                        </button>
                        {canDelete && (
                          <button
                            className="danger"
                            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, padding: "3px 10px" }}
                            onClick={() => handleDelete(pl)}
                            disabled={deleting === pl.id}
                          >
                            <Trash2 size={12} /> {deleting === pl.id ? "…" : "Delete"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
