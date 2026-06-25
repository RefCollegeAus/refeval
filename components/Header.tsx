import { LogOut, Settings } from "lucide-react";

type Role = "super_admin" | "admin" | "educator" | "referee";

type UserRecord = {
  id: string;
  role: Role;
  name: string;
  password: string;
  organisationId: string;
};

export function Header({
  currentUser,
  onHome,
  onAdmin,
  onLogout,
}: {
  currentUser: UserRecord | null;
  onHome: () => void;
  onAdmin: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="header">
      <div className="brand">
        <img src="/rca-logo.png" alt="Referee College of Australia logo" className="brand-logo" />
        <div>
          <p className="eyebrow">Referee College of Australia</p>
          <h1>Referee Coder v5</h1>
        </div>
      </div>

      {currentUser && (
        <div className="export-row">
          <button onClick={onHome}>Home</button>

          {(currentUser.role === "admin" || currentUser.role === "super_admin") && (
            <button onClick={onAdmin}>
              <Settings size={16} /> Admin Dashboard
            </button>
          )}

          <button onClick={onLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      )}
    </header>
  );
}