"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Search, X, FileText, BookOpen, Layers, Users, Target, FolderOpen } from "lucide-react";
import { useModalA11y } from "@/lib/hooks/useModalA11y";
import type { RefEvalSession, Screen, Role } from "@/lib/types/auth";
import type { ReviewRecord } from "@/lib/types/reviews";
import type { Assignment } from "@/lib/types/assignments";
import type { Playlist } from "@/lib/types/playlists";
import type { MemberRecord } from "@/lib/types/members";
import type { Group } from "@/lib/types/groups";
import type { RefereeGoalView } from "@/lib/types/developmentGoals";

type ResultType = "review" | "assignment" | "playlist" | "member" | "group" | "goal";

type SearchResult = {
  id: string;
  type: ResultType;
  title: string;
  detail: string;
  actionLabel: string;
  onAction: () => void;
};

const TYPE_LABELS: Record<ResultType, string> = {
  review:     "Reviews",
  assignment: "Assignments",
  playlist:   "Playlists",
  member:     "Members",
  group:      "Groups",
  goal:       "Development Goals",
};

const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  admin:       "Administrator",
  educator:    "Educator",
  referee:     "Referee",
  viewer:      "Viewer",
};

function TypeIcon({ type }: { type: ResultType }) {
  const size = 14;
  if (type === "review")     return <FileText size={size} />;
  if (type === "assignment") return <BookOpen size={size} />;
  if (type === "playlist")   return <Layers size={size} />;
  if (type === "member")     return <Users size={size} />;
  if (type === "group")      return <FolderOpen size={size} />;
  if (type === "goal")       return <Target size={size} />;
  return null;
}

interface Props {
  session: RefEvalSession;
  searchableReviews: ReviewRecord[];
  searchableAssignments: Assignment[];
  playlists: Playlist[];
  members: MemberRecord[];
  groups: Group[];
  searchableGoals: RefereeGoalView[];
  onNavigate: (screen: Screen) => void;
  onOpenReview: (review: ReviewRecord) => void;
  onNavigatePlaylist: (id: string) => void;
  onNavigateDevelopment: (refereeId: string) => void;
  onClose: () => void;
}

export function GlobalSearch({
  session,
  searchableReviews,
  searchableAssignments,
  playlists,
  members,
  groups,
  searchableGoals,
  onNavigate,
  onOpenReview,
  onNavigatePlaylist,
  onNavigateDevelopment,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useModalA11y<HTMLDivElement>(true, onClose);
  const isReferee = session.activeRole === "referee";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const match = (...strs: (string | null | undefined)[]) =>
      strs.some(s => s && s.toLowerCase().includes(q));
    const out: SearchResult[] = [];

    // Reviews
    let reviewCount = 0;
    for (const r of searchableReviews) {
      if (reviewCount >= 5) break;
      if (match(r.game, r.referee1Name, r.referee2Name, r.referee3Name, r.educatorName)) {
        out.push({
          id: `review-${r.id}`,
          type: "review",
          title: r.game || "Untitled Review",
          detail: [
            r.status,
            r.educatorName,
            r.gameDate ? new Date(r.gameDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : null,
          ].filter(Boolean).join(" · "),
          actionLabel: isReferee ? "View review" : "Open review",
          onAction: () => { onOpenReview(r); onClose(); },
        });
        reviewCount++;
      }
    }

    // Assignments
    let assignCount = 0;
    for (const a of searchableAssignments) {
      if (assignCount >= 5) break;
      if (match(a.title)) {
        const count = a.assignmentUsers.length;
        out.push({
          id: `assignment-${a.id}`,
          type: "assignment",
          title: a.title,
          detail: [
            `${count} referee${count !== 1 ? "s" : ""}`,
            a.dueDate ? "Due " + new Date(a.dueDate).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : null,
          ].filter(Boolean).join(" · "),
          actionLabel: isReferee ? "Open in My Learning" : "View assignment",
          onAction: () => { onNavigate(isReferee ? "my-learning" : "assignments"); onClose(); },
        });
        assignCount++;
      }
    }

    // Playlists (management only)
    if (!isReferee) {
      let playlistCount = 0;
      for (const p of playlists) {
        if (playlistCount >= 5) break;
        if (match(p.title, p.description)) {
          out.push({
            id: `playlist-${p.id}`,
            type: "playlist",
            title: p.title,
            detail: [
              `${p.items.length} clip${p.items.length !== 1 ? "s" : ""}`,
              p.description ? p.description.slice(0, 50) : null,
            ].filter(Boolean).join(" · "),
            actionLabel: "Open playlist",
            onAction: () => { onNavigatePlaylist(p.id); onClose(); },
          });
          playlistCount++;
        }
      }
    }

    // Members (management only)
    if (!isReferee) {
      let memberCount = 0;
      for (const m of members) {
        if (memberCount >= 5) break;
        if (match(m.name, m.email)) {
          out.push({
            id: `member-${m.id}`,
            type: "member",
            title: m.name || m.email,
            detail: [ROLE_LABELS[m.role], m.email].filter(Boolean).join(" · "),
            actionLabel: m.role === "referee" ? "View development" : "View member",
            onAction: () => {
              if (m.role === "referee") { onNavigateDevelopment(m.id); }
              else { onNavigate("database"); }
              onClose();
            },
          });
          memberCount++;
        }
      }
    }

    // Groups (management only)
    if (!isReferee) {
      let groupCount = 0;
      for (const g of groups) {
        if (groupCount >= 5) break;
        if (match(g.name, g.description)) {
          out.push({
            id: `group-${g.id}`,
            type: "group",
            title: g.name,
            detail: [
              `${g.members.length} member${g.members.length !== 1 ? "s" : ""}`,
              g.description ? g.description.slice(0, 50) : null,
            ].filter(Boolean).join(" · "),
            actionLabel: "View groups",
            onAction: () => { onNavigate("groups"); onClose(); },
          });
          groupCount++;
        }
      }
    }

    // Development goals
    let goalCount = 0;
    for (const gv of searchableGoals) {
      if (goalCount >= 5) break;
      if (match(gv.title, gv.description, gv.category)) {
        out.push({
          id: `goal-${gv.id}`,
          type: "goal",
          title: gv.title,
          detail: [
            gv.category,
            gv.priority !== "Medium" ? gv.priority : null,
            gv.status,
          ].filter(Boolean).join(" · "),
          actionLabel: "View development",
          onAction: () => { onNavigateDevelopment(gv.refereeId); onClose(); },
        });
        goalCount++;
      }
    }

    return out;
  }, [query, searchableReviews, searchableAssignments, playlists, members, groups, searchableGoals, isReferee, onOpenReview, onNavigate, onNavigatePlaylist, onNavigateDevelopment, onClose]);

  useEffect(() => { setSelectedIndex(0); }, [results]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") { setSelectedIndex(i => Math.min(i + 1, results.length - 1)); e.preventDefault(); return; }
      if (e.key === "ArrowUp") { setSelectedIndex(i => Math.max(i - 1, 0)); e.preventDefault(); return; }
      if (e.key === "Enter" && results.length > 0) { results[selectedIndex]?.onAction(); return; }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [results, selectedIndex]);

  const isEmptyQuery = query.trim().length < 2;
  const noResults = !isEmptyQuery && results.length === 0;

  // Group results for display with flat index tracking for keyboard nav
  const grouped: { type: ResultType; label: string; items: { result: SearchResult; flatIdx: number }[] }[] = [];
  let flatIdx = 0;
  for (const type of ["review", "assignment", "playlist", "member", "group", "goal"] as ResultType[]) {
    const items = results.filter(r => r.type === type);
    if (items.length > 0) {
      grouped.push({ type, label: TYPE_LABELS[type], items: items.map(result => ({ result, flatIdx: flatIdx++ })) });
    }
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/65 p-[18px] pt-20"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="flex max-h-[72vh] w-[90vw] max-w-[600px] flex-col overflow-hidden rounded-3xl border border-border bg-panel p-0 shadow-xl"
      >
        {/* Input row */}
        <div className="flex shrink-0 items-center gap-2.5 border-b border-border px-3.5 py-2.5">
          <Search size={15} className="shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search reviews, assignments, members, goals…"
            aria-label="Search RefCoach"
            className="flex-1 border-none bg-transparent p-0 text-sm text-text shadow-none outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="shrink-0 cursor-pointer border-none bg-transparent p-0.5 leading-none text-muted shadow-none"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-y-auto">

          {/* Empty / hint state */}
          {isEmptyQuery && (
            <div className="px-5 py-8 text-center">
              <Search size={26} className="mx-auto mb-2.5 block text-muted" />
              <p className="m-0 text-sm font-bold">Quick Search</p>
              <p className="hint mt-1 text-[13px]">
                Type at least 2 characters to search reviews, assignments{!isReferee ? ", members, groups," : ","} goals and more.
              </p>
              <p className="hint mt-3 text-xs">
                <kbd style={{ padding: "1px 6px", borderRadius: 4, background: "var(--panel3)", border: "1px solid var(--border)", fontSize: 11 }}>↑↓</kbd>
                {" navigate · "}
                <kbd style={{ padding: "1px 6px", borderRadius: 4, background: "var(--panel3)", border: "1px solid var(--border)", fontSize: 11 }}>Enter</kbd>
                {" select · "}
                <kbd style={{ padding: "1px 6px", borderRadius: 4, background: "var(--panel3)", border: "1px solid var(--border)", fontSize: 11 }}>Esc</kbd>
                {" close"}
              </p>
            </div>
          )}

          {/* No results */}
          {noResults && (
            <div className="px-5 py-8 text-center">
              <p className="m-0 text-sm font-bold">No results</p>
              <p className="hint mt-1 text-[13px]">
                Nothing matched <strong>&ldquo;{query.trim()}&rdquo;</strong>. Try a different term.
              </p>
            </div>
          )}

          {/* Grouped results */}
          {grouped.map(group => (
            <div key={group.type}>
              <p className="m-0 px-3.5 pb-[3px] pt-2 text-[10px] font-extrabold uppercase tracking-[0.08em] text-muted">
                {group.label}
              </p>
              {group.items.map(({ result, flatIdx: fi }) => {
                const isSelected = fi === selectedIndex;
                return (
                  <button
                    key={result.id}
                    onClick={result.onAction}
                    onMouseEnter={() => setSelectedIndex(fi)}
                    className={
                      "flex w-full cursor-pointer items-center gap-3 rounded-none border-0 border-b border-l-[3px] border-border px-3.5 py-[9px] text-left shadow-none " +
                      (isSelected ? "border-l-accent bg-accent/10" : "border-l-transparent bg-transparent")
                    }
                  >
                    <span className={"flex shrink-0 " + (isSelected ? "text-accent" : "text-muted")}>
                      <TypeIcon type={result.type} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-bold">
                        {result.title}
                      </p>
                      {result.detail && (
                        <p className="hint mt-px overflow-hidden text-ellipsis whitespace-nowrap text-[11px]">
                          {result.detail}
                        </p>
                      )}
                    </div>
                    <span className={"shrink-0 text-[11px] font-semibold " + (isSelected ? "text-accent" : "text-muted")}>
                      {result.actionLabel} →
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="flex shrink-0 items-center justify-between border-t border-border px-3.5 py-1.5">
            <span className="hint text-[11px]">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </span>
            <span className="hint text-[11px]">
              <kbd style={{ padding: "1px 5px", borderRadius: 3, background: "var(--panel3)", border: "1px solid var(--border)", fontSize: 10 }}>↑↓</kbd>
              {" · "}
              <kbd style={{ padding: "1px 5px", borderRadius: 3, background: "var(--panel3)", border: "1px solid var(--border)", fontSize: 10 }}>Enter</kbd>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
