"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  DevGoalDef,
  DevGoalAssignment,
  RefereeGoal,
  RefereeGoalView,
  AssignGoalInput,
  _V1DevelopmentGoal,
} from "@/lib/types/developmentGoals";

// ── Storage keys ──────────────────────────────────────────────────────────────

const KEY_DEFS        = (orgId: string) => `refcoach_goal_defs_${orgId}`;
const KEY_ASSIGNMENTS = (orgId: string) => `refcoach_goal_assignments_${orgId}`;
const KEY_REF_GOALS   = (orgId: string) => `refcoach_referee_goals_${orgId}`;
const KEY_V1_LEGACY   = (orgId: string) => `refcoach_dev_goals_${orgId}`;

// ── ID generator ──────────────────────────────────────────────────────────────

function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ── V1 migration ──────────────────────────────────────────────────────────────
// Converts Phase 9.1 flat DevelopmentGoal records into the three-layer
// architecture. Runs once on first load if the legacy key exists.

function migrateV1(orgId: string): { defs: DevGoalDef[]; assignments: DevGoalAssignment[]; refereeGoals: RefereeGoal[] } | null {
  try {
    const raw = localStorage.getItem(KEY_V1_LEGACY(orgId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.removeItem(KEY_V1_LEGACY(orgId));
      return null;
    }
    // Detect v1 format by presence of `refereeId` on the goal record itself
    if (!("refereeId" in parsed[0])) return null;

    const v1Goals = parsed as _V1DevelopmentGoal[];
    const defs: DevGoalDef[] = [];
    const assignments: DevGoalAssignment[] = [];
    const refereeGoals: RefereeGoal[] = [];

    for (const g of v1Goals) {
      const def: DevGoalDef = {
        id: g.id,
        organisationId: orgId,
        title: g.title,
        description: g.description,
        category: g.category,
        priority: g.priority,
        createdBy: g.createdBy,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      };
      const assignment: DevGoalAssignment = {
        id: `asgn_${g.id}`,
        goalId: g.id,
        organisationId: orgId,
        assignmentType: "Individual",
        assignedRefereeIds: [g.refereeId],
        assignedBy: g.createdBy,
        assignedAt: g.createdAt,
      };
      const refereeGoal: RefereeGoal = {
        id: `rg_${g.id}`,
        goalId: g.id,
        refereeId: g.refereeId,
        organisationId: orgId,
        status: g.status,
        notes: "",
        targetReviewDate: g.targetReviewDate ?? null,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
        completedAt: g.completedAt,
        archivedAt: g.archivedAt,
      };
      defs.push(def);
      assignments.push(assignment);
      refereeGoals.push(refereeGoal);
    }

    localStorage.removeItem(KEY_V1_LEGACY(orgId));
    return { defs, assignments, refereeGoals };
  } catch {
    return null;
  }
}

// ── Storage helpers ───────────────────────────────────────────────────────────

function load<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, data: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDevelopmentGoals(
  orgId: string | undefined,
  currentUserId: string | undefined,
) {
  const [goalDefs, setGoalDefs]       = useState<DevGoalDef[]>([]);
  const [assignments, setAssignments] = useState<DevGoalAssignment[]>([]);
  const [refereeGoals, setRefereeGoals] = useState<RefereeGoal[]>([]);

  // Load from storage (with v1 migration) on mount / orgId change
  useEffect(() => {
    if (!orgId) return;

    const migrated = migrateV1(orgId);
    if (migrated) {
      save(KEY_DEFS(orgId), migrated.defs);
      save(KEY_ASSIGNMENTS(orgId), migrated.assignments);
      save(KEY_REF_GOALS(orgId), migrated.refereeGoals);
      setGoalDefs(migrated.defs);
      setAssignments(migrated.assignments);
      setRefereeGoals(migrated.refereeGoals);
      return;
    }

    setGoalDefs(load<DevGoalDef>(KEY_DEFS(orgId)));
    setAssignments(load<DevGoalAssignment>(KEY_ASSIGNMENTS(orgId)));
    setRefereeGoals(load<RefereeGoal>(KEY_REF_GOALS(orgId)));
  }, [orgId]);

  // Persist helpers
  const persistDefs = useCallback((next: DevGoalDef[]) => {
    setGoalDefs(next);
    if (orgId) save(KEY_DEFS(orgId), next);
  }, [orgId]);

  const persistAssignments = useCallback((next: DevGoalAssignment[]) => {
    setAssignments(next);
    if (orgId) save(KEY_ASSIGNMENTS(orgId), next);
  }, [orgId]);

  const persistRefereeGoals = useCallback((next: RefereeGoal[]) => {
    setRefereeGoals(next);
    if (orgId) save(KEY_REF_GOALS(orgId), next);
  }, [orgId]);

  // ── Create and assign a goal ─────────────────────────────────────────────
  // everyoneRefereeIds is required so the hook can fan out to all referees
  // when assignmentType === "Everyone" without needing to know about members.
  const assignGoal = useCallback(
    (input: AssignGoalInput, everyoneRefereeIds: string[]) => {
      const now = new Date().toISOString();
      const defId = newId("def");

      const def: DevGoalDef = {
        id: defId,
        organisationId: orgId ?? "",
        title: input.title,
        description: input.description,
        category: input.category,
        priority: input.priority,
        createdBy: currentUserId ?? "",
        createdAt: now,
        updatedAt: now,
      };

      const targetIds =
        input.assignmentType === "Everyone"
          ? everyoneRefereeIds
          : input.assignedRefereeIds;

      const assignment: DevGoalAssignment = {
        id: newId("asgn"),
        goalId: defId,
        organisationId: orgId ?? "",
        assignmentType: input.assignmentType,
        assignedRefereeIds: targetIds,
        assignedBy: currentUserId ?? "",
        assignedAt: now,
      };

      const newRefereeGoals: RefereeGoal[] = targetIds.map(refId => ({
        id: newId("rg"),
        goalId: defId,
        refereeId: refId,
        organisationId: orgId ?? "",
        status: "Active" as const,
        notes: "",
        targetReviewDate: input.targetReviewDate ?? null,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        archivedAt: null,
      }));

      persistDefs([def, ...goalDefs]);
      persistAssignments([assignment, ...assignments]);
      persistRefereeGoals([...newRefereeGoals, ...refereeGoals]);
      return defId;
    },
    [goalDefs, assignments, refereeGoals, orgId, currentUserId, persistDefs, persistAssignments, persistRefereeGoals],
  );

  // ── Update goal definition (affects all referees assigned this goal) ──────
  const updateGoalDef = useCallback(
    (id: string, patch: Partial<Pick<DevGoalDef, "title" | "description" | "category" | "priority">>) => {
      persistDefs(
        goalDefs.map(d =>
          d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d,
        ),
      );
    },
    [goalDefs, persistDefs],
  );

  // ── Update a single referee's goal record ─────────────────────────────────
  const updateRefereeGoal = useCallback(
    (id: string, patch: Partial<Pick<RefereeGoal, "notes" | "targetReviewDate" | "status" | "completedAt" | "archivedAt">>) => {
      persistRefereeGoals(
        refereeGoals.map(rg =>
          rg.id === id ? { ...rg, ...patch, updatedAt: new Date().toISOString() } : rg,
        ),
      );
    },
    [refereeGoals, persistRefereeGoals],
  );

  // ── Status transitions ────────────────────────────────────────────────────

  const completeRefereeGoal = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      persistRefereeGoals(
        refereeGoals.map(rg =>
          rg.id === id
            ? { ...rg, status: "Completed", completedAt: now, archivedAt: null, updatedAt: now }
            : rg,
        ),
      );
    },
    [refereeGoals, persistRefereeGoals],
  );

  const archiveRefereeGoal = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      persistRefereeGoals(
        refereeGoals.map(rg =>
          rg.id === id
            ? { ...rg, status: "Archived", archivedAt: now, updatedAt: now }
            : rg,
        ),
      );
    },
    [refereeGoals, persistRefereeGoals],
  );

  const reopenRefereeGoal = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      persistRefereeGoals(
        refereeGoals.map(rg =>
          rg.id === id
            ? { ...rg, status: "Active", completedAt: null, archivedAt: null, updatedAt: now }
            : rg,
        ),
      );
    },
    [refereeGoals, persistRefereeGoals],
  );

  // Deletes only the referee's own progress record (does not remove the def
  // or affect other referees assigned the same goal).
  const deleteRefereeGoal = useCallback(
    (id: string) => {
      persistRefereeGoals(refereeGoals.filter(rg => rg.id !== id));
    },
    [refereeGoals, persistRefereeGoals],
  );

  // ── Derived views ─────────────────────────────────────────────────────────

  // Build the def lookup once per render cycle
  const defById = useMemo(
    () => new Map(goalDefs.map(d => [d.id, d])),
    [goalDefs],
  );

  // All referee goals merged with their definition, across all referees
  const allRefereeGoalViews = useMemo<RefereeGoalView[]>(
    () =>
      refereeGoals
        .map(rg => {
          const def = defById.get(rg.goalId);
          if (!def) return null;
          return { ...rg, title: def.title, description: def.description, category: def.category, priority: def.priority };
        })
        .filter((v): v is RefereeGoalView => v !== null),
    [refereeGoals, defById],
  );

  const refereeGoalViewsForReferee = useCallback(
    (refereeId: string): RefereeGoalView[] =>
      allRefereeGoalViews.filter(v => v.refereeId === refereeId),
    [allRefereeGoalViews],
  );

  return {
    goalDefs,
    assignments,
    refereeGoals,
    allRefereeGoalViews,
    assignGoal,
    updateGoalDef,
    updateRefereeGoal,
    completeRefereeGoal,
    archiveRefereeGoal,
    reopenRefereeGoal,
    deleteRefereeGoal,
    refereeGoalViewsForReferee,
  };
}
