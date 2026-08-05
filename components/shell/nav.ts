import {
  Home, ClipboardList, MessageSquare, BookOpen, Target, BarChart3,
  GraduationCap, Film, ListChecks, TrendingUp, MonitorPlay,
  Users, ShieldCheck, Layers, Building2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Screen, Role } from "@/lib/types/auth";
import type { OrgPage } from "@/components/organisation/OrganisationScreen";

// Central navigation config for the RefEval sidebar — mirrors the shape of
// RefOps's components/shell/nav.ts (NavItem/NavGroup + a pure resolver) so
// visibility rules live in one place instead of scattered across JSX.
// RefEval has no URL routes, so `screen` (plus an optional `orgPage` for
// Organisation children) stands in for RefOps's `href`.

export interface NavContext {
  role: Role | null;
  homeScreen: Screen;
  isManagement: boolean; // educator | admin | super_admin
  isAdmin: boolean; // admin | super_admin
  isReferee: boolean;
  canViewClipLibrary: boolean;
  canAccessPlaylists: boolean;
  canViewAssignments: boolean;
  canViewGroups: boolean;
  unreadComments: number;
}

export interface NavItem {
  label: string;
  icon: LucideIcon;
  screen: Screen;
  orgPage?: OrgPage;
  /** Screens that count as "active" for this item beyond `screen` itself. */
  activeScreens?: Screen[];
  /** Overrides `screen` at click/highlight time — used by Home, whose destination is role-dependent. */
  resolveScreen?: (ctx: NavContext) => Screen;
  isVisible: (ctx: NavContext) => boolean;
  badge?: (ctx: NavContext) => number | undefined;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Home",
        icon: Home,
        screen: "educator",
        resolveScreen: (ctx) => ctx.homeScreen,
        activeScreens: ["educator", "referee", "viewer", "org-selector"],
        isVisible: () => true,
      },
    ],
  },
  {
    label: "Reviews",
    items: [
      {
        label: "Assignments",
        icon: ClipboardList,
        screen: "assignments",
        activeScreens: ["assignments", "assignment-detail"],
        isVisible: (ctx) => ctx.isManagement && ctx.canViewAssignments,
      },
      {
        label: "Comment Inbox",
        icon: MessageSquare,
        screen: "comment-inbox",
        isVisible: (ctx) => ctx.isManagement,
        badge: (ctx) => ctx.unreadComments || undefined,
      },
    ],
  },
  {
    label: "Development",
    items: [
      {
        label: "My Learning",
        icon: BookOpen,
        screen: "my-learning",
        isVisible: (ctx) => ctx.isReferee,
      },
      {
        label: "My Stats Hub",
        icon: BarChart3,
        screen: "referee-stats",
        isVisible: (ctx) => ctx.isReferee,
      },
      {
        label: "My Goals",
        icon: Target,
        screen: "referee-goals",
        isVisible: (ctx) => ctx.isReferee,
      },
      {
        label: "My Comments",
        icon: MessageSquare,
        screen: "referee-comments",
        isVisible: (ctx) => ctx.isReferee,
      },
    ],
  },
  {
    label: "Learning & Content",
    items: [
      {
        label: "Learning Hub",
        icon: GraduationCap,
        screen: "learning-hub",
        isVisible: (ctx) =>
          ctx.isManagement &&
          (ctx.canViewClipLibrary || ctx.canAccessPlaylists || ctx.canViewAssignments || ctx.canViewGroups),
      },
      {
        label: "Clip Library",
        icon: Film,
        screen: "clip-library",
        activeScreens: ["clip-library", "learning-library"],
        isVisible: (ctx) => ctx.isManagement && ctx.canViewClipLibrary,
      },
      {
        label: "Playlists",
        icon: ListChecks,
        screen: "playlists",
        activeScreens: ["playlists", "playlist-detail"],
        isVisible: (ctx) => ctx.isManagement && ctx.canAccessPlaylists,
      },
      {
        label: "Learning Progress",
        icon: TrendingUp,
        screen: "learning-progress",
        isVisible: (ctx) => ctx.isManagement && ctx.canViewAssignments,
      },
      {
        label: "Simulator Builder",
        icon: MonitorPlay,
        screen: "simulator-builder",
        activeScreens: ["simulator-builder", "simulator-runner", "simulator-analytics"],
        isVisible: (ctx) => ctx.isManagement,
      },
    ],
  },
  {
    label: "People",
    items: [
      {
        label: "Members",
        icon: Users,
        screen: "database",
        isVisible: (ctx) => ctx.isAdmin,
      },
      {
        label: "Team Management",
        icon: ShieldCheck,
        screen: "team-management",
        isVisible: (ctx) => ctx.isAdmin,
      },
      {
        label: "Groups",
        icon: Layers,
        screen: "groups",
        isVisible: (ctx) => ctx.isManagement && ctx.canViewGroups,
      },
    ],
  },
  {
    label: "Organisation",
    items: [
      {
        // Flat link, like every other item — the settings sub-pages
        // (Profile, Branding, Roles, Billing, ...) live behind a tab bar on
        // the Organisation screen itself (see OrganisationScreen.tsx),
        // not a sidebar submenu. orgPage always resets to "dashboard" so
        // this link, like every other, lands on the same destination
        // every time.
        label: "Organisation",
        icon: Building2,
        screen: "organisation",
        orgPage: "dashboard",
        isVisible: (ctx) => ctx.isAdmin,
      },
    ],
  },
];

/** Pure — takes the current nav context and returns only the groups/items the user may see. */
export function resolveVisibleNavGroups(ctx: NavContext): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => item.isVisible(ctx)),
  })).filter((group) => group.items.length > 0);
}
