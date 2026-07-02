"use client";

import { useState } from "react";
import type { RefEvalSession } from "@/lib/types/auth";
import type { ViewOnlyGame } from "@/lib/types/viewOnlyGames";
import { ViewerGamePlayer } from "@/components/viewer/ViewerGamePlayer";

interface Props {
  session: RefEvalSession;
  games: ViewOnlyGame[];
  loading: boolean;
  error: string;
}

export function ViewerScreen({ session, games, loading, error }: Props) {
  const [activeGame, setActiveGame] = useState<ViewOnlyGame | null>(null);

  if (activeGame) {
    return (
      <ViewerGamePlayer
        game={activeGame}
        onBack={() => setActiveGame(null)}
      />
    );
  }

  return (
    <div className="layout" style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px" }}>
      <div style={{ marginBottom: 24 }}>
        <p className="eyebrow">View-Only Games</p>
        <h1 style={{ margin: "4px 0 6px" }}>
          {session.activeOrganisation?.name || "Your Games"}
        </h1>
        <p className="hint">Learning content assigned to you.</p>
      </div>

      {loading && <p className="hint">Loading games…</p>}
      {error && <p className="danger-text">{error}</p>}

      {!loading && !error && games.length === 0 && (
        <div
          style={{
            padding: "40px 24px",
            textAlign: "center",
            background: "var(--panel)",
            borderRadius: 8,
            border: "1px solid var(--border)",
          }}
        >
          <p style={{ margin: 0, fontWeight: 700 }}>No learning content has been assigned to you yet.</p>
          <p className="hint" style={{ margin: "8px 0 0" }}>
            Your educator or administrator will assign content when it is ready.
          </p>
        </div>
      )}

      {!loading && games.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {games.map(game => (
            <button
              key={game.id}
              onClick={() => setActiveGame(game)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "16px 20px",
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                cursor: "pointer",
                textAlign: "left",
                color: "var(--text)",
                width: "100%",
              }}
            >
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{game.title}</p>
                {game.gameDate && (
                  <p className="hint" style={{ margin: "3px 0 0", fontSize: 13 }}>
                    {new Date(game.gameDate).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
              <span
                className="chip"
                style={{ flexShrink: 0, padding: "4px 12px", fontSize: 12 }}
              >
                Watch ▶
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
