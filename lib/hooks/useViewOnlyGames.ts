"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { ViewOnlyGame, LearningCategory } from "@/lib/types/viewOnlyGames";
import type { RefEvalSession } from "@/lib/types/auth";

const MANAGEMENT_ROLES = new Set(["educator", "admin", "super_admin"]);

export function useViewOnlyGames(session: RefEvalSession | null) {
  const [games, setGames] = useState<ViewOnlyGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const orgId = session?.activeOrganisation?.id || "";
  const userId = session?.user.id || "";
  const canManage = MANAGEMENT_ROLES.has(session?.activeRole || "");

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    try {
      // RLS enforces visibility: assigned users or org managers
      const { data: gameRows, error: gErr } = await getSupabaseClient()
        .from("view_only_games")
        .select("*")
        .order("created_at", { ascending: false });

      if (gErr) throw gErr;
      if (!gameRows || gameRows.length === 0) { setGames([]); return; }

      // Fetch assignment lists for all visible games
      const gameIds = gameRows.map((g: any) => g.id);
      const assignmentMap: Record<string, string[]> = {};
      const { data: aRows } = await getSupabaseClient()
        .from("view_only_game_assignments")
        .select("game_id, viewer_user_id")
        .in("game_id", gameIds);
      for (const a of aRows || []) {
        if (!assignmentMap[a.game_id]) assignmentMap[a.game_id] = [];
        assignmentMap[a.game_id].push(a.viewer_user_id);
      }

      setGames(
        gameRows.map((g: any) => ({
          id: g.id,
          organisationId: g.organisation_id,
          title: g.title,
          category: (g.category as LearningCategory) || "Game",
          gameDate: g.game_date || null,
          videoUrl: g.video_url || "",
          createdBy: g.created_by,
          createdAt: g.created_at,
          assignedViewerIds: assignmentMap[g.id] || [],
        }))
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load content.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  async function createGame(
    title: string,
    category: LearningCategory,
    gameDate: string,
    videoUrl: string,
    assignedIds: string[]
  ): Promise<ViewOnlyGame | null> {
    if (!orgId || !userId) return null;
    const { data, error: err } = await getSupabaseClient()
      .from("view_only_games")
      .insert({ organisation_id: orgId, title, category, game_date: gameDate || null, video_url: videoUrl, created_by: userId })
      .select()
      .single();
    if (err || !data) { setError(err?.message || "Failed to create."); return null; }

    if (assignedIds.length > 0) {
      await getSupabaseClient()
        .from("view_only_game_assignments")
        .insert(assignedIds.map(uid => ({ game_id: data.id, viewer_user_id: uid, assigned_by: userId })));
    }

    await load();
    return {
      id: data.id, organisationId: data.organisation_id, title: data.title,
      category: data.category as LearningCategory, gameDate: data.game_date || null,
      videoUrl: data.video_url, createdBy: data.created_by, createdAt: data.created_at,
      assignedViewerIds: assignedIds,
    };
  }

  async function updateGame(
    id: string,
    title: string,
    category: LearningCategory,
    gameDate: string,
    videoUrl: string,
    assignedIds: string[]
  ) {
    const { error: err } = await getSupabaseClient()
      .from("view_only_games")
      .update({ title, category, game_date: gameDate || null, video_url: videoUrl })
      .eq("id", id);
    if (err) { setError(err.message); return; }

    await getSupabaseClient().from("view_only_game_assignments").delete().eq("game_id", id);
    if (assignedIds.length > 0) {
      await getSupabaseClient()
        .from("view_only_game_assignments")
        .insert(assignedIds.map(uid => ({ game_id: id, viewer_user_id: uid, assigned_by: userId })));
    }
    await load();
  }

  async function deleteGame(id: string) {
    const { error: err } = await getSupabaseClient().from("view_only_games").delete().eq("id", id);
    if (err) { setError(err.message); return; }
    setGames(g => g.filter(x => x.id !== id));
  }

  return { games, loading, error, load, createGame, updateGame, deleteGame, canManage };
}
