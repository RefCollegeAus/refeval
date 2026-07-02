import type { Role } from "@/lib/types/auth";

// ── Permission keys ───────────────────────────────────────────────────────────
// Dot-notation strings. Add new permissions here without any DB schema change.

export const PERMISSIONS = {
  // Reviews
  REVIEWS_VIEW:     "reviews.view",
  REVIEWS_CREATE:   "reviews.create",
  REVIEWS_EDIT:     "reviews.edit",
  REVIEWS_ASSIGN:   "reviews.assign",
  REVIEWS_COMPLETE: "reviews.complete",

  // Learning
  LEARNING_CLIP_LIBRARY:      "learning.clip_library",
  LEARNING_CREATE_PLAYLISTS:  "learning.create_playlists",
  LEARNING_EDIT_PLAYLISTS:    "learning.edit_playlists",
  LEARNING_DELETE_PLAYLISTS:  "learning.delete_playlists",

  // Assignments (Phase 3)
  ASSIGNMENTS_VIEW:   "assignments.view",
  ASSIGNMENTS_CREATE: "assignments.create",
  ASSIGNMENTS_EDIT:   "assignments.edit",
  ASSIGNMENTS_DELETE: "assignments.delete",

  // Learning Modules (future)
  MODULES_CREATE:  "modules.create",
  MODULES_PUBLISH: "modules.publish",
  MODULES_ASSIGN:  "modules.assign",
  MODULES_TRACK:   "modules.track_completion",

  // Analytics
  ANALYTICS_VIEW:   "analytics.view",
  ANALYTICS_EXPORT: "analytics.export",

  // Users
  USERS_INVITE:             "users.invite",
  USERS_EDIT:               "users.edit",
  USERS_RESET_PASSWORDS:    "users.reset_passwords",
  USERS_MANAGE_PERMISSIONS: "users.manage_permissions",

  // Groups
  GROUPS_VIEW:   "groups.view",
  GROUPS_CREATE: "groups.create",
  GROUPS_EDIT:   "groups.edit",
  GROUPS_DELETE: "groups.delete",

  // Organisation
  ORG_MANAGE:       "org.manage",
  ORG_COMPETITIONS: "org.competitions",
  ORG_SETTINGS:     "org.settings",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ── UI groupings ──────────────────────────────────────────────────────────────

export type PermissionGroup = {
  label: string;
  permissions: Array<{ key: PermissionKey; label: string }>;
};

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: "Reviews",
    permissions: [
      { key: PERMISSIONS.REVIEWS_VIEW,     label: "View Reviews" },
      { key: PERMISSIONS.REVIEWS_CREATE,   label: "Create Reviews" },
      { key: PERMISSIONS.REVIEWS_EDIT,     label: "Edit Reviews" },
      { key: PERMISSIONS.REVIEWS_ASSIGN,   label: "Assign Reviews" },
      { key: PERMISSIONS.REVIEWS_COMPLETE, label: "Complete Reviews" },
    ],
  },
  {
    label: "Learning",
    permissions: [
      { key: PERMISSIONS.LEARNING_CLIP_LIBRARY,     label: "View Clip Library" },
      { key: PERMISSIONS.LEARNING_CREATE_PLAYLISTS, label: "Create Playlists" },
      { key: PERMISSIONS.LEARNING_EDIT_PLAYLISTS,   label: "Edit Playlists" },
      { key: PERMISSIONS.LEARNING_DELETE_PLAYLISTS, label: "Delete Playlists" },
    ],
  },
  {
    label: "Assignments",
    permissions: [
      { key: PERMISSIONS.ASSIGNMENTS_VIEW,   label: "View Assignments" },
      { key: PERMISSIONS.ASSIGNMENTS_CREATE, label: "Create Assignments" },
      { key: PERMISSIONS.ASSIGNMENTS_EDIT,   label: "Edit Assignments" },
      { key: PERMISSIONS.ASSIGNMENTS_DELETE, label: "Delete Assignments" },
    ],
  },
  {
    label: "Learning Modules",
    permissions: [
      { key: PERMISSIONS.MODULES_CREATE,  label: "Create Modules" },
      { key: PERMISSIONS.MODULES_PUBLISH, label: "Publish Modules" },
      { key: PERMISSIONS.MODULES_ASSIGN,  label: "Assign Modules" },
      { key: PERMISSIONS.MODULES_TRACK,   label: "Track Completion" },
    ],
  },
  {
    label: "Analytics",
    permissions: [
      { key: PERMISSIONS.ANALYTICS_VIEW,   label: "View Analytics" },
      { key: PERMISSIONS.ANALYTICS_EXPORT, label: "Export Analytics" },
    ],
  },
  {
    label: "Users",
    permissions: [
      { key: PERMISSIONS.USERS_INVITE,             label: "Invite Users" },
      { key: PERMISSIONS.USERS_EDIT,               label: "Edit Users" },
      { key: PERMISSIONS.USERS_RESET_PASSWORDS,    label: "Reset Passwords" },
      { key: PERMISSIONS.USERS_MANAGE_PERMISSIONS, label: "Manage Permissions" },
    ],
  },
  {
    label: "Groups",
    permissions: [
      { key: PERMISSIONS.GROUPS_VIEW,   label: "View Groups" },
      { key: PERMISSIONS.GROUPS_CREATE, label: "Create Groups" },
      { key: PERMISSIONS.GROUPS_EDIT,   label: "Edit Groups" },
      { key: PERMISSIONS.GROUPS_DELETE, label: "Delete Groups" },
    ],
  },
  {
    label: "Organisation",
    permissions: [
      { key: PERMISSIONS.ORG_MANAGE,       label: "Manage Organisation" },
      { key: PERMISSIONS.ORG_COMPETITIONS, label: "Manage Competitions" },
      { key: PERMISSIONS.ORG_SETTINGS,     label: "Manage Settings" },
    ],
  },
];

// ── Role default permissions ──────────────────────────────────────────────────
// These apply when a user has no custom permissions stored in the DB.

const ALL_PERMISSIONS = Object.values(PERMISSIONS) as PermissionKey[];

export const ROLE_DEFAULT_PERMISSIONS: Record<Role, PermissionKey[]> = {
  super_admin: ALL_PERMISSIONS,

  admin: ALL_PERMISSIONS,

  educator: [
    PERMISSIONS.REVIEWS_VIEW,
    PERMISSIONS.REVIEWS_CREATE,
    PERMISSIONS.REVIEWS_EDIT,
    PERMISSIONS.REVIEWS_ASSIGN,
    PERMISSIONS.REVIEWS_COMPLETE,
    PERMISSIONS.LEARNING_CLIP_LIBRARY,
    PERMISSIONS.LEARNING_CREATE_PLAYLISTS,
    PERMISSIONS.LEARNING_EDIT_PLAYLISTS,
    PERMISSIONS.LEARNING_DELETE_PLAYLISTS,
    PERMISSIONS.ASSIGNMENTS_VIEW,
    PERMISSIONS.ASSIGNMENTS_CREATE,
    PERMISSIONS.ASSIGNMENTS_EDIT,
    PERMISSIONS.ASSIGNMENTS_DELETE,
    PERMISSIONS.GROUPS_VIEW,
    PERMISSIONS.GROUPS_CREATE,
    PERMISSIONS.GROUPS_EDIT,
    PERMISSIONS.GROUPS_DELETE,
    PERMISSIONS.ANALYTICS_VIEW,
  ],

  referee: [
    PERMISSIONS.REVIEWS_VIEW,
  ],

  viewer: [],
};
