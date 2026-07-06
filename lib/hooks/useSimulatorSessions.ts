"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RefEvalSession } from "@/lib/types/auth";
import type {
  SimulatorSession,
  SimulatorSessionWithEvents,
  SimulatorEvent,
} from "@/lib/types/simulator";

export interface SessionFormData {
  title: string;
  description: string;
  videoUrl: string;
}

export interface EventFormData {
  tempId: string;
  timestampSeconds: number;
  windowSeconds: number;
  correctOutcome: string;
  correctCall: string;
  category: string;
  notes: string;
}

export interface SaveResponseData {
  attemptId: string;
  eventId?: string;
  clipId?: string;
  responseOutcome: string;
  responseCall: string;
  responseTimeSeconds: number | null;
  isCorrect: boolean;
}

function mapSession(r: any): SimulatorSession {
  return {
    id: r.id,
    organisationId: r.organisation_id,
    title: r.title || "",
    description: r.description || "",
    videoUrl: r.video_url || "",
    level: r.level ?? undefined,
    reviewId: r.review_id ?? undefined,
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapEvent(e: any, sessionId: string): SimulatorEvent {
  return {
    id: e.id,
    sessionId,
    timestampSeconds: Number(e.timestamp_seconds) || 0,
    windowSeconds: Number(e.window_seconds) || 10,
    correctOutcome: e.correct_outcome || "",
    correctCall: e.correct_call || "",
    category: e.category || "",
    notes: e.notes || "",
    displayOrder: e.display_order || 0,
  };
}

export function useSimulatorSessions(session: RefEvalSession | null) {
  const [sessions, setSessions] = useState<SimulatorSessionWithEvents[]>([]);
  const [loading, setLoading] = useState(false);
  const orgId = session?.activeOrganisation?.id ?? "";

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await getSupabaseClient()
      .from("simulator_sessions")
      .select("*, simulator_events(*)")
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) { console.error("useSimulatorSessions load error:", error); return; }
    setSessions(
      (data || []).map((r: any) => ({
        ...mapSession(r),
        events: (r.simulator_events || [])
          .map((e: any) => mapEvent(e, r.id))
          .sort((a: SimulatorEvent, b: SimulatorEvent) => a.timestampSeconds - b.timestampSeconds),
      }))
    );
  }, [orgId]);

  useEffect(() => { load(); }, [load]);

  async function createSession(formData: SessionFormData): Promise<string> {
    const supabase = getSupabaseClient();

    // Create linked review for coding decisions
    const { data: reviewData, error: reviewErr } = await supabase
      .from("reviews")
      .insert({
        organisation_id: orgId,
        educator_id: session!.user.id,
        educator_name: session!.profile.name,
        game: formData.title,
        video_link: formData.videoUrl,
        status: "in_review",
        is_simulator: true,
      })
      .select()
      .single();
    if (reviewErr) { alert(reviewErr.message); throw reviewErr; }

    const { data, error } = await supabase
      .from("simulator_sessions")
      .insert({
        organisation_id: orgId,
        title: formData.title,
        description: formData.description,
        video_url: formData.videoUrl,
        review_id: reviewData.id,
        created_by: session!.user.id,
      })
      .select()
      .single();
    if (error) { alert(error.message); throw error; }
    await load();
    return data.id;
  }

  async function updateSession(id: string, formData: SessionFormData): Promise<void> {
    const { error } = await getSupabaseClient()
      .from("simulator_sessions")
      .update({
        title: formData.title,
        description: formData.description,
        video_url: formData.videoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) { alert(error.message); throw error; }
    await load();
  }

  async function publishSimulator(reviewId: string): Promise<void> {
    const { error } = await getSupabaseClient()
      .from("reviews")
      .update({ status: "completed", submitted_at: new Date().toISOString() })
      .eq("id", reviewId);
    if (error) { alert(error.message); throw error; }
  }

  async function deleteSession(id: string): Promise<void> {
    const { error } = await getSupabaseClient()
      .from("simulator_sessions")
      .delete()
      .eq("id", id);
    if (error) { alert(error.message); throw error; }
    setSessions(prev => prev.filter(s => s.id !== id));
  }

  async function createAttempt(sessionId: string, level: string): Promise<string> {
    const { data, error } = await getSupabaseClient()
      .from("simulator_attempts")
      .insert({
        session_id: sessionId,
        user_id: session!.user.id,
        level,
      })
      .select()
      .single();
    if (error) { alert(error.message); throw error; }
    return data.id;
  }

  async function saveResponse(resp: SaveResponseData): Promise<void> {
    const row: Record<string, any> = {
      attempt_id: resp.attemptId,
      response_outcome: resp.responseOutcome,
      response_call: resp.responseCall,
      response_time_seconds: resp.responseTimeSeconds,
      is_correct: resp.isCorrect,
    };
    if (resp.clipId) row.clip_id = resp.clipId;
    if (resp.eventId) row.event_id = resp.eventId;
    const { error } = await getSupabaseClient()
      .from("simulator_responses")
      .insert(row);
    if (error) { console.error("saveResponse error:", error); }
  }

  async function completeAttempt(attemptId: string, score: number, total: number): Promise<void> {
    const { error } = await getSupabaseClient()
      .from("simulator_attempts")
      .update({ completed_at: new Date().toISOString(), score, total })
      .eq("id", attemptId);
    if (error) { console.error("completeAttempt error:", error); }
  }

  return {
    sessions,
    loading,
    load,
    createSession,
    updateSession,
    publishSimulator,
    deleteSession,
    createAttempt,
    saveResponse,
    completeAttempt,
  };
}
