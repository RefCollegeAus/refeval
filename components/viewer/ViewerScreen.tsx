"use client";

import { useState } from "react";
import type { RefEvalSession } from "@/lib/types/auth";
import type { ViewOnlyGame } from "@/lib/types/viewOnlyGames";
import { ViewerGamePlayer } from "@/components/viewer/ViewerGamePlayer";
import { PageFrame } from "@/components/shell/PageFrame";
import { Card, EmptyState, Spinner } from "@/components/ui";

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
    <PageFrame
      eyebrow="View-Only Games"
      title={session.activeOrganisation?.name || "Your Games"}
      description="Learning content assigned to you."
      className="mx-auto max-w-[800px] !p-0"
    >
      {loading && (
        <div className="flex items-center gap-2 py-3.5 text-[13px] text-muted">
          <Spinner size={16} /> Loading games…
        </div>
      )}
      {error && <p className="danger-text">{error}</p>}

      {!loading && !error && games.length === 0 && (
        <EmptyState
          title="No learning content has been assigned to you yet."
          description="Your educator or administrator will assign content when it is ready."
        />
      )}

      {!loading && games.length > 0 && (
        <div className="grid gap-3">
          {games.map(game => (
            <Card key={game.id} className="!p-0 overflow-hidden">
              <button
                onClick={() => setActiveGame(game)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-text"
              >
                <div>
                  <p className="m-0 text-[15px] font-bold">{game.title}</p>
                  {game.gameDate && (
                    <p className="hint mt-[3px]">
                      {new Date(game.gameDate).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
                <span className="chip shrink-0 px-3 py-1 text-xs">
                  Watch ▶
                </span>
              </button>
            </Card>
          ))}
        </div>
      )}
    </PageFrame>
  );
}
