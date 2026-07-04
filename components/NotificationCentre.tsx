"use client";

import { Bell, CheckCheck, Trash2, ExternalLink, Info, AlertTriangle, CheckCircle, BookOpen, MessageSquare, Target, ListChecks, Megaphone } from "lucide-react";
import type { Notification, NotificationType } from "@/lib/types/notifications";

interface Props {
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
  onNavigate: (route: string) => void;
  onBack: () => void;
}

function typeIcon(type: NotificationType) {
  switch (type) {
    case "review_assigned":
    case "review_completed":
    case "review_updated":
      return <CheckCircle size={16} />;
    case "assignment_assigned":
    case "assignment_due":
    case "assignment_overdue":
    case "assignment_completed":
      return <ListChecks size={16} />;
    case "goal_review_due":
    case "goal_updated":
      return <Target size={16} />;
    case "playlist_shared":
      return <BookOpen size={16} />;
    case "learning_note_added":
      return <BookOpen size={16} />;
    case "comment_received":
      return <MessageSquare size={16} />;
    case "organisation_announcement":
      return <Megaphone size={16} />;
    default:
      return <Info size={16} />;
  }
}

function typeLabel(type: NotificationType): string {
  switch (type) {
    case "review_assigned":    return "Review";
    case "review_completed":   return "Review";
    case "review_updated":     return "Review";
    case "assignment_assigned":return "Assignment";
    case "assignment_due":     return "Assignment";
    case "assignment_overdue": return "Assignment";
    case "assignment_completed":return "Assignment";
    case "goal_review_due":    return "Goal";
    case "goal_updated":       return "Goal";
    case "playlist_shared":    return "Playlist";
    case "learning_note_added":return "Learning";
    case "comment_received":   return "Comment";
    case "organisation_announcement": return "Announcement";
    default:                   return "System";
  }
}

function priorityAccent(priority: Notification["priority"]) {
  if (priority === "high")   return "#ff453a";
  if (priority === "normal") return "var(--accent)";
  return "var(--muted)";
}

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1)   return "Just now";
  if (diffMin < 60)  return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)   return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7)   return `${diffDay}d ago`;
  return new Date(isoString).toLocaleDateString();
}

function isToday(isoString: string): boolean {
  const d = new Date(isoString);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function isThisWeek(isoString: string): boolean {
  const diffMs = Date.now() - new Date(isoString).getTime();
  return diffMs < 7 * 24 * 60 * 60 * 1000;
}

type Group = { label: string; items: Notification[] };

function groupNotifications(notifications: Notification[]): Group[] {
  const unread = notifications.filter(n => !n.isRead);
  const readToday = notifications.filter(n => n.isRead && isToday(n.createdAt));
  const readThisWeek = notifications.filter(n => n.isRead && !isToday(n.createdAt) && isThisWeek(n.createdAt));
  const earlier = notifications.filter(n => n.isRead && !isThisWeek(n.createdAt));

  const groups: Group[] = [];
  if (unread.length)       groups.push({ label: "Unread", items: unread });
  if (readToday.length)    groups.push({ label: "Today", items: readToday });
  if (readThisWeek.length) groups.push({ label: "This Week", items: readThisWeek });
  if (earlier.length)      groups.push({ label: "Earlier", items: earlier });
  return groups;
}

function NotificationRow({
  notif,
  onMarkRead,
  onDelete,
  onNavigate,
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
      {/* Icon */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "var(--panel2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: priorityAccent(notif.priority),
          marginTop: 1,
        }}
      >
        {typeIcon(notif.type)}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {typeLabel(notif.type)}
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
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{formatRelativeTime(notif.createdAt)}</span>
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

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
        {!notif.isRead && (
          <button
            title="Mark as read"
            style={{ fontSize: 11, padding: "3px 8px" }}
            onClick={() => onMarkRead(notif.id)}
          >
            <CheckCheck size={13} />
          </button>
        )}
        <button
          title="Delete"
          style={{ fontSize: 11, padding: "3px 8px", color: "var(--muted)" }}
          onClick={() => onDelete(notif.id)}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export function NotificationCentre({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onNavigate,
  onBack,
}: Props) {
  const groups = groupNotifications(notifications);

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
            <button onClick={onBack}>← Back</button>
          </div>
        </div>

        {/* Empty state */}
        {notifications.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "var(--muted)" }}>
            <Bell size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ margin: 0 }}>No notifications yet</p>
          </div>
        )}

        {/* Grouped notifications */}
        {groups.map(group => (
          <div key={group.label} style={{ marginBottom: 24 }}>
            <p
              style={{
                margin: "0 0 10px",
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--muted)",
                borderBottom: "1px solid var(--border)",
                paddingBottom: 6,
              }}
            >
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
