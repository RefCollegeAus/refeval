"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { RefEvalSession } from "@/lib/types/auth";
import type {
  SimulatorSession,
  SimulatorSessionWithEvents,
  SimulatorEvent,
  SimulatorLevel,
} from "@/lib/types/simulator";

export interface SessionFormData {
  title: string;
  description: string;
  videoUrl: string;
  level: SimulatorLevel;
}

export interface EventFormData {
  tempId: string; // client-side key for list rendering
  timestampSeconds: number;
  windowSeconds: number;
  correctOutcome: string;
  correctCall: string;
  category: string;
  notes: string;
}

export interface SaveResponseData {
  attemptId: string;
  eventId: string;
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
    level: r.level || "beginner",
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

  async function createSession(formData: SessionFormData, events: EventFormData[]): Promise<string> {
    const { data, error } = await getSupabaseClient()
      .from("simulator_sessions")
      .insert({
        organisation_id: orgId,
        title: formData.title,
        description: formData.description,
        video_url: formData.videoUrl,
        level: formData.level,
        created_by: session!.user.id,
      })
      .select()
      .single();
    if (error) { alert(error.message); throw error; }
    const sessionId = data.id;
    if (events.length > 0) {
      const rows = events.map((e, i) => ({
        session_id: sessionId,
        timestamp_seconds: e.timestampSeconds,
        window_seconds: e.windowSeconds,
        correct_outcome: e.correctOutcome,
        correct_call: e.correctCall,
        category: e.category,
        notes: e.notes,
        display_order: i,
      }));
      const { error: evErr } = await getSupabaseClient().from("simulator_events").insert(rows);
      if (evErr) { alert(evErr.message); throw evErr; }
    }
    await load();
    return sessionId;
  }

  async function updateSession(id: string, formData: SessionFormData, events: EventFormData[]): Promise<void> {
    const { error } = await getSupabaseClient()
      .from("simulator_sessions")
      .update({
        title: formData.title,
        description: formData.description,
        video_url: formData.videoUrl,
        level: formData.level,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) { alert(error.message); throw error; }
    // Replace events: delete all then re-insert
    const { error: delErr } = await getSupabaseClient()
      .from("simulator_events")
      .delete()
      .eq("session_id", id);
    if (delErr) { alert(delErr.message); throw delErr; }
    if (events.length > 0) {
      const rows = events.map((e, i) => ({
        session_id: id,
        timestamp_seconds: e.timestampSeconds,
        window_seconds: e.windowSeconds,
        correct_outcome: e.correctOutcome,
        correct_call: e.correctCall,
        category: e.category,
        notes: e.notes,
        display_order: i,
      }));
      const { error: evErr } = await getSupabaseClient().from("simulator_events").insert(rows);
      if (evErr) { alert(evErr.message); throw evErr; }
    }
    await load();
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
    const { error } = await getSupabaseClient()
      .from("simulator_responses")
      .insert({
        attempt_id: resp.attemptId,
        event_id: resp.eventId,
        response_outcome: resp.responseOutcome,
        response_call: resp.responseCall,
        response_time_seconds: resp.responseTimeSeconds,
        is_correct: resp.isCorrect,
      });
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
    deleteSession,
    createAttempt,
    saveResponse,
    completeAttempt,
  };
}
