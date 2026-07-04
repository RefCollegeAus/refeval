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

interface Props {
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onNavigate: (route: string) => void;
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

function priorityAccent(priority: Notification["priority"]) {
  if (priority === "high")   return "#ff453a";
  if (priority === "normal") return "var(--accent)";
  return "var(--muted)";
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
  onNavigate: (route: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 14px",
        borderRadius: 8,
        background: notif.isRead ? "transparent" : "rgba(165,106,27,.07)",
        border: `1px solid ${notif.isRead ? "var(--border)" : "rgba(165,106,27,.22)"}`,
        marginBottom: 8,
        cursor: "default",
      }}
    >
      <div
        style={{
          width: 32, height: 32, borderRadius: 8, background: "var(--panel2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, color: priorityAccent(notif.priority), marginTop: 1,
        }}
      >
        {typeIcon(notif.type)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {FILTERS.find(f => f.value === getNotificationCategory(notif.type))?.label ?? "System"}
          </span>
          {notif.priority === "high" && (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#ff453a" }}>
              <AlertTriangle size={10} /> Urgent
            </span>
          )}
          {!notif.isRead && (
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
          )}
        </div>
        <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: notif.isRead ? 400 : 600, lineHeight: 1.35 }}>
          {notif.title}
        </p>
        <p style={{ margin: "0 0 6px", fontSize: 13, color: "var(--muted)", lineHeight: 1.4 }}>
          {notif.message}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{fmtRel(notif.createdAt)}</span>
          {notif.actionLabel && notif.actionRoute && (
            <button
              style={{ fontSize: 11, padding: "2px 8px", display: "flex", alignItems: "center", gap: 4 }}
              onClick={() => {
                if (!notif.isRead) onMarkRead(notif.id);
                onNavigate(notif.actionRoute!);
              }}
            >
              <ExternalLink size={11} /> {notif.actionLabel}
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        {!notif.isRead && (
          <button title="Mark as read" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => onMarkRead(notif.id)}>
            <CheckCheck size={13} />
          </button>
        )}
        <button title="Delete" style={{ fontSize: 11, padding: "3px 8px", color: "var(--muted)" }} onClick={() => onDelete(notif.id)}>
          <Trash2 size={13} />
        </button>
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
      style={{
        width: 36, height: 20, borderRadius: 10, padding: 0, border: "none", cursor: "pointer", flexShrink: 0,
        background: checked ? "var(--accent)" : "var(--panel3)", transition: "background .15s",
        position: "relative",
      }}
    >
      <span
        style={{
          position: "absolute", top: 2,
          left: checked ? 18 : 2,
          width: 16, height: 16, borderRadius: "50%",
          background: "#fff",
          transition: "left .15s",
        }}
      />
    </button>
  );
}

function PrefRow({ label, checked, onChange, last = false }: { label: string; checked: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 14px",
      borderBottom: last ? "none" : "1px solid var(--border)",
    }}>
      <span style={{ fontSize: 13 }}>{label}</span>
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
    <div className="layout one-col">
      <div className="panel">
        {/* Header */}
        <div className="table-head" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Bell size={20} style={{ color: "var(--muted)", flexShrink: 0 }} />
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>In-App</p>
              <h1 style={{ margin: 0, fontSize: 22 }}>
                Notifications
                {unreadCount > 0 && (
                  <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 500, color: "var(--accent)" }}>
                    {unreadCount} unread
                  </span>
                )}
              </h1>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {unreadCount > 0 && (
              <button onClick={onMarkAllRead} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCheck size={14} /> Mark All Read
              </button>
            )}
            <button
              onClick={() => setShowPrefs(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 6, color: showPrefs ? "var(--accent)" : undefined }}
              title="Notification settings"
            >
              <Settings size={14} /> Settings
            </button>
            <button onClick={onBack}>← Back</button>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              style={{
                fontSize: 12, padding: "5px 12px", borderRadius: 20,
                background: activeFilter === f.value ? "var(--accent)" : "var(--panel2)",
                color: activeFilter === f.value ? "#fff" : "var(--muted)",
                border: `1px solid ${activeFilter === f.value ? "var(--accent)" : "var(--border)"}`,
                fontWeight: activeFilter === f.value ? 700 : 400,
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Preferences panel */}
        {showPrefs && preferences && (
          <div style={{
            marginBottom: 24,
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--panel2)",
            overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 14px",
              borderBottom: "1px solid var(--border)",
            }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Notification Settings</p>
                <p style={{ margin: 0, fontSize: 12, color: "var(--muted)" }}>Choose which categories appear in your notification centre.</p>
              </div>
              <PrefToggle
                checked={preferences.inAppEnabled}
                onChange={v => onUpdatePreferences({ inAppEnabled: v })}
              />
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
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div style={{
            textAlign: "center", padding: "56px 24px",
            background: "var(--panel2)", borderRadius: 16, border: "1px solid var(--border)",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: "var(--panel3)", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <Bell size={24} style={{ color: "var(--muted)", opacity: 0.5 }} />
            </div>
            <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 15 }}>{empty.heading}</p>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: 13, maxWidth: 280, marginInline: "auto" }}>
              {empty.sub}
            </p>
          </div>
        )}

        {/* Grouped notifications */}
        {groups.map(group => (
          <div key={group.label} style={{ marginBottom: 24 }}>
            <p style={{
              margin: "0 0 10px", fontSize: 11, fontWeight: 700,
              textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted)",
              borderBottom: "1px solid var(--border)", paddingBottom: 6,
            }}>
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
      </div>
    </div>
  );
}
