"use client";

import { useState, useEffect, useCallback } from "react";
import type { DevelopmentNote, CreateNoteInput } from "@/lib/types/developmentNotes";

const KEY = (orgId: string) => `refcoach_dev_notes_${orgId}`;

function load(orgId: string): DevelopmentNote[] {
  try {
    const raw = localStorage.getItem(KEY(orgId));
    return raw ? (JSON.parse(raw) as DevelopmentNote[]) : [];
  } catch {
    return [];
  }
}

function save(orgId: string, notes: DevelopmentNote[]) {
  try {
    localStorage.setItem(KEY(orgId), JSON.stringify(notes));
  } catch {}
}

function newId() {
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function useDevelopmentNotes(
  orgId: string | undefined,
  currentUserId: string | undefined,
) {
  const [notes, setNotes] = useState<DevelopmentNote[]>([]);

  useEffect(() => {
    if (!orgId) return;
    setNotes(load(orgId));
  }, [orgId]);

  const persist = useCallback(
    (next: DevelopmentNote[]) => {
      setNotes(next);
      if (orgId) save(orgId, next);
    },
    [orgId],
  );

  const createNote = useCallback(
    (input: CreateNoteInput): DevelopmentNote => {
      const now = new Date().toISOString();
      const note: DevelopmentNote = {
        id: newId(),
        refereeId: input.refereeId,
        organisationId: orgId ?? "",
        title: input.title,
        body: input.body,
        noteType: input.noteType,
        visibility: input.visibility,
        createdBy: currentUserId ?? "",
        createdAt: now,
        updatedAt: now,
        linkedGoalId: input.linkedGoalId ?? null,
      };
      persist([note, ...notes]);
      return note;
    },
    [notes, persist, orgId, currentUserId],
  );

  const updateNote = useCallback(
    (id: string, patch: Partial<Omit<DevelopmentNote, "id" | "refereeId" | "organisationId" | "createdBy" | "createdAt">>) => {
      persist(
        notes.map(n =>
          n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n,
        ),
      );
    },
    [notes, persist],
  );

  const deleteNote = useCallback(
    (id: string) => {
      persist(notes.filter(n => n.id !== id));
    },
    [notes, persist],
  );

  const notesForReferee = useCallback(
    (refereeId: string) => notes.filter(n => n.refereeId === refereeId),
    [notes],
  );

  return { notes, notesForReferee, createNote, updateNote, deleteNote };
}
