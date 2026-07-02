"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Playlist, PlaylistItem } from "@/lib/types/playlists";

function mapItem(row: any): PlaylistItem {
  return {
    id: row.id,
    playlistId: row.playlist_id,
    reviewId: row.review_id,
    tagId: row.tag_id,
    position: row.position,
    createdAt: row.created_at,
    creatorNote: row.creator_note ?? null,
  };
}

function mapPlaylist(row: any): Playlist {
  const items: PlaylistItem[] = (row.clip_playlist_items || []).map(mapItem);
  items.sort((a, b) => a.position - b.position);
  return {
    id: row.id,
    organisationId: row.organisation_id,
    title: row.title,
    description: row.description ?? null,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
  };
}

export function usePlaylists(orgId: string, userId: string) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: err } = await getSupabaseClient()
        .from("clip_playlists")
        .select("*, clip_playlist_items(*)")
        .eq("organisation_id", orgId)
        .order("updated_at", { ascending: false });
      if (err) throw err;
      setPlaylists((data || []).map(mapPlaylist));
    } catch (e: any) {
      setError(e?.message || "Failed to load playlists");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  async function createPlaylist(
    title: string,
    description: string,
    clips: Array<{ reviewId: string; tagId: string }>
  ): Promise<string> {
    const { data: pl, error: plErr } = await getSupabaseClient()
      .from("clip_playlists")
      .insert({ organisation_id: orgId, title, description: description.trim() || null, created_by: userId })
      .select("id")
      .single();
    if (plErr || !pl) throw plErr || new Error("Failed to create playlist");

    if (clips.length > 0) {
      const items = clips.map((c, i) => ({
        playlist_id: pl.id,
        review_id: c.reviewId,
        tag_id: c.tagId,
        position: i,
      }));
      const { error: itemErr } = await getSupabaseClient()
        .from("clip_playlist_items")
        .insert(items);
      if (itemErr) throw itemErr;
    }

    await load();
    return pl.id;
  }

  async function updatePlaylist(id: string, title: string, description: string) {
    const { error: err } = await getSupabaseClient()
      .from("clip_playlists")
      .update({ title, description: description.trim() || null })
      .eq("id", id);
    if (err) throw err;
    await load();
  }

  async function deletePlaylist(id: string) {
    const { error: err } = await getSupabaseClient()
      .from("clip_playlists")
      .delete()
      .eq("id", id);
    if (err) throw err;
    await load();
  }

  async function updateItemPositions(items: PlaylistItem[]) {
    const supabase = getSupabaseClient();
    for (let i = 0; i < items.length; i++) {
      await supabase
        .from("clip_playlist_items")
        .update({ position: i })
        .eq("id", items[i].id);
    }
    await load();
  }

  async function removeItem(itemId: string) {
    const { error: err } = await getSupabaseClient()
      .from("clip_playlist_items")
      .delete()
      .eq("id", itemId);
    if (err) throw err;
    await load();
  }

  async function updateItemNote(itemId: string, note: string | null) {
    const { error: err } = await getSupabaseClient()
      .from("clip_playlist_items")
      .update({ creator_note: note })
      .eq("id", itemId);
    if (err) throw err;
    await load();
  }

  return {
    playlists,
    loading,
    error,
    load,
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    updateItemPositions,
    removeItem,
    updateItemNote,
  };
}
