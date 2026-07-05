"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Assignment, AssignmentUser, AssignmentStatus, CreateAssignmentInput } from "@/lib/types/assignments";

function mapAssignmentUser(row: any): AssignmentUser {
  return {
    id: row.id,
    assignmentId: row.assignment_id,
    userId: row.user_id,
    status: row.status as AssignmentStatus,
    assignedAt: row.assigned_at,
    startedAt: row.started_at ?? null,
    completedAt: row.completed_at ?? null,
    watchedClipIds: Array.isArray(row.watched_clip_ids) ? (row.watched_clip_ids as string[]) : [],
  };
}

function mapAssignment(row: any): Assignment {
  return {
    id: row.id,
    organisationId: row.organisation_id,
    playlistId: row.playlist_id,
    assignedBy: row.assigned_by ?? null,
    title: row.title,
    instructions: row.instructions ?? null,
    dueDate: row.due_date ?? null,
    required: row.required,
    createdAt: row.created_at,
    assignmentUsers: Array.isArray(row.learning_assignment_users)
      ? row.learning_assignment_users.map(mapAssignmentUser)
      : [],
  };
}

export function useAssignments(orgId: string, currentUserId: string) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: err } = await getSupabaseClient()
        .from("learning_assignments")
        .select("*, learning_assignment_users(*)")
        .eq("organisation_id", orgId)
        .order("created_at", { ascending: false });
      if (err) throw err;
      setAssignments((data || []).map(mapAssignment));
    } catch (e: any) {
      setError(e?.message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  // Assignments where the current user is an assigned learner.
  // Deduplicated by playlistId — if the same playlist was assigned twice (e.g. via group
  // and individually), keep only the most recently created one to avoid duplicate cards.
  const myAssignments = useMemo(() => {
    const mine = assignments.filter(a => a.assignmentUsers.some(u => u.userId === currentUserId));
    const seen = new Map<string, typeof mine[number]>();
    for (const a of mine) {
      const existing = seen.get(a.playlistId);
      if (!existing || a.createdAt > existing.createdAt) {
        seen.set(a.playlistId, a);
      }
    }
    return Array.from(seen.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [assignments, currentUserId]);

  async function createAssignment(input: CreateAssignmentInput): Promise<string> {
    const supabase = getSupabaseClient();
    const { data: row, error: insErr } = await supabase
      .from("learning_assignments")
      .insert({
        organisation_id: orgId,
        playlist_id: input.playlistId,
        assigned_by: currentUserId || null,
        title: input.title,
        instructions: input.instructions || null,
        due_date: input.dueDate || null,
        required: input.required,
      })
      .select("id")
      .single();
    if (insErr) { console.error("[useAssignments] createAssignment insert error:", insErr); throw insErr; }
    if (!row) throw new Error("Assignment was not created — check Supabase RLS policies for learning_assignments.");

    const uniqueUserIds = Array.from(new Set(input.userIds));
    if (uniqueUserIds.length > 0) {
      const { error: usersErr } = await supabase
        .from("learning_assignment_users")
        .insert(uniqueUserIds.map(uid => ({ assignment_id: row.id, user_id: uid })));
      if (usersErr) { console.error("[useAssignments] addUsers error:", usersErr); throw usersErr; }
    }
    await load();
    return row.id;
  }

  async function updateAssignment(
    id: string,
    data: { title: string; instructions: string | null; dueDate: string | null; required: boolean },
  ): Promise<void> {
    const { error: err } = await getSupabaseClient()
      .from("learning_assignments")
      .update({
        title: data.title,
        instructions: data.instructions || null,
        due_date: data.dueDate || null,
        required: data.required,
      })
      .eq("id", id);
    if (err) throw err;
    await load();
  }

  async function deleteAssignment(id: string): Promise<void> {
    const { error: err } = await getSupabaseClient()
      .from("learning_assignments")
      .delete()
      .eq("id", id);
    if (err) throw err;
    await load();
  }

  async function addUsersToAssignment(
    assignmentId: string,
    userIds: string[],
  ): Promise<{ added: number; skipped: number }> {
    const assignment = assignments.find(a => a.id === assignmentId);
    const alreadyAssigned = new Set(assignment?.assignmentUsers.map(u => u.userId) ?? []);
    const unique = Array.from(new Set(userIds));
    const toAdd = unique.filter(id => !alreadyAssigned.has(id));
    const skipped = unique.length - toAdd.length;
    if (toAdd.length > 0) {
      const { error: err } = await getSupabaseClient()
        .from("learning_assignment_users")
        .insert(toAdd.map(uid => ({ assignment_id: assignmentId, user_id: uid })));
      if (err) throw err;
    }
    await load();
    return { added: toAdd.length, skipped };
  }

  async function removeUserFromAssignment(assignmentUserId: string): Promise<void> {
    const { error: err } = await getSupabaseClient()
      .from("learning_assignment_users")
      .delete()
      .eq("id", assignmentUserId);
    if (err) throw err;
    await load();
  }

  async function updateAssignmentUserStatus(
    assignmentUserId: string,
    status: AssignmentStatus,
  ): Promise<void> {
    const patch: Record<string, string | null> = { status };
    if (status === "Started")   { patch.started_at = new Date().toISOString(); }
    if (status === "Completed") { patch.completed_at = new Date().toISOString(); }
    if (status === "Assigned")  { patch.started_at = null; patch.completed_at = null; }
    const { error: err } = await getSupabaseClient()
      .from("learning_assignment_users")
      .update(patch)
      .eq("id", assignmentUserId);
    if (err) throw err;
    await load();
  }

  async function updateWatchedClips(
    assignmentUserId: string,
    itemIds: string[],
  ): Promise<void> {
    const { error: err } = await getSupabaseClient()
      .from("learning_assignment_users")
      .update({ watched_clip_ids: itemIds })
      .eq("id", assignmentUserId);
    if (err) throw err;
    // No full reload — the local watched state is managed in PlaylistDetailScreen.
    // A reload would re-fetch all assignments on every clip toggle, which is too expensive.
  }

  return {
    assignments,
    myAssignments,
    loading,
    error,
    load,
    createAssignment,
    updateAssignment,
    deleteAssignment,
    addUsersToAssignment,
    removeUserFromAssignment,
    updateAssignmentUserStatus,
    updateWatchedClips,
  };
}
