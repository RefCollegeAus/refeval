"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Group, GroupMember, CreateGroupInput, UpdateGroupInput } from "@/lib/types/groups";

function mapMember(row: any): GroupMember {
  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    createdAt: row.created_at,
  };
}

function mapGroup(row: any): Group {
  return {
    id: row.id,
    organisationId: row.organisation_id,
    name: row.name,
    description: row.description ?? null,
    colour: row.colour ?? "#3b82f6",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    members: Array.isArray(row.group_members) ? row.group_members.map(mapMember) : [],
  };
}

export function useGroups(orgId: string, currentUserId: string) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: err } = await getSupabaseClient()
        .from("groups")
        .select("*, group_members(*)")
        .eq("organisation_id", orgId)
        .order("name", { ascending: true });
      if (err) throw err;
      setGroups((data || []).map(mapGroup));
    } catch (e: any) {
      setError(e?.message || "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  async function createGroup(input: CreateGroupInput): Promise<string> {
    const supabase = getSupabaseClient();
    const { data: row, error: insErr } = await supabase
      .from("groups")
      .insert({
        organisation_id: orgId,
        name: input.name.trim(),
        description: input.description.trim() || null,
        colour: input.colour,
      })
      .select("id")
      .single();
    if (insErr || !row) throw insErr || new Error("Failed to create group");

    if (input.memberIds.length > 0) {
      const { error: memErr } = await supabase
        .from("group_members")
        .insert(input.memberIds.map(uid => ({ group_id: row.id, user_id: uid })));
      if (memErr) throw memErr;
    }

    await load();
    return row.id;
  }

  async function updateGroup(id: string, input: UpdateGroupInput): Promise<void> {
    const { error: err } = await getSupabaseClient()
      .from("groups")
      .update({
        name: input.name.trim(),
        description: input.description.trim() || null,
        colour: input.colour,
      })
      .eq("id", id);
    if (err) throw err;
    await load();
  }

  async function deleteGroup(id: string): Promise<void> {
    const { error: err } = await getSupabaseClient()
      .from("groups")
      .delete()
      .eq("id", id);
    if (err) throw err;
    await load();
  }

  async function addMembersToGroup(groupId: string, userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;
    // upsert ignores the unique constraint conflict
    const { error: err } = await getSupabaseClient()
      .from("group_members")
      .upsert(
        userIds.map(uid => ({ group_id: groupId, user_id: uid })),
        { onConflict: "group_id,user_id", ignoreDuplicates: true }
      );
    if (err) throw err;
    await load();
  }

  async function removeMemberFromGroup(groupMemberId: string): Promise<void> {
    const { error: err } = await getSupabaseClient()
      .from("group_members")
      .delete()
      .eq("id", groupMemberId);
    if (err) throw err;
    await load();
  }

  async function setGroupMembers(groupId: string, userIds: string[]): Promise<void> {
    const supabase = getSupabaseClient();
    // Delete all existing members for this group then re-insert
    const { error: delErr } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId);
    if (delErr) throw delErr;

    if (userIds.length > 0) {
      const { error: insErr } = await supabase
        .from("group_members")
        .insert(userIds.map(uid => ({ group_id: groupId, user_id: uid })));
      if (insErr) throw insErr;
    }
    await load();
  }

  return {
    groups,
    loading,
    error,
    load,
    createGroup,
    updateGroup,
    deleteGroup,
    addMembersToGroup,
    removeMemberFromGroup,
    setGroupMembers,
  };
}
