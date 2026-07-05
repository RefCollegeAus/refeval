"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  DevGoalDef,
  DevGoalAssignment,
  RefereeGoal,
  RefereeGoalView,
  AssignGoalInput,
  GoalCategory,
  GoalPriority,
  GoalStatus,
} from "@/lib/types/developmentGoals";

// ── Row mappers ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDef(row: any): DevGoalDef {
  return {
    id: row.id,
    organisationId: row.organisation_id,
    title: row.title,
    description: row.description ?? "",
    category: row.category as GoalCategory,
    priority: row.priority as GoalPriority,
    createdBy: row.created_by ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRefereeGoal(row: any): RefereeGoal {
  return {
    id: row.id,
    goalId: row.goal_id,
    refereeId: row.referee_id,
    organisationId: row.organisation_id,
    status: row.status as GoalStatus,
    notes: row.notes ?? "",
    targetReviewDate: row.target_review_date ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? null,
    archivedAt: row.archived_at ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRefereeGoalView(row: any): RefereeGoalView {
  const rg = mapRefereeGoal(row);
  const def = row.development_goal_defs;
  return {
    ...rg,
    title: def?.title ?? "",
    description: def?.description ?? "",
    category: (def?.category ?? "Other") as GoalCategory,
    priority: (def?.priority ?? "Low") as GoalPriority,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDevelopmentGoals(
  orgId: string | undefined,
  currentUserId: string | undefined,
) {
  const [goalDefs, setGoalDefs]               = useState<DevGoalDef[]>([]);
  const [refereeGoals, setRefereeGoals]       = useState<RefereeGoal[]>([]);
  const [allRefereeGoalViews, setAllRefereeGoalViews] = useState<RefereeGoalView[]>([]);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState("");

  const reload = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError("");
    try {
      const supabase = getSupabaseClient();

      const [{ data: defRows, error: defErr }, { data: rgRows, error: rgErr }] =
        await Promise.all([
          supabase
            .from("development_goal_defs")
            .select("*")
            .eq("organisation_id", orgId)
            .is("deleted_at", null)
            .order("created_at", { ascending: false }),
          supabase
            .from("referee_goals")
            .select("*, development_goal_defs(*)")
            .eq("organisation_id", orgId)
            .order("created_at", { ascending: false }),
        ]);

      if (defErr) throw defErr;
      if (rgErr) throw rgErr;

      setGoalDefs((defRows ?? []).map(mapDef));
      setRefereeGoals((rgRows ?? []).map(mapRefereeGoal));
      setAllRefereeGoalViews((rgRows ?? []).map(mapRefereeGoalView));
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? "Failed to load development goals");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { void reload(); }, [reload]);

  // ── Create and assign a goal ─────────────────────────────────────────────
  // Creates a goal def, an assignment record, junction rows, and per-referee
  // progress rows in sequence. Returns the new goal def's id.
  const assignGoal = useCallback(async (
    input: AssignGoalInput,
    everyoneRefereeIds: string[],
  ): Promise<string> => {
    if (!orgId || !currentUserId) throw new Error("No organisation or user");
    const supabase = getSupabaseClient();

    const targetIds =
      input.assignmentType === "Everyone"
        ? everyoneRefereeIds
        : input.assignedRefereeIds;

    // Layer 1: goal definition
    const { data: defRow, error: defErr } = await supabase
      .from("development_goal_defs")
      .insert({
        organisation_id: orgId,
        title: input.title,
        description: input.description,
        category: input.category,
        priority: input.priority,
        created_by: currentUserId,
      })
      .select("id")
      .single();
    if (defErr || !defRow) throw defErr ?? new Error("Failed to create goal definition");
    const defId = defRow.id;

    // Layer 2: assignment record (audit trail)
    const { data: asgnRow, error: asgnErr } = await supabase
      .from("development_goal_assignments")
      .insert({
        goal_id: defId,
        organisation_id: orgId,
        assignment_type: input.assignmentType,
        assigned_by: currentUserId,
      })
      .select("id")
      .single();
    if (asgnErr || !asgnRow) throw asgnErr ?? new Error("Failed to create assignment");
    const asgnId = asgnRow.id;

    // Junction: explicit referee list (always resolved, even for "Everyone")
    if (targetIds.length > 0) {
      const { error: jxnErr } = await supabase
        .from("development_goal_assignment_referees")
        .insert(targetIds.map(rid => ({ assignment_id: asgnId, referee_id: rid })));
      if (jxnErr) throw jxnErr;
    }

    // Layer 3: per-referee progress rows
    if (targetIds.length > 0) {
      const { error: rgErr } = await supabase
        .from("referee_goals")
        .insert(targetIds.map(rid => ({
          goal_id: defId,
          referee_id: rid,
          organisation_id: orgId,
          status: "Active",
          notes: "",
          target_review_date: input.targetReviewDate ?? null,
        })));
      if (rgErr) throw rgErr;
    }

    await reload();
    return defId;
  }, [orgId, currentUserId, reload]);

  // ── Update goal definition ────────────────────────────────────────────────
  const updateGoalDef = useCallback(async (
    id: string,
    patch: Partial<Pick<DevGoalDef, "title" | "description" | "category" | "priority">>,
  ): Promise<void> => {
    const update: Record<string, string> = {};
    if (patch.title       !== undefined) update.title       = patch.title;
    if (patch.description !== undefined) update.description = patch.description;
    if (patch.category    !== undefined) update.category    = patch.category;
    if (patch.priority    !== undefined) update.priority    = patch.priority;

    const { error: err } = await getSupabaseClient()
      .from("development_goal_defs")
      .update(update)
      .eq("id", id);
    if (err) throw err;
    await reload();
  }, [reload]);

  // ── Soft-delete a goal definition (sets deleted_at) ──────────────────────
  const deleteGoalDef = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await getSupabaseClient()
      .from("development_goal_defs")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (err) throw err;
    await reload();
  }, [reload]);

  // ── Update a single referee's progress record ─────────────────────────────
  const updateRefereeGoal = useCallback(async (
    id: string,
    patch: Partial<Pick<RefereeGoal, "notes" | "targetReviewDate" | "status" | "completedAt" | "archivedAt">>,
  ): Promise<void> => {
    const update: Record<string, string | null> = {};
    if (patch.notes             !== undefined) update.notes              = patch.notes;
    if (patch.targetReviewDate  !== undefined) update.target_review_date = patch.targetReviewDate;
    if (patch.status            !== undefined) update.status             = patch.status;
    if (patch.completedAt       !== undefined) update.completed_at       = patch.completedAt;
    if (patch.archivedAt        !== undefined) update.archived_at        = patch.archivedAt;

    const { error: err } = await getSupabaseClient()
      .from("referee_goals")
      .update(update)
      .eq("id", id);
    if (err) throw err;
    await reload();
  }, [reload]);

  // ── Status transitions ────────────────────────────────────────────────────

  const completeRefereeGoal = useCallback(async (id: string): Promise<void> => {
    const now = new Date().toISOString();
    const { error: err } = await getSupabaseClient()
      .from("referee_goals")
      .update({ status: "Completed", completed_at: now, archived_at: null })
      .eq("id", id);
    if (err) throw err;
    await reload();
  }, [reload]);

  const archiveRefereeGoal = useCallback(async (id: string): Promise<void> => {
    const now = new Date().toISOString();
    const { error: err } = await getSupabaseClient()
      .from("referee_goals")
      .update({ status: "Archived", archived_at: now })
      .eq("id", id);
    if (err) throw err;
    await reload();
  }, [reload]);

  const reopenRefereeGoal = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await getSupabaseClient()
      .from("referee_goals")
      .update({ status: "Active", completed_at: null, archived_at: null })
      .eq("id", id);
    if (err) throw err;
    await reload();
  }, [reload]);

  // Removes the referee's own progress record. Only removes this referee's
  // copy — other referees assigned the same goal are not affected.
  const deleteRefereeGoal = useCallback(async (id: string): Promise<void> => {
    const { error: err } = await getSupabaseClient()
      .from("referee_goals")
      .delete()
      .eq("id", id);
    if (err) throw err;
    await reload();
  }, [reload]);

  // ── Derived views ─────────────────────────────────────────────────────────

  const refereeGoalViewsForReferee = useCallback(
    (refereeId: string): RefereeGoalView[] =>
      allRefereeGoalViews.filter(v => v.refereeId === refereeId),
    [allRefereeGoalViews],
  );

  return {
    goalDefs,
    assignments: [] as DevGoalAssignment[], // not consumed by current UI; returned for API compat
    refereeGoals,
    allRefereeGoalViews,
    loading,
    error,
    reload,
    assignGoal,
    updateGoalDef,
    deleteGoalDef,
    updateRefereeGoal,
    completeRefereeGoal,
    archiveRefereeGoal,
    reopenRefereeGoal,
    deleteRefereeGoal,
    refereeGoalViewsForReferee,
  };
}
