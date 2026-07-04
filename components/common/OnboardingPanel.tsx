"use client";

import { X, ClipboardList, Users, BookOpen, Target, MessageSquare, Settings, GraduationCap } from "lucide-react";
import type { Role, Screen } from "@/lib/types/auth";

type Step = {
  icon: React.ReactNode;
  title: string;
  desc: string;
  label?: string;
  onClick?: () => void;
};

function getIntro(role: Role): { title: string; subtitle: string } {
  switch (role) {
    case "super_admin":
      return { title: "Welcome to RefCoach", subtitle: "You have full platform access. Here are the key areas to explore." };
    case "admin":
      return { title: "Set Up Your Organisation", subtitle: "Follow these steps to get your organisation up and running." };
    case "educator":
      return { title: "Your Coaching Dashboard", subtitle: "Here are the key tools available to you as an educator." };
    case "referee":
      return { title: "Welcome to RefCoach", subtitle: "Here's what's available in your referee portal." };
    default:
      return { title: "Welcome", subtitle: "You're all set and ready to go." };
  }
}

function getSteps(
  role: Role,
  onNavigate: (screen: Screen) => void,
  onNavigateDevelopment?: () => void,
): Step[] {
  switch (role) {
    case "super_admin":
      return [
        {
          icon: <Users size={15} />, title: "Member Management",
          desc: "Invite and manage all users in your organisation.",
          label: "Manage", onClick: () => onNavigate("database"),
        },
        {
          icon: <Settings size={15} />, title: "Platform Settings",
          desc: "Configure review templates and organisation requirements.",
          label: "Settings", onClick: () => onNavigate("org-settings"),
        },
        {
          icon: <BookOpen size={15} />, title: "Learning & Assignments",
          desc: "Build playlists and assign structured learning to referees.",
          label: "Learning", onClick: () => onNavigate("assignments"),
        },
        {
          icon: <GraduationCap size={15} />, title: "Educator Tools",
          desc: "Use your coaching queue, development goals and comment inbox from your home screen.",
        },
      ];
    case "admin":
      return [
        {
          icon: <Users size={15} />, title: "Invite Members",
          desc: "Add referees, educators and admins to your organisation.",
          label: "Members", onClick: () => onNavigate("database"),
        },
        {
          icon: <Settings size={15} />, title: "Organisation Settings",
          desc: "Configure review templates and organisation requirements.",
          label: "Settings", onClick: () => onNavigate("org-settings"),
        },
        {
          icon: <BookOpen size={15} />, title: "Learning Setup",
          desc: "Create playlists and assign them to your referees.",
          label: "Assignments", onClick: () => onNavigate("assignments"),
        },
        {
          icon: <ClipboardList size={15} />, title: "Coaching Queue",
          desc: "Pending reviews and assignments appear on your home screen once referees are active.",
        },
      ];
    case "educator":
      return [
        {
          icon: <ClipboardList size={15} />, title: "Coaching Queue",
          desc: "Pending reviews, stale drafts and assignments appear here on your home screen.",
        },
        {
          icon: <BookOpen size={15} />, title: "Assign Learning",
          desc: "Build playlists and assign them to your referees for structured development.",
          label: "Assignments", onClick: () => onNavigate("assignments"),
        },
        {
          icon: <Target size={15} />, title: "Development Goals",
          desc: "Set and track performance goals for individual referees from their profile.",
        },
        {
          icon: <MessageSquare size={15} />, title: "Comment Inbox",
          desc: "Review and respond to all referee comments across your reviews.",
          label: "Inbox", onClick: () => onNavigate("comment-inbox"),
        },
      ];
    case "referee":
      return [
        {
          icon: <ClipboardList size={15} />, title: "My Reviews",
          desc: "Completed evaluations from your educator appear on your home screen.",
        },
        {
          icon: <BookOpen size={15} />, title: "My Learning",
          desc: "Access playlists assigned to you and track your progress.",
          label: "Learning", onClick: () => onNavigate("my-learning"),
        },
        {
          icon: <Target size={15} />, title: "Development Goals",
          desc: "View goals set by your educator and track your progress.",
          ...(onNavigateDevelopment ? { label: "Goals", onClick: onNavigateDevelopment } : {}),
        },
        {
          icon: <MessageSquare size={15} />, title: "Comment Inbox",
          desc: "View and reply to feedback from your educator on your clips.",
          label: "Comments", onClick: () => onNavigate("referee-comments"),
        },
      ];
    default:
      return [];
  }
}

interface Props {
  role: Role;
  onDismiss: () => void;
  onNavigate: (screen: Screen) => void;
  onNavigateDevelopment?: () => void;
}

export function OnboardingPanel({ role, onDismiss, onNavigate, onNavigateDevelopment }: Props) {
  const steps = getSteps(role, onNavigate, onNavigateDevelopment);
  const { title, subtitle } = getIntro(role);

  return (
    <div className="panel" style={{ borderTop: "3px solid var(--accent)", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <div>
          <p className="eyebrow" style={{ margin: "0 0 2px" }}>Getting Started</p>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{title}</p>
          <p className="hint" style={{ margin: "4px 0 0", fontSize: 13 }}>{subtitle}</p>
        </div>
        <button
          onClick={onDismiss}
          title="Dismiss"
          style={{
            background: "none", border: "none", boxShadow: "none",
            padding: "2px 4px", color: "var(--muted)", cursor: "pointer",
            flexShrink: 0, marginLeft: 8, lineHeight: 1,
          }}
        >
          <X size={15} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {steps.map((s, i) => (
          <div
            key={i}
            style={{
              background: "var(--panel2)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "12px 14px",
              display: "flex", flexDirection: "column", gap: 6,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--accent)", flexShrink: 0 }}>{s.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{s.title}</span>
            </div>
            <p className="hint" style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>{s.desc}</p>
            {s.label && s.onClick && (
              <button
                onClick={s.onClick}
                style={{ alignSelf: "flex-start", fontSize: 11, padding: "3px 10px", marginTop: 2 }}
              >
                {s.label} →
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onDismiss}
        style={{
          marginTop: 12, fontSize: 12, color: "var(--muted)", background: "none",
          border: "none", boxShadow: "none", cursor: "pointer", padding: 0, fontWeight: 400,
        }}
      >
        Dismiss this guide
      </button>
    </div>
  );
}
