import { LogOut, Settings, User } from "lucide-react";
import type { RefEvalSession } from "@/lib/types/auth";

export function Header({
  session,
  onHome,
  onAdmin,
  onProfile,
  onLogout,
}: {
  session: RefEvalSession | null;
  onHome: () => void;
  onAdmin: () => void;
  onProfile: () => void;
  onLogout: () => void;
}) {
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
