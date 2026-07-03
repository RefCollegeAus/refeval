"use client";

import { useState, useEffect, useCallback } from "react";
import type { DevelopmentGoal, CreateGoalInput } from "@/lib/types/developmentGoals";

function storageKey(orgId: string) {
  return `refcoach_dev_goals_${orgId}`;
}

function loadFromStorage(orgId: string): DevelopmentGoal[] {
  try {
    const raw = localStorage.getItem(storageKey(orgId));
    if (raw) return JSON.parse(raw) as DevelopmentGoal[];
  } catch {}
  return [];
}

function saveToStorage(orgId: string, goals: DevelopmentGoal[]) {
  try {
    localStorage.setItem(storageKey(orgId), JSON.stringify(goals));
  } catch {}
}

function newId() {
  return `goal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function useDevelopmentGoals(
  orgId: string | undefined,
  currentUserId: string | undefined,
) {
  const [goals, setGoals] = useState<DevelopmentGoal[]>([]);

  useEffect(() => {
    if (!orgId) return;
    setGoals(loadFromStorage(orgId));
  }, [orgId]);

  const mutate = useCallback(
    (next: DevelopmentGoal[]) => {
      setGoals(next);
      if (orgId) saveToStorage(orgId, next);
    },
    [orgId],
  );

  const createGoal = useCallback(
    (input: CreateGoalInput): DevelopmentGoal => {
      const now = new Date().toISOString();
      const goal: DevelopmentGoal = {
        id: newId(),
        refereeId: input.refereeId,
        organisationId: orgId ?? "",
        title: input.title,
        description: input.description,
        category: input.category,
        priority: input.priority,
        status: "Active",
        createdBy: currentUserId ?? "",
        createdAt: now,
        updatedAt: now,
        targetReviewDate: input.targetReviewDate ?? null,
        completedAt: null,
        archivedAt: null,
      };
      mutate([goal, ...goals]);
      return goal;
    },
    [goals, mutate, orgId, currentUserId],
  );

  const updateGoal = useCallback(
    (id: string, patch: Partial<Omit<DevelopmentGoal, "id" | "createdAt" | "createdBy">>) => {
      mutate(
        goals.map(g =>
          g.id === id ? { ...g, ...patch, updatedAt: new Date().toISOString() } : g,
        ),
      );
    },
    [goals, mutate],
  );

  const completeGoal = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      mutate(
        goals.map(g =>
          g.id === id
            ? { ...g, status: "Completed", completedAt: now, archivedAt: null, updatedAt: now }
            : g,
        ),
      );
    },
    [goals, mutate],
  );

  const archiveGoal = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      mutate(
        goals.map(g =>
          g.id === id
            ? { ...g, status: "Archived", archivedAt: now, updatedAt: now }
            : g,
        ),
      );
    },
    [goals, mutate],
  );

  const reopenGoal = useCallback(
    (id: string) => {
      const now = new Date().toISOString();
      mutate(
        goals.map(g =>
          g.id === id
            ? { ...g, status: "Active", completedAt: null, archivedAt: null, updatedAt: now }
            : g,
        ),
      );
    },
    [goals, mutate],
  );

  const deleteGoal = useCallback(
    (id: string) => {
      mutate(goals.filter(g => g.id !== id));
    },
    [goals, mutate],
  );

  const goalsForReferee = useCallback(
    (refereeId: string) => goals.filter(g => g.refereeId === refereeId),
    [goals],
  );

  return {
    goals,
    createGoal,
    updateGoal,
    completeGoal,
    archiveGoal,
    reopenGoal,
    deleteGoal,
    goalsForReferee,
  };
}
