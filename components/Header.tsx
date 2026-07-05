import { LogOut, Home, GraduationCap, Building2, Bell, User, LayoutDashboard, Search } from "lucide-react";
import type { RefEvalSession, Screen } from "@/lib/types/auth";

const LEARNING_SCREENS: Screen[] = [
  "learning-hub", "my-learning", "learning-progress", "playlists",
  "playlist-detail", "clip-library", "assignments", "assignment-detail",
  "groups",
];

const DASHBOARD_SCREENS: Screen[] = [
  "database", "team-management",
];

export function Header({
  session,
  onHome,
  onAdmin,
  onLearning,
  onOrganisation,
  onNotifications,
  onSearch,
  onProfile,
  onLogout,
  unreadNotificationCount = 0,
  activeScreen,
}: {
  session: RefEvalSession | null;
  onHome: () => void;
  onAdmin: () => void;
  onLearning?: () => void;
  onOrganisation?: () => void;
  onNotifications?: () => void;
  onSearch?: () => void;
  onProfile: () => void;
  onLogout: () => void;
  unreadNotificationCount?: number;
  activeScreen?: Screen;
}) {
  const isManagement = session?.activeRole === "educator" || session?.activeRole === "admin" || session?.activeRole === "super_admin";
  const isAdmin = session?.activeRole === "admin" || session?.activeRole === "super_admin";

  const isActive = (screens: Screen[]) =>
    activeScreen ? screens.includes(activeScreen) : false;

  const homeScreens: Screen[] = ["educator", "referee", "viewer", "org-selector"];
  const homeActive = isActive(homeScreens);
  const learningActive = isActive(LEARNING_SCREENS);
  const orgActive = isActive(["organisation"]);
  const dashActive = isActive(DASHBOARD_SCREENS);
  const notifActive = isActive(["notifications"]);
  const profileActive = isActive(["user-profile"]);

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
        <div className="header-nav">
          {/* Primary navigation */}
          <div className="header-nav-primary">
            <button
              className={homeActive ? "header-btn header-btn-active" : "header-btn"}
              onClick={onHome}
            >
              <Home size={15} /> Home
            </button>

            {isManagement && onLearning && (
              <button
                className={learningActive ? "header-btn header-btn-active" : "header-btn"}
                onClick={onLearning}
              >
                <GraduationCap size={15} /> Learning
              </button>
            )}

            {isAdmin && onOrganisation && (
              <button
                className={orgActive ? "header-btn header-btn-active" : "header-btn"}
                onClick={onOrganisation}
              >
                <Building2 size={15} /> Organisation
              </button>
            )}

            {isAdmin && (
              <button
                className={dashActive ? "header-btn header-btn-active" : "header-btn"}
                onClick={onAdmin}
              >
                <LayoutDashboard size={15} /> Dashboard
              </button>
            )}
          </div>

          {/* Utility cluster */}
          <div className="header-nav-utility">
            {onSearch && (
              <button
                className="header-btn header-btn-icon"
                onClick={onSearch}
                title="Search"
                aria-label="Open search"
              >
                <Search size={15} />
              </button>
            )}

            {onNotifications && (
              <button
                className={notifActive ? "header-btn header-btn-icon header-btn-active" : "header-btn header-btn-icon"}
                onClick={onNotifications}
                title="Notifications"
                style={{ position: "relative" }}
              >
                <Bell size={15} />
                {unreadNotificationCount > 0 && (
                  <span className="badge-count">
                    {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                  </span>
                )}
              </button>
            )}

            <button
              className={profileActive ? "header-btn header-btn-active" : "header-btn"}
              onClick={onProfile}
              title={`Profile: ${session.profile.name}`}
            >
              <User size={15} /> {session.profile.name}
            </button>

            <button className="header-btn" onClick={onLogout}>
              <LogOut size={15} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
