import { LogOut, Settings, User, GraduationCap, Building2, Bell } from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";

export function Header({
  session,
  onHome,
  onAdmin,
  onLearning,
  onOrganisation,
  onNotifications,
  onProfile,
  onLogout,
  unreadNotificationCount = 0,
}: {
  session: RefEvalSession | null;
  onHome: () => void;
  onAdmin: () => void;
  onLearning?: () => void;
  onOrganisation?: () => void;
  onNotifications?: () => void;
  onProfile: () => void;
  onLogout: () => void;
  unreadNotificationCount?: number;
}) {
  const isManagement = session?.activeRole === "educator" || session?.activeRole === "admin" || session?.activeRole === "super_admin";
  const isAdmin = session?.activeRole === "admin" || session?.activeRole === "super_admin";

  return (
    <header className="header">
      <div className="brand">
        <img src="/rca-logo.png" alt="Referee College of Australia logo" className="brand-logo" />
        <div>
          <p className="eyebrow">Referee College of Australia</p>
          <h1>RefCoach</h1>
        </div>
      </div>

      {session && (
        <div className="export-row">
          <button onClick={onHome}>Home</button>

          {isManagement && onLearning && (
            <button onClick={onLearning}>
              <GraduationCap size={16} /> Learning
            </button>
          )}

          {isAdmin && onOrganisation && (
            <button onClick={onOrganisation}>
              <Building2 size={16} /> Organisation
            </button>
          )}

          {isAdmin && (
            <button onClick={onAdmin}>
              <Settings size={16} /> Admin Dashboard
            </button>
          )}

          {onNotifications && (
            <button onClick={onNotifications} title="Notifications" className="badge-wrap" style={{ position: "relative" }}>
              <Bell size={16} />
              {unreadNotificationCount > 0 && (
                <span className="badge-count">{unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}</span>
              )}
            </button>
          )}

          <button onClick={onProfile} title={`Profile: ${session.profile.name}`}>
            <User size={16} /> {session.profile.name}
          </button>

          <button onClick={onLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      )}
    </header>
  );
}
