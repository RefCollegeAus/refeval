"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Assignment, AssignmentUser, AssignmentStatus, CreateAssignmentInput, ReflectionQuestion, ReflectionResponse, QuizQuestion, QuizAnswer } from "@/lib/types/assignments";

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
    reflectionResponses: Array.isArray(row.reflection_responses) ? (row.reflection_responses as ReflectionResponse[]) : null,
    reflectionSubmittedAt: row.reflection_submitted_at ?? null,
    quizAnswers: Array.isArray(row.quiz_answers) ? (row.quiz_answers as QuizAnswer[]) : null,
    quizScore: row.quiz_score ?? null,
    quizTotal: row.quiz_total ?? null,
    quizSubmittedAt: row.quiz_submitted_at ?? null,
    quizAttemptCount: row.quiz_attempt_count ?? 0,
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
    quizAllowRetakes: row.quiz_allow_retakes ?? true,
    createdAt: row.created_at,
    questions: Array.isArray(row.questions)
      ? (row.questions as any[]).map((q, i) => ({
          id: q.id,
          text: q.text ?? "",
          required: q.required ?? false,
          displayOrder: q.displayOrder ?? i,
        }))
      : [],
    quizQuestions: Array.isArray(row.quiz_questions)
      ? (row.quiz_questions as any[]).map((q, i) => ({
          id: q.id,
          prompt: q.prompt ?? "",
          answers: Array.isArray(q.answers) ? q.answers : [],
          correctAnswerIndex: q.correctAnswerIndex ?? 0,
          required: q.required ?? false,
          displayOrder: q.displayOrder ?? i,
          clipResourceId: q.clipResourceId ?? null,
          explanation: q.explanation ?? undefined,
          resourceType: q.resourceType ?? null,
          resourceVideoUrl: q.resourceVideoUrl ?? null,
          resourceReviewId: q.resourceReviewId ?? null,
          resourceTagId: q.resourceTagId ?? null,
        }))
      : [],
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
  // Playlist-backed assignments are deduplicated by playlistId — if the same playlist was
  // assigned twice (e.g. via group and individually), keep only the most recently created one.
  // Standalone quiz assignments (playlistId === null) are never deduplicated.
  const myAssignments = useMemo(() => {
    const mine = assignments.filter(a => a.assignmentUsers.some(u => u.userId === currentUserId));
    const seen = new Map<string, typeof mine[number]>();
    const standalone: typeof mine = [];
    for (const a of mine) {
      if (!a.playlistId) { standalone.push(a); continue; }
      const existing = seen.get(a.playlistId);
      if (!existing || a.createdAt > existing.createdAt) {
        seen.set(a.playlistId, a);
      }
    }
    return [...Array.from(seen.values()), ...standalone]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
        quiz_allow_retakes: input.quizAllowRetakes,
        questions: input.questions,
        quiz_questions: input.quizQuestions,
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
    data: { title: string; instructions: string | null; dueDate: string | null; required: boolean; quizAllowRetakes?: boolean; questions?: ReflectionQuestion[]; quizQuestions?: QuizQuestion[] },
  ): Promise<void> {
    const patch: Record<string, unknown> = {
      title: data.title,
      instructions: data.instructions || null,
      due_date: data.dueDate || null,
      required: data.required,
    };
    if (data.quizAllowRetakes !== undefined) patch.quiz_allow_retakes = data.quizAllowRetakes;
    if (data.questions !== undefined) patch.questions = data.questions;
    if (data.quizQuestions !== undefined) patch.quiz_questions = data.quizQuestions;
    const { error: err } = await getSupabaseClient()
      .from("learning_assignments")
      .update(patch)
      .eq("id", id);
    if (err) throw err;
    await load();
  }

  async function saveQuizAnswers(
    assignmentUserId: string,
    answers: QuizAnswer[],
  ): Promise<void> {
    const { error: err } = await getSupabaseClient()
      .from("learning_assignment_users")
      .update({ quiz_answers: answers })
      .eq("id", assignmentUserId);
    if (err) throw err;
  }

  async function submitQuiz(
    assignmentUserId: string,
    answers: QuizAnswer[],
    score: number,
    total: number,
    previousAttemptCount: number,
  ): Promise<void> {
    const { error: err } = await getSupabaseClient()
      .from("learning_assignment_users")
      .update({
        quiz_answers: answers,
        quiz_score: score,
        quiz_total: total,
        quiz_submitted_at: new Date().toISOString(),
        quiz_attempt_count: previousAttemptCount + 1,
      })
      .eq("id", assignmentUserId);
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

  async function saveReflectionDraft(
    assignmentUserId: string,
    responses: ReflectionResponse[],
  ): Promise<void> {
    const { error: err } = await getSupabaseClient()
      .from("learning_assignment_users")
      .update({ reflection_responses: responses })
      .eq("id", assignmentUserId);
    if (err) throw err;
  }

  async function submitReflection(
    assignmentUserId: string,
    responses: ReflectionResponse[],
  ): Promise<void> {
    const { error: err } = await getSupabaseClient()
      .from("learning_assignment_users")
      .update({
        reflection_responses: responses,
        reflection_submitted_at: new Date().toISOString(),
      })
      .eq("id", assignmentUserId);
    if (err) throw err;
    await load();
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
    saveReflectionDraft,
    submitReflection,
    saveQuizAnswers,
    submitQuiz,
  };
}
