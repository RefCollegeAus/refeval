import { LogOut, Settings, User, GraduationCap } from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";

export function Header({
  session,
  onHome,
  onAdmin,
  onLearning,
  onProfile,
  onLogout,
}: {
  session: RefEvalSession | null;
  onHome: () => void;
  onAdmin: () => void;
  onLearning?: () => void;
  onProfile: () => void;
  onLogout: () => void;
}) {
  const isManagement = session?.activeRole === "educator" || session?.activeRole === "admin" || session?.activeRole === "super_admin";

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

          {(session.activeRole === "admin" || session.activeRole === "super_admin") && (
            <button onClick={onAdmin}>
              <Settings size={16} /> Admin Dashboard
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
