"use client";

import { useState } from "react";
import {
  Bell, CheckCheck, Trash2, ExternalLink, Info, AlertTriangle, CheckCircle,
  BookOpen, MessageSquare, Target, ListChecks, Megaphone, Settings,
} from "lucide-react";
import type {
  Notification,
  NotificationType,
  NotificationFilter,
  NotificationPreferences,
} from "@/lib/types/notifications";
import { fmtRel } from "@/lib/utils/time";
import { getNotificationCategory } from "@/lib/services/notifications";
import { PageFrame } from "@/components/shell/PageFrame";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

interface Props {
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onNavigate: (route: string, entityId?: string | null) => void;
  onBack: () => void;
  preferences: NotificationPreferences | null;
  onUpdatePreferences: (patch: Partial<NotificationPreferences>) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function typeIcon(type: NotificationType) {
  switch (type) {
    case "review_assigned":
    case "review_completed":
    case "review_updated":   return <CheckCircle size={16} />;
    case "assignment_assigned":
    case "assignment_due":
    case "assignment_overdue":
    case "assignment_completed": return <ListChecks size={16} />;
    case "goal_review_due":
    case "goal_updated":     return <Target size={16} />;
    case "playlist_shared":
    case "learning_note_added": return <BookOpen size={16} />;
    case "comment_received": return <MessageSquare size={16} />;
    case "organisation_announcement": return <Megaphone size={16} />;
    default:                 return <Info size={16} />;
  }
}

function priorityTextClass(priority: Notification["priority"]) {
  if (priority === "high")   return "text-red-300";
  if (priority === "normal") return "text-accent";
  return "text-muted";
}

function isToday(iso: string) {
  const d = new Date(iso), now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isThisWeek(iso: string) {
  return Date.now() - new Date(iso).getTime() < 7 * 24 * 60 * 60 * 1000;
}

type Group = { label: string; items: Notification[] };

function groupNotifications(list: Notification[]): Group[] {
  const groups: Group[] = [];
  const unread = list.filter(n => !n.isRead);
  const readToday = list.filter(n => n.isRead && isToday(n.createdAt));
  const readThisWeek = list.filter(n => n.isRead && !isToday(n.createdAt) && isThisWeek(n.createdAt));
  const earlier = list.filter(n => n.isRead && !isThisWeek(n.createdAt));
  if (unread.length)       groups.push({ label: "Unread", items: unread });
  if (readToday.length)    groups.push({ label: "Today", items: readToday });
  if (readThisWeek.length) groups.push({ label: "This Week", items: readThisWeek });
  if (earlier.length)      groups.push({ label: "Earlier", items: earlier });
  return groups;
}

function isPrefsEnabled(n: Notification, prefs: NotificationPreferences | null): boolean {
  if (!prefs) return true;
  if (!prefs.inAppEnabled) return false;
  switch (getNotificationCategory(n.type)) {
    case "reviews":      return prefs.reviewNotifications;
    case "assignments":  return prefs.assignmentNotifications;
    case "learning":     return prefs.learningNotifications;
    case "goals":        return prefs.developmentGoalNotifications;
    case "organisation": return prefs.organisationNotifications;
    case "system":       return prefs.systemNotifications;
  }
}

function applyFilter(list: Notification[], filter: NotificationFilter): Notification[] {
  if (filter === "all")    return list;
  if (filter === "unread") return list.filter(n => !n.isRead);
  return list.filter(n => getNotificationCategory(n.type) === filter);
}

const FILTERS: { value: NotificationFilter; label: string }[] = [
  { value: "all",          label: "All" },
  { value: "unread",       label: "Unread" },
  { value: "reviews",      label: "Reviews" },
  { value: "assignments",  label: "Assignments" },
  { value: "learning",     label: "Learning" },
  { value: "goals",        label: "Development Goals" },
  { value: "organisation", label: "Organisation" },
  { value: "system",       label: "System" },
];

function emptyStateMessage(filter: NotificationFilter): { heading: string; sub: string } {
  switch (filter) {
    case "unread":       return { heading: "No unread notifications", sub: "You're all caught up." };
    case "reviews":      return { heading: "No review notifications", sub: "Review updates will appear here." };
    case "assignments":  return { heading: "No assignment notifications", sub: "New assignments will appear here." };
    case "learning":     return { heading: "No learning notifications", sub: "Playlist shares and coaching notes will appear here." };
    case "goals":        return { heading: "No development goal notifications", sub: "Goal updates will appear here." };
    case "organisation": return { heading: "No organisation notifications", sub: "Announcements will appear here." };
    case "system":       return { heading: "No system notifications", sub: "System messages will appear here." };
    default:             return { heading: "No notifications", sub: "You'll see activity from reviews, learning and assignments here." };
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NotificationRow({
  notif, onMarkRead, onDelete, onNavigate,
}: {
  notif: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (route: string, entityId?: string | null) => void;
}) {
  return (
    <div
      className={cn(
        "mb-2 flex items-start gap-3 rounded-lg border p-3",
        notif.isRead ? "border-border bg-transparent" : "border-accent/25 bg-accent/[.07]"
      )}
    >
      <div className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-panel-2", priorityTextClass(notif.priority))}>
        {typeIcon(notif.type)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wide text-muted">
            {FILTERS.find(f => f.value === getNotificationCategory(notif.type))?.label ?? "System"}
          </span>
          {notif.priority === "high" && (
            <span className="flex items-center gap-1 text-[10px] text-red-300">
              <AlertTriangle size={10} /> Urgent
            </span>
          )}
          {!notif.isRead && <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />}
        </div>
        <p className={cn("mb-0.5 text-[13px] leading-snug", notif.isRead ? "font-normal text-text" : "font-semibold text-text")}>
          {notif.title}
        </p>
        <p className="mb-1.5 text-[13px] leading-snug text-muted">
          {notif.message}
        </p>
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] text-muted">{fmtRel(notif.createdAt)}</span>
          {notif.actionLabel && notif.actionRoute && (
            <Button
              variant="secondary"
              size="sm"
              className="gap-1"
              onClick={() => {
                if (!notif.isRead) onMarkRead(notif.id);
                onNavigate(notif.actionRoute!, notif.relatedEntityId);
              }}
            >
              <ExternalLink size={11} /> {notif.actionLabel}
            </Button>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-1">
        {!notif.isRead && (
          <Button variant="secondary" size="sm" title="Mark as read" onClick={() => onMarkRead(notif.id)}>
            <CheckCheck size={13} />
          </Button>
        )}
        <Button variant="secondary" size="sm" title="Delete" className="text-muted" onClick={() => onDelete(notif.id)}>
          <Trash2 size={13} />
        </Button>
      </div>
    </div>
  );
}

function PrefToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full border-none p-0 transition-colors",
        checked ? "bg-accent" : "bg-panel-3"
      )}
    >
      <span
        className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-[left]"
        style={{ left: checked ? 18 : 2 }}
      />
    </button>
  );
}

function PrefRow({ label, checked, onChange, last = false }: { label: string; checked: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between px-3.5 py-2.5", !last && "border-b border-border")}>
      <span className="text-[13px] text-text">{label}</span>
      <PrefToggle checked={checked} onChange={onChange} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function NotificationCentre({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onNavigate,
  onBack,
  preferences,
  onUpdatePreferences,
}: Props) {
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("all");
  const [showPrefs, setShowPrefs] = useState(false);

  const visibleAll = notifications.filter(n => isPrefsEnabled(n, preferences));
  const filtered = applyFilter(visibleAll, activeFilter);
  const groups = groupNotifications(filtered);
  const empty = emptyStateMessage(activeFilter);

  return (
    <PageFrame
      className="mx-auto max-w-[900px] p-0"
      eyebrow="In-App"
      title="Notifications"
      description={unreadCount > 0 ? `${unreadCount} unread` : undefined}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="secondary" size="sm" className="gap-1.5" onClick={onMarkAllRead}>
              <CheckCheck size={14} /> Mark All Read
            </Button>
          )}
          <Button
            variant={showPrefs ? "primary" : "secondary"}
            size="sm"
            className="gap-1.5"
            onClick={() => setShowPrefs(v => !v)}
            title="Notification settings"
          >
            <Settings size={14} /> Settings
          </Button>
          <Button variant="secondary" size="sm" onClick={onBack}>← Back</Button>
        </div>
      }
    >
      {/* Filter bar */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition-colors",
              activeFilter === f.value
                ? "border-accent bg-accent font-bold text-white"
                : "border-border bg-panel-2 font-normal text-muted"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Preferences panel */}
      {showPrefs && preferences && (
        <Card className="!p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-3.5 py-3">
            <div>
              <p className="text-[13px] font-bold text-text">Notification Settings</p>
              <p className="text-xs text-muted">Choose which categories appear in your notification centre.</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={preferences.inAppEnabled ? "good" : "neutral"}>
                {preferences.inAppEnabled ? "Enabled" : "Disabled"}
              </Badge>
              <PrefToggle
                checked={preferences.inAppEnabled}
                onChange={v => onUpdatePreferences({ inAppEnabled: v })}
              />
            </div>
          </div>
          {preferences.inAppEnabled && (
            <>
              <PrefRow label="Reviews"           checked={preferences.reviewNotifications}          onChange={v => onUpdatePreferences({ reviewNotifications: v })} />
              <PrefRow label="Assignments"        checked={preferences.assignmentNotifications}      onChange={v => onUpdatePreferences({ assignmentNotifications: v })} />
              <PrefRow label="Learning"           checked={preferences.learningNotifications}        onChange={v => onUpdatePreferences({ learningNotifications: v })} />
              <PrefRow label="Development Goals"  checked={preferences.developmentGoalNotifications} onChange={v => onUpdatePreferences({ developmentGoalNotifications: v })} />
              <PrefRow label="Organisation"       checked={preferences.organisationNotifications}    onChange={v => onUpdatePreferences({ organisationNotifications: v })} />
              <PrefRow label="System"             checked={preferences.systemNotifications}          onChange={v => onUpdatePreferences({ systemNotifications: v })} last />
            </>
          )}
        </Card>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <EmptyState icon={<Bell size={28} />} title={empty.heading} description={empty.sub} />
      )}

      {/* Grouped notifications */}
      {groups.map(group => (
        <div key={group.label}>
          <p className="mb-2.5 border-b border-border pb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
            {group.label}
          </p>
          {group.items.map(n => (
            <NotificationRow
              key={n.id}
              notif={n}
              onMarkRead={onMarkRead}
              onDelete={onDelete}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}
    </PageFrame>
  );
}
